-- Run once in Supabase > SQL Editor. Safe to rerun for this app's objects.
begin;

create table if not exists public.library_books (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 200),
  author text not null default '' check (length(author) <= 200),
  pdf_path text not null unique,
  status text not null default 'want_read' check (status in ('want_read', 'reading', 'read')),
  last_page integer not null default 1 check (last_page between 1 and 100000),
  created_at timestamptz not null default now(),
  constraint library_books_owner_path check (split_part(pdf_path, '/', 1) = owner_id::text)
);
create index if not exists library_books_owner_created on public.library_books(owner_id, created_at desc);
alter table public.library_books enable row level security;
revoke all on public.library_books from anon, authenticated;
grant select, insert on public.library_books to authenticated;
grant update (status, last_page) on public.library_books to authenticated;

drop policy if exists library_books_read_own on public.library_books;
create policy library_books_read_own on public.library_books for select to authenticated
  using (owner_id = (select auth.uid()));
drop policy if exists library_books_insert_own on public.library_books;
create policy library_books_insert_own on public.library_books for insert to authenticated
  with check (owner_id = (select auth.uid()));
drop policy if exists library_books_update_own on public.library_books;
create policy library_books_update_own on public.library_books for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
-- Restrictive protection also applies if unrelated permissive policies are added later.
drop policy if exists library_books_owner_guard on public.library_books;
create policy library_books_owner_guard on public.library_books as restrictive for all to public
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('library-pdfs', 'library-pdfs', false, 52428800, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 52428800,
  allowed_mime_types = array['application/pdf'];

drop policy if exists library_pdfs_read_own on storage.objects;
create policy library_pdfs_read_own on storage.objects for select to authenticated
  using (bucket_id = 'library-pdfs' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists library_pdfs_upload_own on storage.objects;
create policy library_pdfs_upload_own on storage.objects for insert to authenticated
  with check (bucket_id = 'library-pdfs' and (storage.foldername(name))[1] = (select auth.uid())::text);
-- Used only to clean up an upload when its book metadata could not be saved.
drop policy if exists library_pdfs_remove_own on storage.objects;
create policy library_pdfs_remove_own on storage.objects for delete to authenticated
  using (bucket_id = 'library-pdfs' and (storage.foldername(name))[1] = (select auth.uid())::text);
-- Prevent broad policies for other buckets from granting access to this one.
drop policy if exists library_pdfs_private_guard on storage.objects;
create policy library_pdfs_private_guard on storage.objects as restrictive for all to public
  using (bucket_id <> 'library-pdfs' or (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id <> 'library-pdfs' or (storage.foldername(name))[1] = (select auth.uid())::text);

commit;
