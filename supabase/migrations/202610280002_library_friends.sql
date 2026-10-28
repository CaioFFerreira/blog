-- Run AFTER 202610280001_private_library.sql. This migration preserves existing progress.
-- Do not rerun migration 001 after this one: it contains the old owner-only policies.
begin;

create table if not exists public.library_friend_codes (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  code uuid not null unique default gen_random_uuid()
);
create table if not exists public.library_friendships (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  check (sender_id <> receiver_id)
);
create unique index if not exists library_friendships_pair on public.library_friendships
  (least(sender_id, receiver_id), greatest(sender_id, receiver_id));
create index if not exists library_friendships_receiver on public.library_friendships(receiver_id);
create index if not exists library_friendships_sender on public.library_friendships(sender_id);
alter table public.library_friend_codes enable row level security;
alter table public.library_friendships enable row level security;
-- Mutations are available only through the guarded RPCs below. No user directory is exposed.
revoke all on public.library_friend_codes, public.library_friendships from public, anon, authenticated;

create or replace function public.library_are_friends(other_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.library_friendships f where f.status = 'accepted'
    and ((f.sender_id = auth.uid() and f.receiver_id = other_user)
      or (f.receiver_id = auth.uid() and f.sender_id = other_user))
  );
$$;

create or replace function public.library_my_friend_code() returns uuid
language plpgsql security definer set search_path = '' as $$
declare result uuid; caller uuid := auth.uid();
begin
  if caller is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  insert into public.library_friend_codes(owner_id) values(caller) on conflict(owner_id) do nothing;
  select code into result from public.library_friend_codes where owner_id = caller;
  return result;
end;
$$;

create or replace function public.library_request_friendship(friend_code uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare target uuid; caller uuid := auth.uid();
begin
  if caller is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select owner_id into target from public.library_friend_codes where code = friend_code;
  if target is null or target = caller then raise exception 'Invalid friend code' using errcode = '22023'; end if;
  -- The reverse invitation never automatically accepts an existing request.
  insert into public.library_friendships(sender_id, receiver_id) values(caller, target)
    on conflict do nothing;
end;
$$;

create or replace function public.library_accept_friendship(friendship_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  update public.library_friendships set status = 'accepted'
    where id = friendship_id and receiver_id = auth.uid() and status = 'pending';
  if not found then raise exception 'Invitation unavailable' using errcode = '42501'; end if;
end;
$$;

create or replace function public.library_remove_friendship(friendship_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  delete from public.library_friendships where id = friendship_id
    and auth.uid() in (sender_id, receiver_id);
  if not found then raise exception 'Friendship unavailable' using errcode = '42501'; end if;
end;
$$;

create or replace function public.library_list_friends()
returns table (friendship_id uuid, other_id uuid, display_name text, status text, direction text)
language sql stable security definer set search_path = '' as $$
  select f.id, u.id,
    coalesce(nullif(left(u.raw_user_meta_data->>'full_name', 100), ''), 'Leitor'),
    f.status, case when f.sender_id = auth.uid() then 'sent' else 'received' end
  from public.library_friendships f
  join auth.users u on u.id = case when f.sender_id = auth.uid() then f.receiver_id else f.sender_id end
  where auth.uid() is not null and auth.uid() in (f.sender_id, f.receiver_id)
  order by f.created_at desc;
$$;

create or replace function public.library_can_read_book(target_book uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.library_books b where b.id = target_book
      and (b.owner_id = auth.uid() or public.library_are_friends(b.owner_id))
  );
$$;
create or replace function public.library_can_read_pdf(target_path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.library_books b where b.pdf_path = target_path
      and (b.owner_id = auth.uid() or public.library_are_friends(b.owner_id))
  );
$$;

create table if not exists public.library_reading_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.library_books(id) on delete cascade,
  status text not null default 'want_read' check (status in ('want_read', 'reading', 'read')),
  last_page integer not null default 1 check(last_page between 1 and 100000),
  primary key (user_id, book_id)
);
create index if not exists library_progress_book on public.library_reading_progress(book_id);
-- Import each owner's existing progress once. Never overwrite newer progress on rerun.
insert into public.library_reading_progress(user_id, book_id, status, last_page)
  select owner_id, id, status, last_page from public.library_books on conflict do nothing;
alter table public.library_reading_progress enable row level security;
revoke all on public.library_reading_progress from public, anon, authenticated;
grant select, insert on public.library_reading_progress to authenticated;
grant update on public.library_reading_progress to authenticated;
drop policy if exists library_progress_own on public.library_reading_progress;
create policy library_progress_own on public.library_reading_progress for all to authenticated
  using (user_id = (select auth.uid()) and public.library_can_read_book(book_id))
  with check (user_id = (select auth.uid()) and public.library_can_read_book(book_id));
drop policy if exists library_progress_guard on public.library_reading_progress;
create policy library_progress_guard on public.library_reading_progress as restrictive for all to public
  using (user_id = (select auth.uid()) and public.library_can_read_book(book_id))
  with check (user_id = (select auth.uid()) and public.library_can_read_book(book_id));

-- Legacy progress columns remain for migration compatibility but are never exposed to readers.
revoke all on public.library_books from public, anon, authenticated;
revoke update(status, last_page) on public.library_books from authenticated;
grant select(id, owner_id, title, author, pdf_path, created_at),
  insert(owner_id, title, author, pdf_path) on public.library_books to authenticated;
drop policy if exists library_books_read_own on public.library_books;
create policy library_books_read_own on public.library_books for select to authenticated
  using (public.library_can_read_book(id));
drop policy if exists library_books_owner_guard on public.library_books;
create policy library_books_owner_guard on public.library_books as restrictive for select to public
  using (public.library_can_read_book(id));
drop policy if exists library_books_insert_guard on public.library_books;
create policy library_books_insert_guard on public.library_books as restrictive for insert to public
  with check (owner_id = (select auth.uid()));
-- No metadata updates or deletes are granted to friends.

-- Keep Storage private while permitting authenticated downloads of registered friends' books.
drop policy if exists library_pdfs_read_own on storage.objects;
create policy library_pdfs_read_own on storage.objects for select to authenticated
  using (bucket_id = 'library-pdfs' and (
    (storage.foldername(name))[1] = (select auth.uid())::text or public.library_can_read_pdf(name)));
drop policy if exists library_pdfs_private_guard on storage.objects;
create policy library_pdfs_private_guard on storage.objects as restrictive for select to public
  using (bucket_id <> 'library-pdfs' or (storage.foldername(name))[1] = (select auth.uid())::text
    or public.library_can_read_pdf(name));
drop policy if exists library_pdfs_insert_guard on storage.objects;
create policy library_pdfs_insert_guard on storage.objects as restrictive for insert to public
  with check (bucket_id <> 'library-pdfs' or (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists library_pdfs_delete_guard on storage.objects;
create policy library_pdfs_delete_guard on storage.objects as restrictive for delete to public
  using (bucket_id <> 'library-pdfs' or (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists library_pdfs_update_guard on storage.objects;
create policy library_pdfs_update_guard on storage.objects as restrictive for update to public
  using (bucket_id <> 'library-pdfs' or (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id <> 'library-pdfs' or (storage.foldername(name))[1] = (select auth.uid())::text);

-- SECURITY DEFINER functions have a fixed empty search_path, explicit caller checks,
-- no dynamic SQL and no access to other users' emails or reading progress.
revoke all on function public.library_are_friends(uuid), public.library_my_friend_code(),
  public.library_request_friendship(uuid), public.library_accept_friendship(uuid),
  public.library_remove_friendship(uuid), public.library_list_friends(),
  public.library_can_read_book(uuid), public.library_can_read_pdf(text) from public, anon;
grant execute on function public.library_are_friends(uuid), public.library_my_friend_code(),
  public.library_request_friendship(uuid), public.library_accept_friendship(uuid),
  public.library_remove_friendship(uuid), public.library_list_friends(),
  public.library_can_read_book(uuid), public.library_can_read_pdf(text) to authenticated;

notify pgrst, 'reload schema';
commit;
