begin;

grant delete on public.library_books to authenticated;
drop policy if exists library_books_delete_own on public.library_books;
create policy library_books_delete_own on public.library_books for delete to authenticated
  using (owner_id = (select auth.uid()));
drop policy if exists library_books_delete_guard on public.library_books;
create policy library_books_delete_guard on public.library_books as restrictive for delete to public
  using (owner_id = (select auth.uid()));

-- Check ownership and migration availability before removing the stored file.
create or replace function public.library_book_deletion_path(target_book uuid)
returns text language sql stable security invoker set search_path = '' as $$
  select pdf_path from public.library_books
  where id = target_book and owner_id = (select auth.uid());
$$;
revoke all on function public.library_book_deletion_path(uuid) from public, anon;
grant execute on function public.library_book_deletion_path(uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
