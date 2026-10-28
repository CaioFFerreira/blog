-- Run after 001-006. Only new comments notify the book's owner.
begin;
create table if not exists public.library_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.library_books(id) on delete cascade,
  comment_id uuid not null unique references public.library_page_comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists library_notifications_recipient_created on public.library_notifications(recipient_id, created_at desc, id);
create index if not exists library_notifications_unread on public.library_notifications(recipient_id) where read_at is null;
alter table public.library_notifications enable row level security;
revoke all on public.library_notifications from public, anon, authenticated;
grant select on public.library_notifications to authenticated;
grant update(read_at) on public.library_notifications to authenticated;
drop policy if exists library_notifications_read on public.library_notifications;
create policy library_notifications_read on public.library_notifications for select to authenticated
  using (recipient_id = (select auth.uid()));
drop policy if exists library_notifications_read_guard on public.library_notifications;
create policy library_notifications_read_guard on public.library_notifications as restrictive for select to public
  using (recipient_id = (select auth.uid()));
drop policy if exists library_notifications_update on public.library_notifications;
create policy library_notifications_update on public.library_notifications for update to authenticated
  using (recipient_id = (select auth.uid())) with check (recipient_id = (select auth.uid()));
drop policy if exists library_notifications_update_guard on public.library_notifications;
create policy library_notifications_update_guard on public.library_notifications as restrictive for update to public
  using (recipient_id = (select auth.uid())) with check (recipient_id = (select auth.uid()));

create or replace function public.library_notify_book_owner() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.library_notifications(recipient_id, book_id, comment_id)
    select b.owner_id, b.id, new.id from public.library_books b
    where b.id = new.book_id and b.owner_id <> new.author_id
    on conflict (comment_id) do nothing;
  return new;
end;
$$;
revoke all on function public.library_notify_book_owner() from public, anon, authenticated;
drop trigger if exists library_notify_book_owner on public.library_page_comments;
create trigger library_notify_book_owner after insert on public.library_page_comments
  for each row execute function public.library_notify_book_owner();

create or replace function public.library_list_notifications(notification_offset integer default 0)
returns table (id uuid, book_id uuid, comment_id uuid, page_number integer, book_title text, display_name text, created_at timestamptz, read_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if notification_offset is null or notification_offset not between 0 and 1000000 then
    raise exception 'Invalid offset' using errcode = '22023';
  end if;
  return query select n.id, n.book_id, n.comment_id, c.page_number, b.title,
    coalesce(nullif(left(u.raw_user_meta_data->>'full_name', 100), ''), 'Leitor'), n.created_at, n.read_at
    from public.library_notifications n
    join public.library_books b on b.id = n.book_id
    join public.library_page_comments c on c.id = n.comment_id
    join auth.users u on u.id = c.author_id
    where n.recipient_id = (select auth.uid()) and b.owner_id = (select auth.uid())
    order by n.created_at desc, n.id desc limit 51 offset notification_offset;
end;
$$;
revoke all on function public.library_list_notifications(integer) from public, anon;
grant execute on function public.library_list_notifications(integer) to authenticated;

create or replace function public.library_mark_notifications_read(target_notification uuid default null)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  update public.library_notifications set read_at = now()
    where recipient_id = (select auth.uid()) and read_at is null
    and (target_notification is null or id = target_notification);
end;
$$;
revoke all on function public.library_mark_notifications_read(uuid) from public, anon;
grant execute on function public.library_mark_notifications_read(uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
