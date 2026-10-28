-- Run after 001-007. Reactions inherit the comment's current book access.
begin;
create table if not exists public.library_comment_reactions (
  comment_id uuid not null references public.library_page_comments(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  reaction integer not null check (reaction in (-1, 1)),
  primary key (comment_id, user_id)
);
alter table public.library_comment_reactions enable row level security;
revoke all on public.library_comment_reactions from public, anon, authenticated;
grant select on public.library_comment_reactions to authenticated;
drop policy if exists library_reactions_read_own on public.library_comment_reactions;
create policy library_reactions_read_own on public.library_comment_reactions for select to authenticated
  using (user_id = (select auth.uid()) and exists (
    select 1 from public.library_page_comments c where c.id = comment_id and public.library_can_read_book(c.book_id)
  ));
drop policy if exists library_reactions_read_guard on public.library_comment_reactions;
create policy library_reactions_read_guard on public.library_comment_reactions as restrictive for select to public
  using (user_id = (select auth.uid()) and exists (
    select 1 from public.library_page_comments c where c.id = comment_id and public.library_can_read_book(c.book_id)
  ));

-- Return totals and the caller's choice, without exposing other voters' identities.
create or replace function public.library_comment_reaction_totals(target_comments uuid[])
returns table(comment_id uuid, likes bigint, dislikes bigint, my_reaction integer)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if target_comments is null or cardinality(target_comments) not between 1 and 50 then
    raise exception 'Invalid comment batch' using errcode = '22023';
  end if;
  if exists (
    select 1 from unnest(target_comments) target(id) where not exists (
      select 1 from public.library_page_comments c
      where c.id = target.id and public.library_can_read_book(c.book_id)
    )
  ) then raise exception 'Comment unavailable' using errcode = '42501'; end if;
  return query select c.id,
    count(r.user_id) filter (where r.reaction = 1),
    count(r.user_id) filter (where r.reaction = -1),
    coalesce(max(r.reaction) filter (where r.user_id = (select auth.uid())), 0)
    from public.library_page_comments c
    left join public.library_comment_reactions r on r.comment_id = c.id
    where c.id = any(target_comments) group by c.id;
end;
$$;
revoke all on function public.library_comment_reaction_totals(uuid[]) from public, anon;
grant execute on function public.library_comment_reaction_totals(uuid[]) to authenticated;

-- Set rather than toggle: retries cannot accidentally undo a vote.
create or replace function public.library_set_comment_reaction(target_comment uuid, target_reaction integer)
returns table(comment_id uuid, likes bigint, dislikes bigint, my_reaction integer)
language plpgsql security definer set search_path = '' as $$
declare target_book uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if target_reaction is null or target_reaction not in (-1, 0, 1) then
    raise exception 'Invalid reaction' using errcode = '22023';
  end if;
  select c.book_id into target_book from public.library_page_comments c where c.id = target_comment for key share;
  if target_book is null or not public.library_can_read_book(target_book) then
    raise exception 'Comment unavailable' using errcode = '42501';
  end if;
  if target_reaction = 0 then
    delete from public.library_comment_reactions r where r.comment_id = target_comment and r.user_id = (select auth.uid());
  else
    insert into public.library_comment_reactions as r(comment_id, user_id, reaction)
      values (target_comment, (select auth.uid()), target_reaction)
      on conflict on constraint library_comment_reactions_pkey do update set reaction = excluded.reaction;
  end if;
  return query select * from public.library_comment_reaction_totals(array[target_comment]);
end;
$$;
revoke all on function public.library_set_comment_reaction(uuid, integer) from public, anon;
grant execute on function public.library_set_comment_reaction(uuid, integer) to authenticated;
notify pgrst, 'reload schema';
commit;
