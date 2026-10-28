-- Run after 001-004. Comments inherit the book's current access rules.
begin;

create table if not exists public.library_page_comments (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.library_books(id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  page_number integer not null check (page_number between 1 and 100000),
  body text not null check (length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists library_comments_book_page on public.library_page_comments(book_id, page_number, created_at, id);
alter table public.library_page_comments enable row level security;
revoke all on public.library_page_comments from public, anon, authenticated;
grant select, delete on public.library_page_comments to authenticated;
grant insert(book_id, page_number, body), update(body) on public.library_page_comments to authenticated;

create or replace function public.library_prepare_comment() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.body := btrim(new.body);
  if tg_op = 'UPDATE' then new.updated_at := clock_timestamp(); end if;
  return new;
end;
$$;
revoke all on function public.library_prepare_comment() from public, anon, authenticated;
drop trigger if exists library_prepare_comment on public.library_page_comments;
create trigger library_prepare_comment before insert or update on public.library_page_comments
  for each row execute function public.library_prepare_comment();

drop policy if exists library_comments_read on public.library_page_comments;
create policy library_comments_read on public.library_page_comments for select to authenticated
  using (public.library_can_read_book(book_id));
drop policy if exists library_comments_read_guard on public.library_page_comments;
create policy library_comments_read_guard on public.library_page_comments as restrictive for select to public
  using (public.library_can_read_book(book_id));
drop policy if exists library_comments_insert on public.library_page_comments;
create policy library_comments_insert on public.library_page_comments for insert to authenticated
  with check (author_id = (select auth.uid()) and public.library_can_read_book(book_id));
drop policy if exists library_comments_insert_guard on public.library_page_comments;
create policy library_comments_insert_guard on public.library_page_comments as restrictive for insert to public
  with check (author_id = (select auth.uid()) and public.library_can_read_book(book_id));
drop policy if exists library_comments_update on public.library_page_comments;
create policy library_comments_update on public.library_page_comments for update to authenticated
  using (author_id = (select auth.uid()) and public.library_can_read_book(book_id))
  with check (author_id = (select auth.uid()) and public.library_can_read_book(book_id));
drop policy if exists library_comments_update_guard on public.library_page_comments;
create policy library_comments_update_guard on public.library_page_comments as restrictive for update to public
  using (author_id = (select auth.uid()) and public.library_can_read_book(book_id))
  with check (author_id = (select auth.uid()) and public.library_can_read_book(book_id));
drop policy if exists library_comments_delete on public.library_page_comments;
create policy library_comments_delete on public.library_page_comments for delete to authenticated
  using (author_id = (select auth.uid()) and public.library_can_read_book(book_id));
drop policy if exists library_comments_delete_guard on public.library_page_comments;
create policy library_comments_delete_guard on public.library_page_comments as restrictive for delete to public
  using (author_id = (select auth.uid()) and public.library_can_read_book(book_id));

-- Exposes display names only for authors on a book/page the caller can read.
-- Never exposes auth.users or emails as a public directory.
create or replace function public.library_list_page_comments(target_book uuid, target_page integer, comment_offset integer default 0)
returns table (id uuid, author_id uuid, page_number integer, body text, created_at timestamptz, updated_at timestamptz, display_name text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.library_can_read_book(target_book) then
    raise exception 'Book unavailable' using errcode = '42501';
  end if;
  if target_page is null or target_page not between 1 and 100000 or comment_offset is null or comment_offset not between 0 and 1000000 then
    raise exception 'Invalid page or offset' using errcode = '22023';
  end if;
  return query select c.id, c.author_id, c.page_number, c.body, c.created_at, c.updated_at,
    coalesce(nullif(left(u.raw_user_meta_data->>'full_name', 100), ''), 'Leitor')
    from public.library_page_comments c join auth.users u on u.id = c.author_id
    where c.book_id = target_book and c.page_number = target_page
    order by c.created_at desc, c.id desc limit 51 offset comment_offset;
end;
$$;
revoke all on function public.library_list_page_comments(uuid, integer, integer) from public, anon;
grant execute on function public.library_list_page_comments(uuid, integer, integer) to authenticated;
notify pgrst, 'reload schema';
commit;
