-- Run after migrations 001, 002 and 003. Existing books keep their current
-- friends-only sharing; new books default to private. No files/progress are deleted.
begin;

alter table public.library_books add column if not exists visibility text not null default 'friends'
  check (visibility in ('private', 'friends'));
alter table public.library_books alter column visibility set default 'private';
grant select(visibility), insert(visibility), update(visibility) on public.library_books to authenticated;

drop policy if exists library_books_read_own on public.library_books;
create policy library_books_read_own on public.library_books for select to authenticated
  using (owner_id = (select auth.uid()) or (visibility = 'friends' and public.library_are_friends(owner_id)));
drop policy if exists library_books_owner_guard on public.library_books;
create policy library_books_owner_guard on public.library_books as restrictive for select to public
  using (owner_id = (select auth.uid()) or (visibility = 'friends' and public.library_are_friends(owner_id)));

drop policy if exists library_books_update_own on public.library_books;
create policy library_books_update_own on public.library_books for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists library_books_update_guard on public.library_books;
create policy library_books_update_guard on public.library_books as restrictive for update to public
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

-- Both authenticated Storage reads and personal progress policies use these
-- helpers. Hiding a book must also revoke new PDF reads and progress writes.
create or replace function public.library_can_read_book(target_book uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.library_books b where b.id = target_book
      and (b.owner_id = auth.uid() or (b.visibility = 'friends' and public.library_are_friends(b.owner_id)))
  );
$$;
create or replace function public.library_can_read_pdf(target_path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.library_books b where b.pdf_path = target_path
      and (b.owner_id = auth.uid() or (b.visibility = 'friends' and public.library_are_friends(b.owner_id)))
  );
$$;
revoke all on function public.library_can_read_book(uuid), public.library_can_read_pdf(text) from public, anon;
grant execute on function public.library_can_read_book(uuid), public.library_can_read_pdf(text) to authenticated;
notify pgrst, 'reload schema';
commit;
