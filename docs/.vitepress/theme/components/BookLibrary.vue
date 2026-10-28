<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { withBase } from 'vitepress'
import { useAuth } from '../composables/useAuth'
import { getSupabase } from '../supabase'
import LibraryFriends from './LibraryFriends.vue'
import { bookFields, withReadingProgress, type BookWithProgress, type LibraryFriend, normalizeSearch, pdfBucket, statusLabels, validatePdf, type LibraryBook, type ReadingStatus } from '../library'

const { user, ready, busy: authBusy, accountName, errorMessage: authError, signIn } = useAuth()
const books = ref<LibraryBook[]>([])
const friends = ref<LibraryFriend[]>([])
const ownerFilter = ref('mine')
const selectedFriend = computed(() => friends.value.find(friend => friend.other_id === ownerFilter.value) ?? null)
const loading = ref(false)
const error = ref('')
const notice = ref('')
const search = ref('')
const filter = ref<ReadingStatus | 'all'>('all')
const showUpload = ref(false)
const uploadDialog = ref<HTMLDialogElement>()
let uploadTrigger: HTMLElement | null = null
let previousOverflow = ''
let uploadScrollLocked = false

async function openUpload(event: Event) {
  uploadTrigger = event.currentTarget as HTMLElement
  showUpload.value = true
  await nextTick()
  if (!user.value || selectedFriend.value || !uploadDialog.value || uploadDialog.value.open) return
  uploadDialog.value.showModal()
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  uploadScrollLocked = true
}
function releaseUpload() {
  showUpload.value = false
  if (uploadScrollLocked) {
    document.body.style.overflow = previousOverflow
    uploadScrollLocked = false
  }
}
function closeUpload() {
  uploadDialog.value?.close()
  releaseUpload()
}
function onUploadClose() {
  releaseUpload()
  if (uploadTrigger?.isConnected) uploadTrigger.focus({ preventScroll: true })
}
function uploadBackdrop(event: MouseEvent) {
  if (event.target !== uploadDialog.value) return
  const bounds = uploadDialog.value.getBoundingClientRect()
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeUpload()
}
function uploadFocus(event: KeyboardEvent) {
  if (event.key !== 'Tab' || !uploadDialog.value?.open) return
  const controls = Array.from(uploadDialog.value.querySelectorAll<HTMLElement>(
    'button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]',
  )).filter(element => element.tabIndex >= 0 && element.getClientRects().length > 0)
  const first = controls[0]
  const last = controls[controls.length - 1]
  if (!first || !last) return
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault(); last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault(); first.focus()
  }
}
const uploading = ref(false)
const title = ref('')
const author = ref('')
const fileInput = ref<HTMLInputElement>()
const file = ref<File | null>(null)
const opening = ref<string | null>(null)
const saving = ref<string | null>(null)
const activeBook = ref<LibraryBook | null>(null)
const pdfUrl = ref('')
const page = ref(1)
const readerHeading = ref<HTMLElement>()
let generation = 0
let openRequest = 0
const uid = computed(() => user.value?.id)
const shelfOwner = computed(() => ownerFilter.value === 'all' ? undefined : selectedFriend.value?.other_id ?? uid.value)
function bookOwnerName(ownerId: string) {
  return ownerId === uid.value ? `${accountName.value} (você)` : friends.value.find(friend => friend.other_id === ownerId)?.display_name ?? 'Amigo'
}
const firstName = computed(() => accountName.value.split(' ')[0])
const filters: { value: ReadingStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' }, { value: 'want_read', label: 'Quero ler' },
  { value: 'reading', label: 'Lendo' }, { value: 'read', label: 'Lidos' },
]
const counts = computed(() => ({
  all: books.value.length,
  want_read: books.value.filter(book => book.status === 'want_read').length,
  reading: books.value.filter(book => book.status === 'reading').length,
  read: books.value.filter(book => book.status === 'read').length,
}))
const filtered = computed(() => {
  const terms = normalizeSearch(search.value.trim()).split(/\s+/).filter(Boolean)
  return books.value.filter(book =>
    (filter.value === 'all' || book.status === filter.value)
    && terms.every(term => normalizeSearch(`${book.title} ${book.author}`).includes(term)),
  )
})
const visibleCount = ref(12)
const visibleBooks = computed(() => filtered.value.slice(0, visibleCount.value))
watch([search, filter], () => { visibleCount.value = 12 })

function closeReader() {
  openRequest++
  if (pdfUrl.value) URL.revokeObjectURL(pdfUrl.value)
  pdfUrl.value = ''
  activeBook.value = null
  opening.value = null
}
function resetPrivateState() {
  generation++
  closeReader()
  books.value = []
  error.value = ''
  notice.value = ''
  search.value = ''
  filter.value = 'all'
  closeUpload()
  file.value = null
  if (fileInput.value) fileInput.value.value = ''
  title.value = ''
  author.value = ''
  uploading.value = false
  saving.value = null
}
async function loadBooks() {
  const owner = uid.value
  const shelf = shelfOwner.value
  if (!owner) return
  closeReader()
  books.value = []
  const ticket = ++generation
  loading.value = true
  error.value = ''
  try {
    const client = await getSupabase(withBase('/'))
    let query = client.from('library_books')
      .select(`${bookFields},reading:library_reading_progress(status,last_page)`)
    if (shelf) query = query.eq('owner_id', shelf)
    const { data, error: queryError } = await query.order('created_at', { ascending: false }).limit(1000)
    if (ticket !== generation || uid.value !== owner) return
    if (queryError) throw queryError
    books.value = ((data ?? []) as unknown as BookWithProgress[]).map(withReadingProgress)
  } catch {
    if (ticket === generation) error.value = 'Não foi possível carregar seus livros. Tente novamente em instantes.'
  } finally {
    if (ticket === generation) loading.value = false
  }
}
watch(uid, () => {
  ownerFilter.value = 'mine'
  friends.value = []
  resetPrivateState()
  loading.value = false
  if (uid.value) void loadBooks()
}, { immediate: true, flush: 'sync' })
onUnmounted(resetPrivateState)

function visitShelf(friend: LibraryFriend | null) {
  if (friend?.status !== 'accepted' && friend !== null) return
  resetPrivateState()
  ownerFilter.value = friend?.other_id ?? 'mine'
  void loadBooks()
}
function changeShelf(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  if (value === 'all') {
    resetPrivateState()
    ownerFilter.value = 'all'
    void loadBooks()
  } else {
    visitShelf(friends.value.find(friend => friend.other_id === value) ?? null)
  }
}
function refreshFriends(list: LibraryFriend[]) {
  const accepted = list.filter(friend => friend.status === 'accepted')
  const friendshipsChanged = friends.value.length !== accepted.length || friends.value.some(friend => !accepted.some(current => current.other_id === friend.other_id))
  friends.value = accepted
  if (!['mine', 'all'].includes(ownerFilter.value) && !selectedFriend.value) visitShelf(null)
  else if (ownerFilter.value === 'all' && friendshipsChanged) {
    resetPrivateState()
    void loadBooks()
  }
}


function chooseFile(event: Event) {
  const input = event.target as HTMLInputElement
  file.value = input.files?.[0] ?? null
  if (!title.value && file.value) title.value = file.value.name.replace(/\.pdf$/i, '').replace(/[_-]/g, ' ')
}
async function uploadBook() {
  const owner = uid.value
  const selected = file.value
  if (!owner || !selected || uploading.value || selectedFriend.value) return
  const ticket = generation
  uploading.value = true
  error.value = ''
  notice.value = ''
  try {
    const validation = await validatePdf(selected)
    if (ticket !== generation) return
    if (validation) { error.value = validation; return }
    if (!title.value.trim()) { error.value = 'Informe o título do livro.'; return }
    const client = await getSupabase(withBase('/'))
    const path = `${owner}/${crypto.randomUUID()}.pdf`
    const { error: uploadError } = await client.storage.from(pdfBucket)
      .upload(path, selected, { contentType: 'application/pdf', upsert: false })
    if (uploadError) throw uploadError
    // A logout invalidates all in-flight UI operations.
    if (ticket !== generation || uid.value !== owner) return
    const { data, error: insertError } = await client.from('library_books').insert({
      owner_id: owner, title: title.value.trim(), author: author.value.trim(), pdf_path: path,
    }).select(bookFields).single()
    if (insertError) {
      await client.storage.from(pdfBucket).remove([path])
      throw insertError
    }
    if (ticket !== generation || uid.value !== owner) return
    books.value.unshift(withReadingProgress(data as BookWithProgress))
    title.value = ''
    author.value = ''
    file.value = null
    if (fileInput.value) fileInput.value.value = ''
    closeUpload()
    notice.value = 'Livro adicionado à sua biblioteca.'
  } catch {
    if (ticket === generation) error.value = 'Não foi possível adicionar o PDF. Confira o espaço disponível e tente novamente.'
  } finally {
    if (ticket === generation) uploading.value = false
  }
}
async function saveBook(book: LibraryBook, changes: { status?: ReadingStatus; last_page?: number }) {
  const owner = uid.value
  if (!owner || saving.value) return
  const ticket = generation
  saving.value = book.id
  error.value = ''
  try {
    const client = await getSupabase(withBase('/'))
    const { data, error: updateError } = await client.from('library_reading_progress').upsert({
      user_id: owner, book_id: book.id,
      status: changes.status ?? book.status, last_page: changes.last_page ?? book.last_page,
    }, { onConflict: 'user_id,book_id' }).select('status,last_page').single()
    if (ticket !== generation || uid.value !== owner) return
    if (updateError) throw updateError
    Object.assign(book, data)
    notice.value = changes.last_page ? 'Página salva. Você pode continuar daqui depois.' : 'Status de leitura atualizado.'
  } catch {
    if (ticket === generation) error.value = 'Não foi possível salvar sua leitura. Tente novamente.'
  } finally {
    if (ticket === generation) saving.value = null
  }
}
function changeStatus(book: LibraryBook, event: Event) {
  const select = event.target as HTMLSelectElement
  const value = select.value as ReadingStatus
  select.value = book.status
  void saveBook(book, { status: value })
}
async function openBook(book: LibraryBook) {
  const owner = uid.value
  if (!owner) return
  closeReader()
  const request = ++openRequest
  const ticket = generation
  opening.value = book.id
  error.value = ''
  try {
    const client = await getSupabase(withBase('/'))
    const { data, error: downloadError } = await client.storage.from(pdfBucket).download(book.pdf_path)
    if (ticket !== generation || request !== openRequest || uid.value !== owner) return
    if (downloadError || !data) throw downloadError
    pdfUrl.value = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }))
    activeBook.value = book
    page.value = book.last_page
    await nextTick()
    readerHeading.value?.focus({ preventScroll: true })
    readerHeading.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    if (book.status === 'want_read') void saveBook(book, { status: 'reading' })
  } catch {
    if (ticket === generation && request === openRequest) error.value = 'Não foi possível abrir este PDF. Tente novamente.'
  } finally {
    if (ticket === generation && request === openRequest) opening.value = null
  }
}
function savePage() {
  if (!activeBook.value || !Number.isInteger(page.value) || page.value < 1 || page.value > 100000) {
    error.value = 'Informe uma página válida, a partir de 1.'
    return
  }
  void saveBook(activeBook.value, { last_page: page.value })
}
</script>

<template>
  <section v-if="!ready" class="library-gate" aria-live="polite" aria-busy="true">
    <span class="library-symbol" aria-hidden="true">◷</span>
    <p class="eyebrow">UM INSTANTE</p><h1>Preparando seu espaço.</h1><p>Estamos verificando sua conta.</p>
  </section>
  <section v-else-if="!user" class="library-gate">
    <div class="gate-art" aria-hidden="true"><span></span><span></span><span></span><b>⌑</b></div>
    <p class="eyebrow">UM ESPAÇO SÓ SEU</p>
    <h1>Boas leituras<br>começam <em>aqui.</em></h1>
    <p>Guarde seus livros, retome de onde parou e acompanhe cada leitura. Entre na sua conta para abrir sua biblioteca privada.</p>
    <button class="library-primary" type="button" :disabled="authBusy" @click="signIn('/livros.html')">
      <span class="google-letter" aria-hidden="true">G</span>{{ authBusy ? 'Entrando…' : 'Entrar com Google' }}<span aria-hidden="true">↗</span>
    </button>
    <p v-if="authError" class="library-error" role="alert">{{ authError }}</p>
    <small>Seus livros e suas marcações ficam na sua conta.</small>
    <a :href="withBase('/')">← Voltar aos artigos</a>
  </section>
  <section v-else class="book-library">
    <div class="library-account">
      <span><i aria-hidden="true"></i>BIBLIOTECA PRIVADA</span>
    </div>
    <header class="library-intro">
      <div><p class="eyebrow">{{ selectedFriend ? 'UMA ESTANTE AMIGA' : 'SEU PRÓXIMO CAPÍTULO' }}</p><h1 v-if="selectedFriend">Estante de <em>{{ selectedFriend.display_name }}.</em></h1><h1 v-else-if="ownerFilter === 'all'">Todas as estantes, <em>boas leituras.</em></h1><h1 v-else>Sua estante, <em>seu ritmo.</em></h1><p>{{ selectedFriend ? 'Explore os livros do seu amigo. As páginas salvas e os status abaixo são seus, sem alterar a leitura dele.' : `Olá, ${firstName}. Que tal reservar um tempo para uma boa leitura?` }}</p></div>
      <button v-if="!selectedFriend" class="library-primary" type="button" aria-haspopup="dialog" aria-controls="upload-book" @click="openUpload"><span aria-hidden="true">+</span> Adicionar livro</button>
    </header>
    <LibraryFriends @visit="visitShelf" @refreshed="refreshFriends" />
    <div v-if="selectedFriend" class="shared-shelf-note"><span>Compartilhada por {{ selectedFriend.display_name }} · Seu progresso é individual.</span><button class="library-secondary" type="button" @click="visitShelf(null)">← Minha estante</button></div>
    <div class="library-stats" aria-label="Resumo da biblioteca">
      <div><span>NA ESTANTE</span><strong>{{ counts.all.toString().padStart(2, '0') }}</strong><small>livros para explorar</small></div>
      <div><span>EM ANDAMENTO</span><strong>{{ counts.reading.toString().padStart(2, '0') }}</strong><small>capítulos acontecendo</small></div>
      <div><span>CONCLUÍDOS</span><strong>{{ counts.read.toString().padStart(2, '0') }}</strong><small>histórias que ficam</small></div>
      <p>Uma página de cada vez.<br><em>O importante é continuar.</em><span aria-hidden="true">✳</span></p>
    </div>
    <dialog v-if="!selectedFriend" id="upload-book" ref="uploadDialog" class="upload-dialog" aria-labelledby="upload-title" aria-describedby="upload-description" @cancel.prevent="closeUpload" @close="onUploadClose" @click="uploadBackdrop" @keydown="uploadFocus">
    <form class="library-upload" @submit.prevent="uploadBook">
      <div class="upload-modal-heading"><div><p class="eyebrow">MAIS UM NA ESTANTE</p><h2 id="upload-title">Adicione sua próxima leitura</h2></div><button class="upload-close library-secondary" type="button" aria-label="Fechar janela de adicionar livro" @click="closeUpload"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg></button></div><p id="upload-description">Escolha um PDF de até 50 MB. Seus amigos aceitos também poderão ler este PDF. As marcações de leitura são individuais.</p>
      <label class="pdf-picker">Arquivo PDF<input ref="fileInput" type="file" accept=".pdf,application/pdf" required :disabled="uploading" @change="chooseFile"></label>
      <div class="upload-fields"><label>Título<input v-model="title" autofocus maxlength="200" required :disabled="uploading" placeholder="Como se chama o livro?"></label><label><span class="upload-label-heading">Autor <small>(opcional)</small></span><input v-model="author" maxlength="200" :disabled="uploading" placeholder="Quem escreveu?"></label></div>
      <p v-if="error" class="library-error" role="alert">{{ error }}</p>
      <div class="upload-actions"><button class="library-primary" type="submit" :disabled="uploading || !file">{{ uploading ? 'Enviando PDF…' : 'Guardar na biblioteca' }}</button><button class="library-secondary" type="button" @click="closeUpload">{{ uploading ? 'Fechar' : 'Cancelar' }}</button></div>
    </form>
    </dialog>
    <p v-if="authError" class="library-error" role="alert">{{ authError }}</p>
    <div v-if="error && !showUpload" class="library-error" role="alert">{{ error }} <button v-if="!books.length && !uploading" type="button" @click="loadBooks">Tentar novamente</button></div>
    <p v-if="notice" class="library-notice" role="status">{{ notice }}</p>
    <section v-if="activeBook && pdfUrl" class="library-reader" aria-label="Leitor de PDF">
      <div class="reader-top"><div><p class="eyebrow">MODO LEITURA</p><h2 ref="readerHeading" tabindex="-1">{{ activeBook.title }}</h2><p class="reader-owner">Da estante de {{ bookOwnerName(activeBook.owner_id) }}</p></div><button class="library-secondary" type="button" @click="closeReader">Fechar leitor ×</button></div>
      <div class="reader-controls"><form @submit.prevent="savePage"><label>Última página <input v-model.number="page" type="number" min="1" max="100000" required></label><button class="library-secondary" type="submit" :disabled="!!saving">Salvar página</button></form><a :href="pdfUrl" target="_blank" rel="noopener">Abrir PDF em outra aba ↗</a></div>
      <p class="reader-hint">Anote e salve a página antes de sair. Se o leitor não aparecer no seu dispositivo, abra o PDF em outra aba.</p>
      <iframe :key="pdfUrl" :src="`${pdfUrl}#page=${activeBook.last_page}`" :title="`Ler ${activeBook.title}`"></iframe>
    </section>
    <div class="library-toolbar" role="region" aria-label="Filtros da biblioteca">
      <label class="shelf-filter"><span class="filter-label">Estante</span><span class="shelf-select"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 4h6v16H4zM14 4h6v16h-6zM4 8h6M14 8h6" /></svg><select :value="ownerFilter" aria-label="Filtrar livros por dono" @change="changeShelf"><option value="mine">Minha estante</option><option value="all">Todas as estantes</option><option v-for="friend in friends" :key="friend.other_id" :value="friend.other_id">{{ friend.display_name }}</option></select><svg class="select-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></span></label>
      <div class="reading-filter"><span class="filter-label">Sua leitura</span><div class="library-filters" role="group" aria-label="Filtrar por leitura"><button v-for="item in filters" :key="item.value" type="button" :aria-pressed="filter === item.value" @click="filter = item.value">{{ item.label }}<span>{{ counts[item.value] }}</span></button></div></div>
      <label class="library-search"><span class="filter-label">Buscar livro</span><span class="search-input"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></svg><input v-model="search" type="search" aria-label="Buscar livros por título ou autor" placeholder="Título ou autor…"></span></label>
    </div>
    <p v-if="loading" class="library-empty" role="status">Buscando suas próximas leituras…</p>
    <div v-else-if="!books.length && !error" class="library-empty"><span aria-hidden="true">▤</span><h2>{{ selectedFriend ? 'Esta estante ainda não tem livros.' : 'Sua estante começa com um livro.' }}</h2><p>{{ selectedFriend ? 'Quando seu amigo adicionar um PDF, ele aparecerá aqui para você.' : 'Adicione seu primeiro PDF e encontre aqui um cantinho para ler no seu ritmo.' }}</p><button v-if="!selectedFriend" class="library-primary" type="button" aria-haspopup="dialog" aria-controls="upload-book" @click="openUpload">+ Adicionar meu primeiro livro</button></div>
    <div v-else-if="!filtered.length && !error" class="library-empty"><h2>Nenhum livro por aqui.</h2><p>Experimente outro título, autor ou filtro de leitura.</p><button class="library-secondary" type="button" @click="search = ''; filter = 'all'">Limpar filtros</button></div>
    <div v-else class="books-grid">
      <article v-for="(book, index) in visibleBooks" :key="book.id" class="book-card">
        <div class="book-cover" :class="`cover-${index % 4}`" aria-hidden="true"><span class="cover-format">BIBLIOTECA PESSOAL / PDF</span><span class="cover-title">{{ book.title }}</span><span class="cover-author">{{ book.author || 'Uma nova leitura' }}</span><span class="cover-mark">c.</span><span class="cover-lines"></span></div>
        <div class="book-details"><span class="book-status" :class="book.status"><i></i>{{ statusLabels[book.status] }}</span><h2>{{ book.title }}</h2><span class="book-owner"><span aria-hidden="true">◉</span> De {{ bookOwnerName(book.owner_id) }}</span><p>{{ book.author || 'Autor não informado' }}</p><div class="book-page">{{ book.status === 'read' ? 'Leitura concluída ✓' : book.last_page > 1 ? `Última página salva: ${book.last_page}` : 'Uma boa leitura espera por você' }}</div>
          <label class="book-status-label">Sua leitura<select :value="book.status" :disabled="!!saving" :aria-label="`Status de leitura de ${book.title}`" @change="changeStatus(book, $event)"><option value="want_read">Quero ler</option><option value="reading">Lendo</option><option value="read">Lido</option></select></label>
          <button class="book-read" type="button" :disabled="opening === book.id" @click="openBook(book)">{{ opening === book.id ? 'Abrindo PDF…' : book.status === 'reading' ? 'Continuar leitura' : 'Abrir livro' }}<span aria-hidden="true">↗</span></button>
        </div>
      </article>
    </div>
    <button v-if="visibleCount < filtered.length" class="library-secondary load-more" type="button" @click="visibleCount += 12">Mostrar mais livros</button>
    <footer class="library-footer"><span>SEU ESPAÇO PARA LER E DESCOBRIR.</span><span>{{ filtered.length }} {{ filtered.length === 1 ? 'livro' : 'livros' }} na seleção</span></footer>
  </section>
</template>

<style scoped>
.book-owner { display: flex; align-items: flex-start; gap: 6px; margin: 10px 0; color: var(--green); font-size: 11px; line-height: 1.6; overflow-wrap: anywhere; }
.book-owner > span { flex-shrink: 0; font-size: 10px; }
.reader-owner { color: var(--muted); font-size: 12px; line-height: 1.6; }
.shared-shelf-note { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; padding: 18px; margin-bottom: 24px; border: 1px solid var(--line); border-radius: 6px; color: var(--muted); font-size: 12px; }
.book-library { padding: 28px 0 48px; }
.library-account, .library-account > span { display: flex; align-items: center; gap: 10px; }
.library-account { justify-content: space-between; padding-bottom: 22px; border-bottom: 1px solid var(--line); }
.library-account > span { color: var(--muted); font: 10px var(--mono); letter-spacing: .06em; }
.library-account i { width: 6px; height: 6px; border-radius: 50%; background: var(--green); }
.library-intro { display: flex; justify-content: space-between; align-items: center; gap: 24px; padding: 50px 0 34px; }
.library-intro h1 { font-size: clamp(32px, 4.5vw, 54px); line-height: 1.12; letter-spacing: -.055em; margin: 12px 0 18px; }
.library-intro p:not(.eyebrow) { margin: 0; color: var(--muted); font-size: 14px; line-height: 1.7; }
.library-primary, .library-secondary { display: inline-flex; align-items: center; justify-content: center; gap: 12px; min-height: 44px; padding: 12px 18px; border: 1px solid var(--green); border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; text-decoration: none; }
.library-primary { background: var(--green); color: var(--paper); }
.library-secondary { background: var(--surface); color: var(--green); }
button:disabled { opacity: .55; cursor: wait; }
.library-stats { display: grid; grid-template-columns: 1fr 1fr 1fr 1.5fr; border: 1px solid var(--line); border-radius: 8px; background: var(--surface); margin-bottom: 34px; overflow: hidden; }
.library-stats > div { padding: 24px; border-right: 1px solid var(--line); display: grid; gap: 8px; }
.library-stats div > span { color: var(--muted); font: 9px var(--mono); letter-spacing: .08em; }
.library-stats strong { color: var(--green); font: 400 38px var(--display); letter-spacing: -.04em; }
.library-stats small { font-size: 11px; color: var(--muted); }
.library-stats > p { position: relative; padding: 20px 30px; margin: 0; display: flex; justify-content: center; flex-direction: column; color: var(--muted); font-size: 13px; line-height: 1.9; }
.library-stats em { color: var(--green); font-style: normal; }
.library-stats p > span { position: absolute; right: 25px; bottom: 14px; font-size: 42px; opacity: .25; }
.library-toolbar { display: grid; grid-template-columns: minmax(190px, .85fr) minmax(350px, 1.6fr) minmax(220px, 1fr); gap: 22px; align-items: end; padding: 22px; margin: 30px 0; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); box-shadow: 0 3px 12px #00000003; }
.filter-label { display: block; margin-bottom: 10px; color: var(--muted); font-size: 12px; font-weight: 500; letter-spacing: .01em; line-height: 1.4; }
.shelf-filter, .reading-filter, .library-search { min-width: 0; }
.shelf-select, .search-input { display: flex; align-items: center; position: relative; min-height: 48px; border: 1px solid var(--line); border-radius: 8px; background: var(--paper); color: var(--muted); transition: border-color .15s, box-shadow .15s; }
.shelf-select:focus-within, .search-input:focus-within { border-color: var(--green); box-shadow: 0 0 0 3px color-mix(in srgb, var(--green) 12%, transparent); }
.shelf-select > svg:first-child, .search-input > svg { position: absolute; left: 14px; pointer-events: none; flex-shrink: 0; }
.shelf-select select { appearance: none; width: 100%; min-width: 0; max-width: 100%; min-height: 48px; padding: 12px 34px 12px 42px; border: 0; border-radius: inherit; outline: none; background: transparent; color: var(--ink); font: 500 13px var(--font-sans); text-overflow: ellipsis; cursor: pointer; }
.shelf-select select option { background: var(--surface); color: var(--ink); }
.select-chevron { position: absolute; right: 12px; pointer-events: none; }
.library-filters { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px; min-height: 48px; padding: 4px; border: 1px solid var(--line); border-radius: 9px; background: var(--paper); }
.library-filters button { display: flex; justify-content: center; align-items: center; gap: 7px; min-width: 0; min-height: 40px; padding: 8px 7px; border: 0; border-radius: 6px; background: transparent; color: var(--muted); font-size: 12px; font-weight: 500; cursor: pointer; transition: color .15s, background .15s, box-shadow .15s; white-space: nowrap; }
.library-filters button:hover { color: var(--green); background: color-mix(in srgb, var(--green) 7%, transparent); }
.library-filters button[aria-pressed='true'] { color: var(--paper); background: var(--green); box-shadow: 0 2px 5px #00000012; }
.library-filters button > span { display: grid; place-items: center; min-width: 20px; height: 20px; padding: 0 5px; border-radius: 5px; background: color-mix(in srgb, currentColor 9%, transparent); font-size: 10px; font-variant-numeric: tabular-nums; }
.library-filters button[aria-pressed='true'] > span { background: color-mix(in srgb, var(--paper) 18%, transparent); }
.library-search { display: block; }
.library-search input { display: block; width: 100%; min-width: 0; min-height: 48px; padding: 12px 14px 12px 42px; border: 0; border-radius: inherit; outline: none; background: transparent; color: var(--ink); font-size: 13px; }
.library-search input::placeholder { color: var(--muted); opacity: .8; }
@media (max-width: 1100px) { .library-toolbar { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 18px; } .shelf-filter { grid-column: 1; grid-row: 1; } .library-search { grid-column: 2; grid-row: 1; } .reading-filter { grid-column: 1 / -1; } }
@media (max-width: 560px) { .library-toolbar { grid-template-columns: minmax(0, 1fr); padding: 18px; gap: 18px; border-radius: 10px; } .shelf-filter, .library-search, .reading-filter { grid-column: 1; grid-row: auto; } .shelf-filter { order: 0; } .library-search { order: 1; } .reading-filter { order: 2; } .library-filters { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; } .library-filters button { min-height: 44px; font-size: 13px; } .shelf-select select, .library-search input { font-size: 16px; } .filter-label { margin-bottom: 8px; } }
@media (prefers-reduced-motion: reduce) { .shelf-select, .search-input, .library-filters button { transition: none; } }
.books-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 26px; }
.book-card { min-width: 0; border: 1px solid var(--line); border-radius: 8px; background: var(--surface); overflow: hidden; transition: transform .2s, box-shadow .2s; }
.book-card:hover { transform: translateY(-3px); box-shadow: 0 10px 25px #0000000d; }
.book-cover { aspect-ratio: 4/4.7; position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 16px; padding: 28px 26px; background: #234d3e; color: #f4f1dc; border-left: 8px solid #0002; }
.cover-1 { background: #ded8c5; color: #343d34; }
.cover-2 { background: #913f32; color: #fff0d8; }
.cover-3 { background: #283f4b; color: #e6e5d5; }
.cover-format { font: 8px/1.6 var(--mono); letter-spacing: .14em; z-index: 1; }
.cover-title { font: 500 clamp(21px, 2.2vw, 29px)/1.12 var(--display); letter-spacing: -.04em; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 5; -webkit-box-orient: vertical; overflow: hidden; z-index: 1; }
.cover-author { font-size: 11px; opacity: .75; z-index: 1; }
.cover-mark { margin-top: auto; font: 600 34px var(--display); z-index: 1; }
.cover-lines { position: absolute; width: 240px; height: 240px; border: 1px solid currentColor; border-radius: 50%; right: -110px; bottom: -100px; box-shadow: 0 0 0 15px #ffffff09, 0 0 0 30px #ffffff09, 0 0 0 45px #ffffff09, 0 0 0 60px #ffffff09; opacity: .4; }
.book-details { padding: 20px; }
.book-status { display: inline-flex; align-items: center; gap: 6px; font: 9px var(--mono); color: var(--muted); }
.book-status i { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
.book-status.reading { color: var(--orange); }
.book-status.read { color: var(--green); }
.book-details h2 { font-size: 17px; line-height: 1.35; letter-spacing: -.025em; margin: 12px 0 6px; overflow-wrap: anywhere; }
.book-details > p { margin: 0; color: var(--muted); font-size: 12px; overflow-wrap: anywhere; }
.book-page { min-height: 36px; margin-top: 16px; color: var(--muted); font-size: 10px; line-height: 1.6; }
.book-status-label { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 4px; padding-block: 12px; border-top: 1px solid var(--line); color: var(--muted); font-size: 10px; }
.book-status-label select { max-width: 100%; min-height: 36px; padding: 6px; border: 1px solid var(--line); border-radius: 4px; font: 11px var(--font-sans); background: var(--paper); color: var(--ink); }
.book-read { width: 100%; display: flex; align-items: center; justify-content: space-between; min-height: 44px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 5px; background: transparent; color: var(--green); font: 500 12px var(--font-sans); cursor: pointer; }
.book-read:hover { border-color: var(--green); }
.upload-dialog { width: min(680px, calc(100vw - 32px)); max-height: calc(100dvh - 48px); margin: auto; padding: 0; overflow-y: auto; overscroll-behavior: contain; border: 1px solid var(--line); border-radius: 16px; color: var(--ink); background: var(--surface); box-shadow: 0 24px 90px #0004; }
.upload-dialog::backdrop { background: #08130db3; backdrop-filter: blur(5px); }
.upload-modal-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.upload-close { flex-shrink: 0; width: 44px; padding: 0; border-radius: 50%; }
.library-upload { display: grid; gap: 20px; min-width: 0; padding: 30px; margin: 0; }
.library-upload > p { margin: 0; }
.library-upload input[type='file'] { min-width: 0; font-size: 12px; }
.library-upload input[type='file']::file-selector-button { max-width: 100%; margin-right: 8px; padding: 8px; border: 1px solid var(--line); border-radius: 4px; background: var(--surface); color: var(--green); font: inherit; }
@media (max-width: 640px) { .upload-dialog { width: calc(100vw - 24px); max-height: calc(100dvh - 24px); border-radius: 12px; } .upload-dialog .upload-fields { grid-template-columns: minmax(0, 1fr); } .upload-dialog input:not([type='file']) { font-size: 16px; } .upload-actions > button { flex: 1; } }
.library-upload h2 { margin: 8px 0; font-size: 24px; }
.library-upload p:not(.eyebrow) { color: var(--muted); font-size: 13px; line-height: 1.7; }
.library-upload label { display: grid; gap: 10px; color: var(--muted); font-size: 12px; }
.library-upload input { width: 100%; min-height: 44px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 5px; background: var(--paper); color: var(--ink); }
.library-upload input[type='file'] { padding: 18px; border-style: dashed; }
.upload-label-heading { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.upload-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
.upload-actions { display: flex; flex-wrap: wrap; gap: 12px; }
.library-error, .library-notice { border: 1px solid var(--line); border-radius: 5px; padding: 14px 18px; font-size: 13px; line-height: 1.7; background: var(--surface); }
.library-error { color: var(--orange); }
.library-error button { min-height: 44px; border: 0; color: var(--green); background: transparent; text-decoration: underline; cursor: pointer; }
.library-notice { color: var(--green); }
.library-reader { border: 1px solid var(--line); border-radius: 8px; background: var(--surface); overflow: hidden; margin-block: 28px; }
.reader-top { padding: 20px 24px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.reader-top h2 { margin: 8px 0 0; font-size: 24px; overflow-wrap: anywhere; scroll-margin-top: 20px; }
.reader-controls { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; padding: 16px 24px; border-top: 1px solid var(--line); font-size: 12px; }
.reader-controls form { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.reader-controls input { width: 84px; min-height: 44px; margin-left: 6px; padding: 8px; border: 1px solid var(--line); border-radius: 4px; background: var(--paper); color: var(--ink); }
.reader-hint { padding: 0 24px; font-size: 11px; color: var(--muted); line-height: 1.7; }
.library-reader iframe { display: block; width: 100%; height: 75vh; min-height: 400px; border: 0; background: #343434; }
.library-empty { text-align: center; padding: 70px 24px; border: 1px dashed var(--line); border-radius: 8px; color: var(--muted); }
.library-empty > span { font-size: 48px; color: var(--green); }
.library-empty h2 { color: var(--ink); font-size: 26px; letter-spacing: -.04em; }
.library-empty p { max-width: 400px; margin: 0 auto 24px; font-size: 14px; line-height: 1.8; }
.library-footer { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 16px; border-top: 1px solid var(--line); margin-top: 40px; padding-top: 20px; color: var(--muted); font: 9px var(--mono); letter-spacing: .04em; }
.load-more { display: flex; margin: 30px auto 0; }
.library-gate { display: flex; align-items: center; flex-direction: column; padding: 64px 16px 80px; text-align: center; }
.library-gate h1 { margin: 18px 0 20px; font-size: clamp(38px, 6vw, 64px); line-height: 1.05; letter-spacing: -.055em; }
.library-gate > p:not(.eyebrow) { max-width: 440px; color: var(--muted); font-size: 15px; line-height: 1.85; }
.library-gate > .library-primary { margin: 16px 0 20px; padding-inline: 24px; }
.library-gate > small { color: var(--muted); font-size: 11px; }
.library-gate > a { margin-top: 30px; font-size: 12px; }
.google-letter { display: grid; place-items: center; width: 24px; height: 24px; background: var(--surface); color: var(--green); border-radius: 50%; font-weight: 700; }
.library-symbol { font-size: 50px; color: var(--green); }
.gate-art { display: flex; align-items: flex-end; justify-content: center; position: relative; width: 200px; height: 140px; margin-bottom: 35px; border-bottom: 2px solid var(--line); }
.gate-art > span { width: 35px; height: 100px; background: #234d3e; border-radius: 4px 4px 0 0; border-left: 5px solid #0002; margin: 0 3px; box-shadow: inset 0 14px #fff1, inset 0 -14px #fff1; }
.gate-art > span:nth-child(2) { height: 122px; background: #c7baa0; }
.gate-art > span:nth-child(3) { height: 110px; background: #913f32; transform: rotate(12deg); transform-origin: bottom; margin-left: 8px; }
.gate-art b { position: absolute; right: 6px; bottom: -14px; border: 1px solid var(--line); border-radius: 50%; background: var(--surface); color: var(--green); width: 45px; height: 45px; display: grid; place-items: center; font-size: 24px; }
@media (max-width: 1000px) { .books-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; } .library-stats > p { padding-inline: 20px; } }
@media (max-width: 760px) { .books-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .library-stats { grid-template-columns: repeat(3, 1fr); } .library-stats > p { display: none; } .library-stats > div:last-of-type { border: 0; } .library-intro { align-items: flex-start; flex-direction: column; padding-top: 32px; } .library-account { flex-wrap: wrap; } .library-search { width: 100%; } .library-search input { width: 100%; } .cover-title { font-size: 25px; } }
@media (max-width: 480px) { .books-grid { grid-template-columns: 1fr; gap: 24px; } .book-card { display: flex; flex-direction: column; } .book-cover { aspect-ratio: auto; min-height: 230px; padding: 24px; gap: 12px; border-left-width: 6px; } .cover-title { font-size: clamp(22px, 6vw, 28px); line-height: 1.2; -webkit-line-clamp: 4; } .cover-format { font-size: 8px; } .cover-author { font-size: 11px; } .cover-mark { font-size: 28px; } .book-details { padding: 20px; } .book-details h2 { font-size: 19px; line-height: 1.4; } .book-owner { font-size: 12px; } .book-details > p { font-size: 13px; } .book-page { min-height: auto; margin-bottom: 18px; font-size: 12px; } .book-status-label { font-size: 12px; padding-block: 14px; } .book-status-label select { min-height: 44px; font-size: 14px; padding-inline: 12px; } .book-read { min-height: 48px; font-size: 14px; padding-inline: 14px; } .library-stats > div { padding: 16px 10px; } .library-stats div > span { font-size: 8px; } .library-stats strong { font-size: 30px; } .library-stats small { font-size: 10px; } .upload-fields { grid-template-columns: 1fr; } .library-upload { padding: 20px; } .reader-top { align-items: flex-start; flex-direction: column; } }
@media (prefers-reduced-motion: reduce) { .book-card { transition: none; } }
</style>
