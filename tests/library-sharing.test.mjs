import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

const alice = '11111111-1111-4111-8111-111111111111'
const bob = '22222222-2222-4222-8222-222222222222'
const carol = '33333333-3333-4333-8333-333333333333'
const book = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const path = `${alice}/book.pdf`
const columns = 'id,owner_id,title,author,pdf_path,created_at'
const db = new PGlite()
async function asUser(id) {
  await db.exec('reset role')
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id ?? ''])
  await db.exec(`set role ${id ? 'authenticated' : 'anon'}`)
}
async function scalar(sql, params = []) { return Object.values((await db.query(sql, params)).rows[0])[0] }
async function visibleBooks() { return (await db.query(`select ${columns} from public.library_books`)).rows }
async function visiblePdfs() { return (await db.query("select name from storage.objects where bucket_id = 'library-pdfs'")).rows }
const visibilityMigration = await readFile(new URL('../supabase/migrations/202610280004_library_book_visibility.sql', import.meta.url), 'utf8')
const insertFix = await readFile(new URL('../supabase/migrations/202610280003_library_book_insert_returning.sql', import.meta.url), 'utf8')
const commentMigration = await readFile(new URL('../supabase/migrations/202610280005_library_page_comments.sql', import.meta.url), 'utf8')
const first = await readFile(new URL('../supabase/migrations/202610280001_private_library.sql', import.meta.url), 'utf8')
const sharing = await readFile(new URL('../supabase/migrations/202610280002_library_friends.sql', import.meta.url), 'utf8')

test('friendship consent, private PDF access, independent progress and revocation use real PostgreSQL RLS', async t => {
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
    create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text);
    create function storage.foldername(name text) returns text[] language sql immutable as $$
      select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'),1)-1];
    $$;
    alter table storage.objects enable row level security;
    grant usage on schema auth, storage, public to anon, authenticated;
    grant select, insert, update, delete on storage.objects to anon, authenticated;
  `)
  await db.exec(first)
  await db.query('insert into auth.users(id,raw_user_meta_data) values ($1,$2),($3,$4),($5,$6)',
    [alice, {full_name:'Alice'}, bob, {full_name:'Bob'}, carol, {full_name:'Carol'}])
  await db.query('insert into public.library_books(id,owner_id,title,pdf_path,status,last_page) values($1,$2,$3,$4,$5,$6)',
    [book, alice, 'Livro da Alice', path, 'read', 40])
  await db.query("insert into storage.objects(bucket_id,name) values('library-pdfs',$1)", [path])
  await db.exec(sharing)
  await t.test('reproduces the old owner INSERT RETURNING denial and applies the fix', async () => {
    await asUser(alice)
    await assert.rejects(db.query(`insert into public.library_books(owner_id,title,pdf_path) values($1,'New upload',$2) returning ${columns}`,
      [alice, `${alice}/regression.pdf`]), {code:'42501'})
    await db.exec('reset role')
    await db.exec(insertFix)
  })

  await t.test('owner progress is preserved by the migration and legacy progress cannot leak', async () => {
    await asUser(alice)
    assert.equal((await visibleBooks()).length, 1)
    assert.equal(await scalar('select last_page from public.library_reading_progress'),40)
    await assert.rejects(db.query('select status,last_page from public.library_books'), /permission denied/)
  })
  let codeAlice, codeBob, friendship
  await t.test('strangers cannot read metadata or PDFs and cannot enumerate users/codes', async () => {
    await asUser(alice); codeAlice = await scalar('select public.library_my_friend_code()')
    await asUser(bob); codeBob = await scalar('select public.library_my_friend_code()')
    assert.equal((await visibleBooks()).length,0)
    assert.equal((await visiblePdfs()).length,0)
    await assert.rejects(db.query('select * from public.library_friend_codes'), /permission denied/)
    await assert.rejects(db.query('select * from auth.users'), /permission denied/)
  })
  await t.test('pending and reverse invitations do not grant access or self-acceptance', async () => {
    await db.query('select public.library_request_friendship($1)', [codeAlice])
    friendship = await scalar('select friendship_id from public.library_list_friends()')
    assert.equal((await visibleBooks()).length,0)
    assert.equal((await visiblePdfs()).length,0)
    await assert.rejects(db.query('select public.library_accept_friendship($1)', [friendship]), /Invitation unavailable/)
    await asUser(alice)
    await db.query('select public.library_request_friendship($1)', [codeBob])
    assert.equal(await scalar('select status from public.library_list_friends()'),'pending')
    await asUser(carol)
    await assert.rejects(db.query('select public.library_accept_friendship($1)', [friendship]), /Invitation unavailable/)
    assert.equal((await db.query('select * from public.library_list_friends()')).rows.length,0)
  })
  await t.test('only recipient acceptance grants access to the book and its private PDF', async () => {
    await asUser(alice)
    await db.query('select public.library_accept_friendship($1)', [friendship])
    await asUser(bob)
    assert.equal((await visibleBooks()).length,1)
    assert.equal((await visiblePdfs()).length,1)
    assert.equal((await db.query('select * from public.library_reading_progress')).rows.length,0)
    await assert.rejects(db.query('select status,last_page from public.library_books'), /permission denied/)
    await assert.rejects(db.query("update public.library_books set title = 'Changed' where id = $1", [book]), /permission denied/)
    assert.equal((await db.query('delete from storage.objects where name = $1 returning name', [path])).rows.length, 0)
  })
  await t.test('friends save their own page without modifying or reading owner progress', async () => {
    await db.query(`insert into public.library_reading_progress(user_id,book_id,status,last_page) values($1,$2,'reading',12)
      on conflict(user_id,book_id) do update set user_id=excluded.user_id,book_id=excluded.book_id,status=excluded.status,last_page=excluded.last_page`, [bob,book])
    assert.equal(await scalar('select last_page from public.library_reading_progress'),12)
    await assert.rejects(db.query('insert into public.library_reading_progress(user_id,book_id) values($1,$2)', [carol,book]), /row-level security/)
    assert.equal((await db.query("update public.library_reading_progress set last_page=999 where user_id=$1 returning last_page",[alice])).rows.length,0)
    await asUser(alice)
    assert.equal(await scalar('select last_page from public.library_reading_progress'),40)
    assert.equal((await db.query('select * from public.library_reading_progress')).rows.length,1)
  })
  await t.test('unrelated permissive storage policies do not bypass restrictions', async () => {
    await db.exec('reset role')
    await db.exec('create policy unrelated_broad_policy on storage.objects for all to authenticated using(true) with check(true)')
    await asUser(carol)
    assert.equal((await visiblePdfs()).length,0)
    await assert.rejects(db.query("insert into storage.objects(bucket_id,name) values('library-pdfs',$1)",[`${alice}/forged.pdf`]), /row-level security/)
    await asUser(bob)
    assert.equal((await db.query('delete from storage.objects where name=$1 returning name',[path])).rows.length,0)
    assert.equal((await db.query("update storage.objects set name='hijacked.pdf' where name=$1 returning name",[path])).rows.length,0)
  })
  await t.test('removal immediately revokes new reads and writes without deleting progress', async () => {
    await db.query('select public.library_remove_friendship($1)',[friendship])
    assert.equal((await visibleBooks()).length,0)
    assert.equal((await visiblePdfs()).length,0)
    assert.equal((await db.query('select * from public.library_reading_progress')).rows.length,0)
    await assert.rejects(db.query("insert into public.library_reading_progress(user_id,book_id,status) values($1,$2,'read') on conflict(user_id,book_id) do update set status='read'",[bob,book]), /row-level security/)
    await db.exec('reset role')
    assert.equal(await scalar('select last_page from public.library_reading_progress where user_id=$1',[bob]),12)
    await db.exec(sharing)
    await db.exec(insertFix)
    assert.equal(await scalar('select last_page from public.library_reading_progress where user_id=$1',[bob]),12)
    await asUser(alice)
    assert.equal((await visiblePdfs()).length,1)
  })
  await t.test('anonymous callers cannot use friendship RPCs or read private data', async () => {
    await asUser(null)
    await assert.rejects(db.query('select public.library_my_friend_code()'), /permission denied/)
    await assert.rejects(db.query(`select ${columns} from public.library_books`), /permission denied/)
    assert.equal((await visiblePdfs()).length,0)
  })
  await t.test('owner uploads can return their metadata; other owners and legacy progress stay blocked', async () => {
    await asUser(alice)
    const added = await db.query(`insert into public.library_books(owner_id,title,pdf_path) values($1,'New upload',$2) returning ${columns}`,
      [alice, `${alice}/new-upload.pdf`])
    assert.equal(added.rows.length,1)
    assert.equal(added.rows[0].owner_id,alice)
    await asUser(bob)
    await assert.rejects(db.query(`insert into public.library_books(owner_id,title,pdf_path) values($1,'Forged',$2) returning ${columns}`,
      [alice, `${alice}/forged-upload.pdf`]), {code:'42501'})
    assert.equal((await visibleBooks()).length,0)
    await assert.rejects(db.query('select status,last_page from public.library_books'), /permission denied/)
    await db.exec('reset role')
    await db.exec(insertFix)
  })
  let privateBook, privatePath = `${alice}/private.pdf`
  await t.test('visibility migration preserves existing sharing and new books default to private', async () => {
    await db.exec(visibilityMigration)
    await asUser(alice)
    assert.equal(await scalar('select visibility from public.library_books where id=$1',[book]),'friends')
    const inserted = await db.query(`insert into public.library_books(owner_id,title,pdf_path) values($1,'Private book',$2) returning id,visibility`,[alice,privatePath])
    privateBook = inserted.rows[0].id
    assert.equal(inserted.rows[0].visibility,'private')
    await db.exec('reset role')
    await db.query("insert into storage.objects(bucket_id,name) values('library-pdfs',$1)",[privatePath])
    await asUser(bob)
    await db.query('select public.library_request_friendship($1)',[codeAlice])
    const request=await scalar('select friendship_id from public.library_list_friends()')
    await asUser(alice)
    await db.query('select public.library_accept_friendship($1)',[request])
  })
  await t.test('accepted friends cannot read private metadata, PDF or create progress for it', async () => {
    await asUser(bob)
    assert.equal(await scalar('select public.library_can_read_book($1)',[privateBook]),false)
    assert.equal((await db.query('select id from public.library_books where id=$1',[privateBook])).rows.length,0)
    assert.equal((await db.query('select name from storage.objects where name=$1',[privatePath])).rows.length,0)
    await assert.rejects(db.query('insert into public.library_reading_progress(user_id,book_id) values($1,$2)',[bob,privateBook]),/row-level security/)
    assert.equal((await db.query("update public.library_books set visibility='friends' where id=$1 returning visibility",[privateBook])).rows.length,0)
    assert.equal((await db.query("update public.library_books set visibility='private' where id=$1 returning visibility",[book])).rows.length,0)
  })
  await t.test('only owner can share a private book, friends save independent progress', async () => {
    await asUser(alice)
    assert.equal(await scalar("update public.library_books set visibility='friends' where id=$1 returning visibility",[privateBook]),'friends')
    await asUser(bob)
    assert.equal((await db.query('select id from public.library_books where id=$1',[privateBook])).rows.length,1)
    assert.equal((await db.query('select name from storage.objects where name=$1',[privatePath])).rows.length,1)
    await db.query("insert into public.library_reading_progress(user_id,book_id,status,last_page) values($1,$2,'reading',17)",[bob,privateBook])
    await asUser(carol)
    assert.equal((await db.query('select id from public.library_books where id=$1',[privateBook])).rows.length,0)
    assert.equal((await db.query('select name from storage.objects where name=$1',[privatePath])).rows.length,0)
  })
  await t.test('making a shared book private revokes metadata/PDF/progress access and preserves saved pages', async () => {
    await asUser(alice)
    await db.query("update public.library_books set visibility='private' where id=$1",[privateBook])
    assert.equal((await db.query('select user_id from public.library_reading_progress where book_id=$1',[privateBook])).rows.length,0)
    await asUser(bob)
    assert.equal((await db.query('select id from public.library_books where id=$1',[privateBook])).rows.length,0)
    assert.equal((await db.query('select name from storage.objects where name=$1',[privatePath])).rows.length,0)
    assert.equal((await db.query('select * from public.library_reading_progress where book_id=$1',[privateBook])).rows.length,0)
    assert.equal((await db.query('update public.library_reading_progress set last_page=999 where book_id=$1 returning last_page',[privateBook])).rows.length,0)
    await db.exec('reset role')
    assert.equal(await scalar('select last_page from public.library_reading_progress where user_id=$1 and book_id=$2',[bob,privateBook]),17)
    await db.exec(visibilityMigration)
    await asUser(alice)
    assert.equal(await scalar('select visibility from public.library_books where id=$1',[privateBook]),'private')
    await assert.rejects(db.query("update public.library_books set visibility='public' where id=$1",[privateBook]),{code:'23514'})
    await db.query("update public.library_books set visibility='friends' where id=$1",[privateBook])
    await asUser(bob)
    assert.equal(await scalar('select last_page from public.library_reading_progress where book_id=$1',[privateBook]),17)
    await asUser(null)
    await assert.rejects(db.query('select visibility from public.library_books'),/permission denied/)
    assert.equal((await visiblePdfs()).length,0)
  })
  let aliceComment, bobComment
  await t.test('page comments inherit book access, names are scoped, and author identity cannot be forged', async () => {
    await db.exec('reset role')
    await db.exec(commentMigration)
    await asUser(alice)
    aliceComment = await scalar("insert into public.library_page_comments(book_id,page_number,body) values($1,1,'  Comentário da Alice  ') returning id",[privateBook])
    await db.query("insert into public.library_page_comments(book_id,page_number,body) values($1,2,'Outra página')",[privateBook])
    await asUser(bob)
    const visible = (await db.query('select * from public.library_list_page_comments($1,1,0)',[privateBook])).rows
    assert.equal(visible.length,1)
    assert.equal(visible[0].display_name,'Alice')
    assert.equal(visible[0].body,'Comentário da Alice')
    assert.equal(visible[0].page_number,1)
    assert.equal('email' in visible[0],false)
    bobComment = await scalar("insert into public.library_page_comments(book_id,page_number,body) values($1,1,'Comentário do Bob') returning id",[privateBook])
    await assert.rejects(db.query("insert into public.library_page_comments(book_id,page_number,body,author_id) values($1,1,'Forjado',$2)",[privateBook,alice]),{code:'42501'})
    await assert.rejects(db.query('select * from public.library_list_page_comments($1,0,0)',[privateBook]),{code:'22023'})
    await assert.rejects(db.query("insert into public.library_page_comments(book_id,page_number,body) values($1,0,'Inválido')",[privateBook]),{code:'23514'})
    await assert.rejects(db.query("insert into public.library_page_comments(book_id,page_number,body) values($1,1,'   ')",[privateBook]),{code:'23514'})
    await assert.rejects(db.query('insert into public.library_page_comments(book_id,page_number,body) values($1,1,$2)',[privateBook,'a'.repeat(4001)]),{code:'23514'})
  })
  await t.test('readers can edit and delete only their own comments, including the book owner', async () => {
    assert.equal((await db.query("update public.library_page_comments set body='Hack' where id=$1 returning id",[aliceComment])).rows.length,0)
    assert.equal((await db.query('delete from public.library_page_comments where id=$1 returning id',[aliceComment])).rows.length,0)
    const before=await scalar('select updated_at from public.library_page_comments where id=$1',[bobComment])
    const updated=(await db.query("update public.library_page_comments set body='  Editado pelo Bob  ' where id=$1 returning body,updated_at",[bobComment])).rows[0]
    assert.equal(updated.body,'Editado pelo Bob')
    assert(new Date(updated.updated_at)>=new Date(before))
    await assert.rejects(db.query('update public.library_page_comments set page_number=2 where id=$1',[bobComment]),{code:'42501'})
    await asUser(alice)
    assert.equal((await db.query('delete from public.library_page_comments where id=$1 returning id',[bobComment])).rows.length,0)
    await db.query('delete from public.library_page_comments where id=$1',[aliceComment])
    assert.equal((await db.query('select id from public.library_page_comments where id=$1',[aliceComment])).rows.length,0)
    assert.equal(await scalar('select last_page from public.library_reading_progress where user_id=$1 and book_id=$2',[bob,privateBook]).catch(()=>null),null)
    await asUser(bob)
    assert.equal(await scalar('select last_page from public.library_reading_progress where book_id=$1',[privateBook]),17)
  })
  await t.test('comments are paged, strangers and unrelated permissive policies cannot expose them', async () => {
    await asUser(alice)
    await db.query("insert into public.library_page_comments(book_id,page_number,body) select $1,5,'Comentário ' || n from generate_series(1,120) n",[privateBook])
    const batch1=(await db.query('select * from public.library_list_page_comments($1,5,0)',[privateBook])).rows
    const batch2=(await db.query('select * from public.library_list_page_comments($1,5,50)',[privateBook])).rows
    const batch3=(await db.query('select * from public.library_list_page_comments($1,5,100)',[privateBook])).rows
    assert.equal(batch1.length,51); assert.equal(batch2.length,51); assert.equal(batch3.length,20)
    assert.equal(new Set([...batch1.slice(0,50),...batch2.slice(0,50),...batch3].map(c=>c.id)).size,120)
    await db.exec('reset role')
    await db.exec('create policy unrelated_comments_policy on public.library_page_comments for all to authenticated using(true) with check(true)')
    await asUser(carol)
    assert.equal((await db.query('select * from public.library_page_comments')).rows.length,0)
    await assert.rejects(db.query('select * from public.library_list_page_comments($1,1,0)',[privateBook]),{code:'42501'})
    await assert.rejects(db.query("insert into public.library_page_comments(book_id,page_number,body) values($1,1,'Sem acesso')",[privateBook]),{code:'42501'})
  })
  await t.test('private books and removed friendships revoke comment reads/writes without deleting the conversation', async () => {
    await asUser(alice)
    await db.query("update public.library_books set visibility='private' where id=$1",[privateBook])
    await asUser(bob)
    assert.equal((await db.query('select * from public.library_page_comments')).rows.length,0)
    assert.equal((await db.query("update public.library_page_comments set body='Sem acesso' where id=$1 returning id",[bobComment])).rows.length,0)
    assert.equal((await db.query('delete from public.library_page_comments where id=$1 returning id',[bobComment])).rows.length,0)
    await assert.rejects(db.query('select * from public.library_list_page_comments($1,1,0)',[privateBook]),{code:'42501'})
    await asUser(alice)
    assert.equal((await db.query('select * from public.library_list_page_comments($1,1,0)',[privateBook])).rows.length,1)
    await db.query("update public.library_books set visibility='friends' where id=$1",[privateBook])
    await asUser(bob)
    assert.equal((await db.query('select * from public.library_list_page_comments($1,1,0)',[privateBook])).rows[0].body,'Editado pelo Bob')
    const friendship=await scalar('select friendship_id from public.library_list_friends() where other_id=$1',[alice])
    await db.query('select public.library_remove_friendship($1)',[friendship])
    await assert.rejects(db.query('select * from public.library_list_page_comments($1,1,0)',[privateBook]),{code:'42501'})
    await asUser(null)
    await assert.rejects(db.query('select * from public.library_page_comments'),{code:'42501'})
    await assert.rejects(db.query('select * from public.library_list_page_comments($1,1,0)',[privateBook]),{code:'42501'})
    await db.exec('reset role')
    await db.exec(commentMigration)
    assert.equal(await scalar('select count(*)::int from public.library_page_comments where book_id=$1',[privateBook]),122)
  })
  await t.test('only the owner can delete a book and associated comments and progress cascade', async () => {
    await db.exec('reset role')
    const migration = await readFile(new URL('../supabase/migrations/202610280006_library_book_delete.sql', import.meta.url), 'utf8')
    await db.exec(migration)
    await db.exec(migration)
    const doomed = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
    await db.query("insert into public.library_books(id,owner_id,title,pdf_path,visibility) values($1,$2,'Excluir',$3,'friends')", [doomed,alice,`${alice}/delete.pdf`])
    await db.query("insert into public.library_reading_progress(user_id,book_id,status,last_page) values($1,$2,'reading',7)",[bob,doomed])
    await db.query("insert into public.library_page_comments(book_id,author_id,page_number,body) values($1,$2,1,'Comentário')",[doomed,bob])
    await asUser(bob)
    assert.equal(await scalar('select public.library_book_deletion_path($1)',[doomed]),null)
    assert.equal((await db.query('delete from public.library_books where id=$1 returning id',[doomed])).rows.length,0)
    await asUser(null)
    await assert.rejects(db.query('delete from public.library_books where id=$1',[doomed]),{code:'42501'})
    await asUser(alice)
    assert.equal(await scalar('select public.library_book_deletion_path($1)',[doomed]),`${alice}/delete.pdf`)
    assert.equal((await db.query('delete from public.library_books where id=$1 returning id',[doomed])).rows.length,1)
    await db.exec('reset role')
    assert.equal(await scalar('select count(*)::int from public.library_reading_progress where book_id=$1',[doomed]),0)
    assert.equal(await scalar('select count(*)::int from public.library_page_comments where book_id=$1',[doomed]),0)
  })
  await db.close()
})
