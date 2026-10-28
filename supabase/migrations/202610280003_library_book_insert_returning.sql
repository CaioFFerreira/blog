-- Run after migrations 001 and 002. Preserves all books, friendships and progress.
-- INSERT ... RETURNING must check the new row directly: a STABLE lookup of
-- library_books cannot see that row yet in the same statement's snapshot.
begin;

drop policy if exists library_books_read_own on public.library_books;
create policy library_books_read_own on public.library_books
  for select to authenticated
  using (owner_id = (select auth.uid()) or public.library_are_friends(owner_id));

drop policy if exists library_books_owner_guard on public.library_books;
create policy library_books_owner_guard on public.library_books
  as restrictive for select to public
  using (owner_id = (select auth.uid()) or public.library_are_friends(owner_id));

-- Insertion remains owner-only. Do not weaken the insert policies or expose
-- the legacy progress columns; the existing grants and Storage rules are unchanged.
notify pgrst, 'reload schema';
commit;
