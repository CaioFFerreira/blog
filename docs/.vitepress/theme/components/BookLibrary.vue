<script setup lang="ts">
import BaseModal from './BaseModal.vue'
import ModalHeader from './ModalHeader.vue'
import RequestLoading from './RequestLoading.vue'
import ToastNotice from './ToastNotice.vue'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { withBase } from 'vitepress'
import { useAuth } from '../composables/useAuth'
import { getSupabase } from '../supabase'
import LibraryFriends from './LibraryFriends.vue'
import PdfReader from './PdfReader.vue'
import PageComments from './PageComments.vue'
import { pdfSizeLabel, uploadErrorMessage, type UploadStage } from '../upload-errors'
import { bookFields, withReadingProgress, type BookVisibility, type BookWithProgress, type LibraryFriend, normalizeSearch, pdfBucket, validatePdf, type LibraryBook, type ReadingStatus } from '../library'

const { user, ready, busy: authBusy, accountName, signIn } = useAuth()
const readerPageReady = ref(false)
const readerInitialPage = ref(1)
const readerOpenComments = ref(false)
const books = ref<LibraryBook[]>([])
const friends = ref<LibraryFriend[]>([])
const activeTab = ref<'books' | 'friends'>('books')
const libraryTabs = [{ value: 'books', label: 'Livros' }, { value: 'friends', label: 'Amigos' }] as const
function selectTab(tab: 'books' | 'friends') {
  if (tab === 'friends') {
    closeUpload()
    closeReader()
  }
  activeTab.value = tab
}
function navigateTabs(event: KeyboardEvent) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  const tab = event.key === 'Home' ? 'books' : event.key === 'End' ? 'friends' : activeTab.value === 'books' ? 'friends' : 'books'
  selectTab(tab)
  nextTick(() => document.getElementById(`library-tab-${tab}`)?.focus())
}
const ownerFilter = ref('mine')
const selectedFriend = computed(() => friends.value.find(friend => friend.other_id === ownerFilter.value) ?? null)
const loading = ref(false)
const error = ref('')
const notice = ref('')
const search = ref('')
const filter = ref<ReadingStatus | 'all'>('all')
const showUpload = ref(false)
function openUpload() {
  if (!user.value || selectedFriend.value) return
  showUpload.value = true
}
function closeUpload() { showUpload.value = false }
const uploading = ref(false)
const title = ref('')
const author = ref('')
const uploadVisibility = ref<BookVisibility>('private')
const savingVisibility = ref<string | null>(null)
const deletingBook = ref<string | null>(null)
const fileInput = ref<HTMLInputElement>()
const file = ref<File | null>(null)
const opening = ref<string | null>(null)
const saving = ref<string | null>(null)
const requestMessage = computed(() => uploading.value ? 'Enviando PDF…' : deletingBook.value ? 'Excluindo livro…' : savingVisibility.value ? 'Atualizando visibilidade…' : saving.value ? 'Salvando sua leitura…' : opening.value ? 'Abrindo PDF…' : loading.value ? 'Carregando biblioteca…' : '')
const activeBook = ref<LibraryBook | null>(null)
const pdfUrl = ref('')
const page = ref(1)
let readerTrigger: HTMLElement | null = null
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

function closeReader(restoreFocus = false) {
  openRequest++
  if (pdfUrl.value) URL.revokeObjectURL(pdfUrl.value)
  pdfUrl.value = ''
  readerPageReady.value = false
  activeBook.value = null
  opening.value = null
  if (restoreFocus) {
    notice.value = ''
    const target = readerTrigger
    void nextTick(() => {
      if (target?.isConnected && target.getClientRects().length) target.focus({ preventScroll: true })
      else document.getElementById('library-tab-books')?.focus({ preventScroll: true })
    })
  }
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
  savingVisibility.value = null
  uploadVisibility.value = 'private'
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
  activeTab.value = 'books'
  ownerFilter.value = 'mine'
  friends.value = []
  resetPrivateState()
  loading.value = false
  if (uid.value) void loadBooks()
}, { immediate: true, flush: 'sync' })
onUnmounted(resetPrivateState)

function visitShelf(friend: LibraryFriend | null) {
  if (friend?.status !== 'accepted' && friend !== null) return
  activeTab.value = 'books'
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
  error.value = ''
  notice.value = ''
  if (!title.value && file.value) title.value = file.value.name.replace(/\.pdf$/i, '').replace(/[_-]/g, ' ')
}
async function uploadBook() {
  const owner = uid.value
  const selected = file.value
  let stage: UploadStage = 'file'
  if (!owner || !selected || requestMessage.value || selectedFriend.value) return
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
    stage = 'catalog'
    const { data, error: insertError } = await client.from('library_books').insert({
      owner_id: owner, title: title.value.trim(), author: author.value.trim(), pdf_path: path, visibility: uploadVisibility.value,
    }).select(bookFields).single()
    if (insertError) {
      await client.storage.from(pdfBucket).remove([path])
      throw insertError
    }
    if (ticket !== generation || uid.value !== owner) return
    books.value.unshift(withReadingProgress(data as BookWithProgress))
    title.value = ''
    author.value = ''
    uploadVisibility.value = 'private'
    file.value = null
    if (fileInput.value) fileInput.value.value = ''
    closeUpload()
    notice.value = 'Livro adicionado à sua biblioteca.'
  } catch (failure) {
    if (ticket === generation) error.value = uploadErrorMessage(failure, stage, selected.size)
  } finally {
    if (ticket === generation) uploading.value = false
  }
}
async function changeVisibility(book: LibraryBook, event: Event) {
  const owner = uid.value
  const select = event.target as HTMLSelectElement
  const visibility = select.value as BookVisibility
  select.value = book.visibility
  if (!owner || book.owner_id !== owner || requestMessage.value || !['private', 'friends'].includes(visibility)) return
  const ticket = generation
  savingVisibility.value = book.id
  error.value = ''
  notice.value = ''
  try {
    const client = await getSupabase(withBase('/'))
    const { data, error: updateError } = await client.from('library_books')
      .update({ visibility }).eq('id', book.id).eq('owner_id', owner).select('visibility').single()
    if (ticket !== generation || uid.value !== owner) return
    if (updateError) throw updateError
    book.visibility = data.visibility
    notice.value = visibility === 'private' ? 'Livro privado. Somente você pode acessá-lo.' : 'Livro compartilhado com seus amigos aceitos.'
  } catch {
    if (ticket === generation) error.value = 'Não foi possível alterar a privacidade do livro. Tente novamente.'
  } finally {
    if (ticket === generation) savingVisibility.value = null
  }
}
async function deleteBook(book: LibraryBook) {
  const owner = uid.value
  if (!owner || book.owner_id !== owner || requestMessage.value) return
  if (!window.confirm(`Excluir “${book.title}”? O PDF, os comentários e o progresso de todos serão apagados. Esta ação não pode ser desfeita.`)) return
  deletingBook.value = book.id
  const ticket = generation
  let fileRemoved = false
  error.value = ''
  notice.value = ''
  try {
    const client = await getSupabase(withBase('/'))
    const { data: path, error: permissionError } = await client.rpc('library_book_deletion_path', { target_book: book.id })
    if (permissionError || !path || path !== book.pdf_path) throw permissionError ?? new Error('Access denied')
    if (uid.value !== owner) return
    const { error: storageError } = await client.storage.from(pdfBucket).remove([path])
    if (storageError) throw storageError
    fileRemoved = true
    const { data, error: deleteError } = await client.from('library_books').delete().eq('id', book.id).eq('owner_id', owner).select('id').single()
    if (deleteError || !data) throw deleteError ?? new Error('Deletion failed')
    if (ticket !== generation || uid.value !== owner) return
    if (activeBook.value?.id === book.id) closeReader()
    books.value = books.value.filter(item => item.id !== book.id)
    notice.value = 'Livro excluído.'
  } catch {
    if (ticket === generation && uid.value === owner) {
      if (fileRemoved && activeBook.value?.id === book.id) closeReader()
      error.value = fileRemoved
        ? 'O PDF foi removido, mas não foi possível apagar o cadastro. Clique em Excluir livro novamente para concluir.'
        : 'Não foi possível excluir o livro. Confira se a migração 006 foi aplicada e tente novamente.'
    }
  } finally {
    deletingBook.value = null
  }
}
async function saveBook(book: LibraryBook, changes: { status?: ReadingStatus; last_page?: number }) {
  const owner = uid.value
  if (!owner || requestMessage.value) return
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
async function openBook(book: LibraryBook, targetPage?: number, openComments = false) {
  const owner = uid.value
  if (!owner || requestMessage.value) return
  const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
  closeReader()
  readerTrigger = trigger
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
    readerInitialPage.value = targetPage ?? book.last_page
    readerOpenComments.value = openComments
    activeBook.value = book
    page.value = readerInitialPage.value
    await nextTick()
    opening.value = null
    if (book.status === 'want_read') void saveBook(book, { status: 'reading' })
  } catch {
    if (ticket === generation && request === openRequest) error.value = 'Não foi possível abrir este PDF. Tente novamente.'
  } finally {
    if (ticket === generation && request === openRequest) opening.value = null
  }
}
function savePage(currentPage = page.value) {
  page.value = currentPage
  if (!activeBook.value || !Number.isInteger(page.value) || page.value < 1 || page.value > 100000) {
    error.value = 'Informe uma página válida, a partir de 1.'
    return
  }
  void saveBook(activeBook.value, { last_page: page.value })
}
const pendingNotification = ref<{ bookId: string; page: number } | null>(null)
function queueNotification(detail: unknown) {
  if (!detail || typeof detail !== 'object') return
  const target = detail as { bookId?: unknown; page?: unknown }
  if (typeof target.bookId !== 'string' || !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(target.bookId)
    || typeof target.page !== 'number' || !Number.isInteger(target.page) || target.page < 1 || target.page > 100000) return
  pendingNotification.value = { bookId: target.bookId, page: target.page }
  const destination = new URL(window.location.href)
  destination.searchParams.set('book', target.bookId)
  destination.searchParams.set('page', String(target.page))
  destination.searchParams.set('comments', '1')
  window.history.replaceState(window.history.state, '', destination.href)
}
function onNotification(event: Event) { queueNotification((event as CustomEvent).detail) }
watch([pendingNotification, uid, requestMessage], async () => {
  const target = pendingNotification.value, owner = uid.value
  if (!target || !owner || requestMessage.value) return
  if (ownerFilter.value !== 'mine') {
    visitShelf(null)
    return
  }
  pendingNotification.value = null
  activeTab.value = 'books'
  const ticket = generation
  opening.value = target.bookId
  error.value = ''
  try {
    const client = await getSupabase(withBase('/'))
    const { data, error: failure } = await client.from('library_books')
      .select(`${bookFields},reading:library_reading_progress(status,last_page)`)
      .eq('id', target.bookId).eq('owner_id', owner).single()
    if (ticket !== generation || uid.value !== owner) return
    if (failure || !data) throw failure ?? new Error('Book unavailable')
    opening.value = null
    await openBook(withReadingProgress(data as unknown as BookWithProgress), target.page, true)
  } catch {
    if (ticket === generation && uid.value === owner) error.value = 'Não foi possível abrir o livro desta notificação. Ele pode ter sido excluído. Atualize sua biblioteca e tente novamente.'
  } finally {
    if (ticket === generation) opening.value = null
  }
})
onMounted(() => {
  window.addEventListener('library:open-notification', onNotification)
  const parameters = new URL(window.location.href).searchParams
  if (parameters.get('comments') === '1') queueNotification({ bookId: parameters.get('book'), page: Number(parameters.get('page')) })
})
onUnmounted(() => window.removeEventListener('library:open-notification', onNotification))
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
    <button data-action="primary" class="ui-action library-primary" type="button" :disabled="authBusy" @click="signIn('/livros.html')">
      <span class="google-letter action-icon" aria-hidden="true">G</span>{{ authBusy ? 'Entrando…' : 'Entrar com Google' }}
    </button>
    <small>Seus livros e suas marcações ficam na sua conta.</small>
    <a :href="withBase('/')">← Voltar aos artigos</a>
  </section>
  <section v-else class="book-library">
    <RequestLoading :message="requestMessage" />
    <div class="library-account">
      <span><i aria-hidden="true"></i>BIBLIOTECA PRIVADA</span>
    </div>
    <div class="library-tabs" role="tablist" aria-label="Biblioteca" @keydown="navigateTabs">
      <button v-for="tab in libraryTabs" :id="`library-tab-${tab.value}`" :key="tab.value" type="button" role="tab" :aria-selected="activeTab === tab.value" :aria-controls="`library-panel-${tab.value}`" :tabindex="activeTab === tab.value ? 0 : -1" @click="selectTab(tab.value)">{{ tab.label }}</button>
    </div>
    <section v-show="activeTab === 'friends'" id="library-panel-friends" class="library-friends-panel" role="tabpanel" aria-labelledby="library-tab-friends" tabindex="0">
      <LibraryFriends @visit="visitShelf" @refreshed="refreshFriends" />
    </section>
    <section v-show="activeTab === 'books'" id="library-panel-books" role="tabpanel" aria-labelledby="library-tab-books" tabindex="0">
    <header class="library-intro">
      <div><p class="eyebrow">{{ selectedFriend ? 'UMA ESTANTE AMIGA' : 'SEU PRÓXIMO CAPÍTULO' }}</p><h1 v-if="selectedFriend">Estante de <em>{{ selectedFriend.display_name }}.</em></h1><h1 v-else-if="ownerFilter === 'all'">Todas as estantes, <em>boas leituras.</em></h1><h1 v-else>Sua estante, <em>seu ritmo.</em></h1><p>{{ selectedFriend ? 'Explore os livros do seu amigo. As páginas salvas e os status abaixo são seus, sem alterar a leitura dele.' : `Olá, ${firstName}. Que tal reservar um tempo para uma boa leitura?` }}</p></div>
      <button data-action="open" v-if="!selectedFriend" class="ui-action library-primary" type="button" aria-haspopup="dialog" aria-controls="upload-book" @click="openUpload"><span class="action-icon" aria-hidden="true">+</span>Adicionar livro</button>
    </header>
    <div v-if="selectedFriend" class="shared-shelf-note"><span>Compartilhada por {{ selectedFriend.display_name }} · Seu progresso é individual.</span><button data-action="navigate" class="ui-action library-secondary" type="button" @click="visitShelf(null)"><span class="action-icon" aria-hidden="true">←</span>Minha estante</button></div>
    <div class="library-stats" aria-label="Resumo da biblioteca">
      <div><span>NA ESTANTE</span><strong>{{ counts.all.toString().padStart(2, '0') }}</strong><small>livros para explorar</small></div>
      <div><span>EM ANDAMENTO</span><strong>{{ counts.reading.toString().padStart(2, '0') }}</strong><small>capítulos acontecendo</small></div>
      <div><span>CONCLUÍDOS</span><strong>{{ counts.read.toString().padStart(2, '0') }}</strong><small>histórias que ficam</small></div>
      <p>Uma página de cada vez.<br><em>O importante é continuar.</em><span aria-hidden="true">✳</span></p>
    </div>
    <BaseModal v-if="!selectedFriend" v-model="showUpload" id="upload-book" class="upload-dialog" aria-labelledby="upload-title" aria-describedby="upload-description">
    <form class="library-upload modal-form" @submit.prevent="uploadBook">
      <ModalHeader class="upload-modal-heading" close-label="Fechar janela de adicionar livro" @close="closeUpload"><p class="eyebrow">MAIS UM NA ESTANTE</p><h2 id="upload-title">Adicione sua próxima leitura</h2></ModalHeader>
      <div class="upload-modal-body modal-body">
      <p id="upload-description">Escolha um PDF de até 50 MB. Escolha quem pode ler este livro. As marcações de leitura são sempre individuais.</p>
      <label class="pdf-picker">Arquivo PDF<input ref="fileInput" type="file" accept=".pdf,application/pdf" required :disabled="uploading" @change="chooseFile"><small v-if="file">{{ file.name }} · {{ pdfSizeLabel(file.size) }} de 50 MB</small></label>
      <div class="upload-fields"><label>Título<input v-model="title" autofocus maxlength="200" required :disabled="uploading" placeholder="Como se chama o livro?"></label><label><span class="upload-label-heading">Autor <small>(opcional)</small></span><input v-model="author" maxlength="200" :disabled="uploading" placeholder="Quem escreveu?"></label></div>
      <fieldset class="upload-privacy" :disabled="uploading"><legend>Quem pode ler este livro?</legend><label><input v-model="uploadVisibility" type="radio" value="private"><span><strong>Privado</strong><small>Somente você pode ver e ler.</small></span></label><label><input v-model="uploadVisibility" type="radio" value="friends"><span><strong>Compartilhado com amigos</strong><small>Apenas seus amigos aceitos. Exige login.</small></span></label></fieldset>
      <ToastNotice v-if="showUpload" :model-value="error" kind="error" />
      </div>
      <div class="upload-actions modal-footer"><button data-action="primary" class="ui-action library-primary" type="submit" :disabled="uploading || !file">{{ uploading ? 'Enviando PDF…' : 'Guardar na biblioteca' }}</button><button data-action="ghost" class="ui-action library-secondary" type="button" @click="closeUpload">{{ uploading ? 'Fechar' : 'Cancelar' }}</button></div>
    </form>
    </BaseModal>
    <ToastNotice v-if="!showUpload && !activeBook" :model-value="error" kind="error" />
    <button data-action="ghost" v-if="error && !books.length && !uploading" class="ui-action library-secondary" type="button" @click="loadBooks"><span class="action-icon" aria-hidden="true">↻</span>Tentar novamente</button>
    <ToastNotice v-if="!activeBook" v-model="notice" />
    <BaseModal v-if="activeBook && pdfUrl" :model-value="true" fullscreen class="library-reader" aria-labelledby="reader-title" aria-describedby="reader-owner" @update:model-value="open => { if (!open) closeReader(true) }">
      <ModalHeader class="reader-top" close-label="Fechar leitor" @close="closeReader(true)"><div class="reader-title-group"><h2 id="reader-title" :title="activeBook.title">{{ activeBook.title }}</h2><p id="reader-owner" class="reader-owner">Da estante de {{ bookOwnerName(activeBook.owner_id) }}</p></div></ModalHeader>
      <div class="reader-content modal-body">
        <PdfReader :key="pdfUrl" :url="pdfUrl" :initial-page="readerInitialPage" :title="activeBook.title" fill @page-change="page = $event" @ready="readerPageReady = $event" />
      </div>
      <footer class="reader-footer modal-footer">
        <PageComments :key="pdfUrl" :book-id="activeBook.id" :page="page" :book-title="activeBook.title" :disabled="!readerPageReady" :auto-open="readerOpenComments" />
        <button class="ui-action reader-save" data-action="primary" type="button" :disabled="!readerPageReady || !!saving" :aria-label="`Salvar página ${page}`" @click="savePage(page)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 3h12l4 4v14H3V3h2Zm2 0v6h10V3M7 21v-8h10v8" /></svg>{{ saving ? 'Salvando…' : 'Salvar' }}</button>
      </footer>
      <ToastNotice :model-value="error" kind="error" />
      <ToastNotice v-model="notice" />
    </BaseModal>
    <div class="library-toolbar" role="region" aria-label="Filtros da biblioteca">
      <label class="shelf-filter"><span class="filter-label">Estante</span><span class="shelf-select"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 4h6v16H4zM14 4h6v16h-6zM4 8h6M14 8h6" /></svg><select :value="ownerFilter" aria-label="Filtrar livros por dono" @change="changeShelf"><option value="mine">Minha estante</option><option value="all">Todas as estantes</option><option v-for="friend in friends" :key="friend.other_id" :value="friend.other_id">{{ friend.display_name }}</option></select><svg class="select-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></span></label>
      <div class="reading-filter"><span class="filter-label">Sua leitura</span><div class="library-filters" role="group" aria-label="Filtrar por leitura"><button v-for="item in filters" :key="item.value" type="button" :aria-pressed="filter === item.value" @click="filter = item.value">{{ item.label }}<span>{{ counts[item.value] }}</span></button></div></div>
      <label class="library-search"><span class="filter-label">Buscar livro</span><span class="search-input"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></svg><input v-model="search" type="search" aria-label="Buscar livros por título ou autor" placeholder="Título ou autor…"></span></label>
    </div>
    <p v-if="loading" class="library-empty" role="status">Buscando suas próximas leituras…</p>
    <div v-else-if="!books.length && !error" class="library-empty"><span aria-hidden="true">▤</span><h2>{{ selectedFriend ? 'Esta estante ainda não tem livros.' : 'Sua estante começa com um livro.' }}</h2><p>{{ selectedFriend ? 'Quando seu amigo adicionar um PDF, ele aparecerá aqui para você.' : 'Adicione seu primeiro PDF e encontre aqui um cantinho para ler no seu ritmo.' }}</p><button data-action="open" v-if="!selectedFriend" class="ui-action library-primary" type="button" aria-haspopup="dialog" aria-controls="upload-book" @click="openUpload"><span class="action-icon" aria-hidden="true">+</span>Adicionar meu primeiro livro</button></div>
    <div v-else-if="!filtered.length && !error" class="library-empty"><h2>Nenhum livro por aqui.</h2><p>Experimente outro título, autor ou filtro de leitura.</p><button data-action="ghost" class="ui-action library-secondary" type="button" @click="search = ''; filter = 'all'">Limpar filtros</button></div>
    <div v-else class="books-grid">
      <article v-for="(book, index) in visibleBooks" :key="book.id" class="book-card">
        <div class="book-cover" :class="`cover-${index % 4}`"><span class="cover-format" aria-hidden="true">PDF</span><h2 class="cover-title">{{ book.title }}</h2><span v-if="book.author" class="cover-author">{{ book.author }}</span><span class="cover-mark" aria-hidden="true">c.</span><span class="cover-lines" aria-hidden="true"></span></div>
        <div class="book-details"><span class="book-owner">{{ book.owner_id === uid ? 'Seu livro' : `De ${bookOwnerName(book.owner_id)}` }}</span><div v-if="book.last_page > 1" class="book-page">Página salva: {{ book.last_page }}</div>
          <div class="book-preferences">
            <label class="book-status-label"><span class="book-control-title">Leitura</span><span class="book-select"><select :value="book.status" :disabled="!!saving" :aria-label="`Status de leitura de ${book.title}`" @change="changeStatus(book, $event)"><option value="want_read">Quero ler</option><option value="reading">Lendo</option><option value="read">Lido</option></select><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></span></label>
            <label v-if="book.owner_id === uid" class="book-status-label book-visibility-control"><span class="book-control-title">Visibilidade</span><span class="book-select"><select :value="book.visibility" :disabled="!!savingVisibility" :aria-label="`Privacidade de ${book.title}`" @change="changeVisibility(book, $event)"><option value="private">Privado</option><option value="friends">Amigos</option></select><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></span></label>
          </div>
          <button data-action="open" class="ui-action book-read" type="button" :disabled="opening === book.id" @click="openBook(book)">{{ opening === book.id ? 'Abrindo PDF…' : book.status === 'reading' ? 'Continuar leitura' : 'Abrir livro' }}<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 5v15m0-15C9 3 5 3 3 4v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-2-1-6-1-9 1Z" /></svg></button>
          <button data-action="danger" v-if="book.owner_id === uid" class="ui-action book-delete" type="button" :disabled="!!deletingBook" :aria-label="`Excluir livro ${book.title}`" @click="deleteBook(book)">{{ deletingBook === book.id ? 'Excluindo…' : 'Excluir livro' }}</button>
        </div>
      </article>
    </div>
    <button data-action="ghost" v-if="visibleCount < filtered.length" class="ui-action library-secondary load-more" type="button" @click="visibleCount += 12">Mostrar mais livros</button>
    <footer class="library-footer"><span>SEU ESPAÇO PARA LER E DESCOBRIR.</span><span>{{ filtered.length }} {{ filtered.length === 1 ? 'livro' : 'livros' }} na seleção</span></footer>
    </section>
  </section>
</template>

<style scoped>
.reader-title-group { flex: 1; min-width: 0; }
.reader-title-group h2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.reader-title-group .reader-owner { margin: 4px 0 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.library-reader :deep(.reader-content.modal-body) { display: flex; padding: 0; overflow: hidden; scrollbar-gutter: auto; }
.reader-footer :deep(.page-comments) { flex: 1; min-width: 0; padding: 0; border: 0; }
.reader-footer :deep(.comments-trigger) { max-width: 100%; text-align: left; justify-content: flex-start; }
.reader-save { margin-left: auto; flex-shrink: 0; }
@media (max-width: 640px) {
  .library-reader :deep(.reader-footer.modal-footer) { flex-direction: column; align-items: stretch; }
  .reader-footer :deep(.page-comments), .reader-footer :deep(.comments-trigger), .reader-save { width: 100%; }
  .reader-save { margin-left: 0; }
}

.book-delete { width: 100%; min-height: 44px; margin-top: 8px; padding: 10px 12px; border: 1px solid color-mix(in srgb, var(--orange) 35%, transparent); border-radius: 0; background: transparent; color: var(--orange); font: 500 12px var(--font-sans); cursor: pointer; }
.book-delete:hover:not(:disabled) { background: color-mix(in srgb, var(--orange) 10%, transparent); }
.book-delete:disabled { opacity: .6; cursor: default; }
.library-tabs { display: flex; gap: 6px; margin-top: 24px; padding: 5px; width: fit-content; max-width: 100%; border: 1px solid var(--line); border-radius: 0; background: var(--surface); }
.library-tabs button { min-height: 44px; min-width: 120px; padding: 10px 24px; border: 0; border-radius: 0; background: transparent; color: var(--muted); font: inherit; cursor: pointer; }
.library-tabs button[aria-selected="true"] { background: var(--green); color: var(--paper); }
.library-tabs button:focus-visible { outline: 2px solid var(--green); outline-offset: 3px; }
.library-friends-panel { padding-top: 32px; }
@media (max-width: 480px) { .library-tabs { width: 100%; box-sizing: border-box; } .library-tabs button { flex: 1; min-width: 0; } }
.upload-privacy { min-width: 0; margin: 0; padding: 16px; border: 1px solid var(--line); border-radius: 0; }
.upload-privacy legend { padding-inline: 6px; color: var(--muted); font-size: 12px; }
.library-upload .upload-privacy label { display: flex; align-items: center; gap: 12px; padding: 10px 0; cursor: pointer; }
.library-upload .upload-privacy input { width: 20px; min-height: 20px; height: 20px; margin: 0; padding: 0; flex-shrink: 0; accent-color: var(--green); }
.upload-privacy label > span { display: grid; gap: 5px; }
.upload-privacy strong { color: var(--ink); font-size: 13px; font-weight: 500; }
.upload-privacy small { color: var(--muted); font-size: 11px; line-height: 1.6; }
.book-owner { display: flex; align-items: flex-start; gap: 6px; margin: 10px 0; color: var(--green); font-size: 11px; line-height: 1.6; overflow-wrap: anywhere; }
.reader-owner { color: var(--muted); font-size: 12px; line-height: 1.6; }
.shared-shelf-note { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; padding: 18px; margin-bottom: 24px; border: 1px solid var(--line); border-radius: 0; color: var(--muted); font-size: 12px; }
.book-library { padding: 28px 0 48px; }
.library-account, .library-account > span { display: flex; align-items: center; gap: 10px; }
.library-account { justify-content: space-between; padding-bottom: 22px; border-bottom: 1px solid var(--line); }
.library-account > span { color: var(--muted); font: 10px var(--mono); letter-spacing: .06em; }
.library-account i { width: 6px; height: 6px; border-radius: 0; background: var(--green); }
.library-intro { display: flex; justify-content: space-between; align-items: center; gap: 24px; padding: 50px 0 34px; }
.library-intro h1 { font-size: 54px; line-height: 1.12; letter-spacing: -.055em; margin: 12px 0 18px; }
.library-intro p:not(.eyebrow) { margin: 0; color: var(--muted); font-size: 14px; line-height: 1.7; }
.library-primary, .library-secondary { display: inline-flex; align-items: center; justify-content: center; gap: 12px; min-height: 44px; padding: 12px 18px; border: 1px solid var(--green); border-radius: 0; cursor: pointer; font-size: 13px; font-weight: 600; text-decoration: none; }
.library-primary { background: var(--green); color: var(--paper); }
.library-secondary { background: var(--surface); color: var(--green); }
button:disabled { opacity: .55; cursor: default; }
.library-stats { display: grid; grid-template-columns: 1fr 1fr 1fr 1.5fr; border: 1px solid var(--line); border-radius: 0; background: var(--surface); margin-bottom: 34px; overflow: hidden; }
.library-stats > div { padding: 24px; border-right: 1px solid var(--line); display: grid; gap: 8px; }
.library-stats div > span { color: var(--muted); font: 9px var(--mono); letter-spacing: .08em; }
.library-stats strong { color: var(--green); font: 400 38px var(--display); letter-spacing: -.04em; }
.library-stats small { font-size: 11px; color: var(--muted); }
.library-stats > p { position: relative; padding: 20px 30px; margin: 0; display: flex; justify-content: center; flex-direction: column; color: var(--muted); font-size: 13px; line-height: 1.9; }
.library-stats em { color: var(--green); font-style: normal; }
.library-stats p > span { position: absolute; right: 25px; bottom: 14px; font-size: 42px; opacity: .25; }
.library-toolbar { display: grid; grid-template-columns: minmax(190px, .85fr) minmax(350px, 1.6fr) minmax(220px, 1fr); gap: 22px; align-items: end; padding: 22px; margin: 30px 0; border: 1px solid var(--line); border-radius: 0; background: var(--surface); box-shadow: 0 3px 12px #00000003; }
.filter-label { display: block; margin-bottom: 10px; color: var(--muted); font-size: 12px; font-weight: 500; letter-spacing: .01em; line-height: 1.4; }
.shelf-filter, .reading-filter, .library-search { min-width: 0; }
.shelf-select, .search-input { display: flex; align-items: center; position: relative; min-height: 48px; border: 1px solid var(--line); border-radius: 0; background: var(--paper); color: var(--muted); transition: border-color .15s, box-shadow .15s; }
.shelf-select:focus-within, .search-input:focus-within { border-color: var(--green); box-shadow: 0 0 0 3px color-mix(in srgb, var(--green) 12%, transparent); }
.shelf-select > svg:first-child, .search-input > svg { position: absolute; left: 14px; pointer-events: none; flex-shrink: 0; }
.shelf-select select { appearance: none; width: 100%; min-width: 0; max-width: 100%; min-height: 48px; padding: 12px 34px 12px 42px; border: 0; border-radius: 0; outline: none; background: transparent; color: var(--ink); font: 500 13px var(--font-sans); text-overflow: ellipsis; cursor: pointer; }
.shelf-select select option { background: var(--surface); color: var(--ink); }
.select-chevron { position: absolute; right: 12px; pointer-events: none; }
.library-filters { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px; min-height: 48px; padding: 4px; border: 1px solid var(--line); border-radius: 0; background: var(--paper); }
.library-filters button { display: flex; justify-content: center; align-items: center; gap: 7px; min-width: 0; min-height: 40px; padding: 8px 7px; border: 0; border-radius: 0; background: transparent; color: var(--muted); font-size: 12px; font-weight: 500; cursor: pointer; transition: color .15s, background .15s, box-shadow .15s; white-space: nowrap; }
.library-filters button:hover { color: var(--green); background: color-mix(in srgb, var(--green) 7%, transparent); }
.library-filters button[aria-pressed='true'] { color: var(--paper); background: var(--green); box-shadow: 0 2px 5px #00000012; }
.library-filters button > span { display: grid; place-items: center; min-width: 20px; height: 20px; padding: 0 5px; border-radius: 0; background: color-mix(in srgb, currentColor 9%, transparent); font-size: 10px; font-variant-numeric: tabular-nums; }
.library-filters button[aria-pressed='true'] > span { background: color-mix(in srgb, var(--paper) 18%, transparent); }
.library-search { display: block; }
.library-search input { display: block; width: 100%; min-width: 0; min-height: 48px; padding: 12px 14px 12px 42px; border: 0; border-radius: 0; outline: none; background: transparent; color: var(--ink); font-size: 13px; }
.library-search input::placeholder { color: var(--muted); opacity: .8; }
@media (max-width: 1100px) { .library-toolbar { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 18px; } .shelf-filter { grid-column: 1; grid-row: 1; } .library-search { grid-column: 2; grid-row: 1; } .reading-filter { grid-column: 1 / -1; } }
@media (max-width: 560px) { .library-toolbar { grid-template-columns: minmax(0, 1fr); padding: 18px; gap: 18px; border-radius: 0; } .shelf-filter, .library-search, .reading-filter { grid-column: 1; grid-row: auto; } .shelf-filter { order: 0; } .library-search { order: 1; } .reading-filter { order: 2; } .library-filters { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; } .library-filters button { min-height: 44px; } .filter-label { margin-bottom: 8px; } }
@media (prefers-reduced-motion: reduce) { .shelf-select, .search-input, .library-filters button { transition: none; } }
.books-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 26px; }
.book-card { display: flex; flex-direction: column; min-width: 0; border: 1px solid var(--line); border-radius: 0; background: var(--surface); overflow: hidden; transition: transform .2s, box-shadow .2s; }
.book-cover { flex-shrink: 0; aspect-ratio: 4/4.7; position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 16px; padding: 28px 26px; background: #234d3e; color: #f4f1dc; border-left: 8px solid #0002; }
.cover-1 { background: #ded8c5; color: #343d34; }
.cover-2 { background: #913f32; color: #fff0d8; }
.cover-3 { background: #283f4b; color: #e6e5d5; }
.cover-format { font: 8px/1.6 var(--mono); letter-spacing: .14em; z-index: 1; }
.cover-title { margin: 0; font: 500 29px/1.12 var(--display); letter-spacing: -.04em; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 5; -webkit-box-orient: vertical; overflow: hidden; z-index: 1; }
.cover-author { font-size: 11px; opacity: .75; z-index: 1; }
.cover-mark { margin-top: auto; font: 600 34px var(--display); z-index: 1; }
.cover-lines { position: absolute; width: 240px; height: 240px; border: 1px solid currentColor; border-radius: 0; right: -110px; bottom: -100px; box-shadow: 0 0 0 15px #ffffff09, 0 0 0 30px #ffffff09, 0 0 0 45px #ffffff09, 0 0 0 60px #ffffff09; opacity: .4; }
.book-details { display: flex; flex-direction: column; flex: 1; min-width: 0; padding: 20px; }
.book-page { margin: 0 0 4px; color: var(--muted); font-size: 10px; line-height: 1.6; }
.book-preferences { display: grid; gap: 12px; margin-top: auto; padding-top: 14px; }
.book-status-label { display: grid; min-width: 0; gap: 10px; color: var(--ink); font-size: 12px; }
.book-control-title { display: grid; gap: 5px; font-weight: 500; line-height: 1.5; }
.book-visibility-control { padding: 0; }
.book-select { display: block; position: relative; min-width: 0; }
.book-select > svg { position: absolute; top: 50%; right: 12px; transform: translateY(-50%); pointer-events: none; color: var(--muted); }
.book-status-label select { appearance: none; -webkit-appearance: none; width: 100%; min-width: 0; max-width: 100%; min-height: 44px; padding: 10px 36px 10px 10px; border: 1px solid var(--line); border-radius: 0; font: 12px var(--font-sans); background: var(--surface); color: var(--ink); cursor: pointer; }
.book-status-label select:focus-visible { outline-offset: 2px; }
.book-status-label select:disabled { opacity: .6; cursor: default; }
.book-read { margin-top: 16px; width: 100%; display: flex; align-items: center; justify-content: space-between; min-height: 44px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 0; background: var(--green); color: var(--paper); font: 600 12px var(--font-sans); cursor: pointer; }
.book-read { border-color: var(--green); }
.book-read:hover:not(:disabled) { background: color-mix(in srgb, var(--green) 90%, var(--ink)); }
.upload-modal-body { display: grid; gap: 20px; }
.upload-modal-body > p { margin: 0; }
.library-upload > p { margin: 0; }
.library-upload input[type='file'] { min-width: 0; font-size: 12px; }
.library-upload input[type='file']::file-selector-button { max-width: 100%; margin-right: 8px; padding: 8px; border: 1px solid var(--line); border-radius: 0; background: var(--surface); color: var(--green); font: inherit; }
@media (max-width: 640px) { .upload-dialog .upload-fields { grid-template-columns: minmax(0, 1fr); } .upload-actions > button { flex: 1; } }
.library-upload h2 { margin: 8px 0; font-size: 24px; }
.library-upload p:not(.eyebrow) { color: var(--muted); font-size: 13px; line-height: 1.7; }
.library-upload label { display: grid; gap: 10px; color: var(--muted); font-size: 12px; }
.library-upload input { width: 100%; min-height: 44px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 0; background: var(--paper); color: var(--ink); }
.library-upload input[type='file'] { padding: 18px; border-style: dashed; }
.upload-label-heading { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.upload-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
.library-empty { text-align: center; padding: 70px 24px; border: 1px dashed var(--line); border-radius: 0; color: var(--muted); }
.library-empty > span { font-size: 48px; color: var(--green); }
.library-empty h2 { color: var(--ink); font-size: 26px; letter-spacing: -.04em; }
.library-empty p { max-width: 400px; margin: 0 auto 24px; font-size: 14px; line-height: 1.8; }
.library-footer { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 16px; border-top: 1px solid var(--line); margin-top: 40px; padding-top: 20px; color: var(--muted); font: 9px var(--mono); letter-spacing: .04em; }
.load-more { display: flex; margin: 30px auto 0; }
.library-gate { display: flex; align-items: center; flex-direction: column; padding: 64px 16px 80px; text-align: center; }
.library-gate h1 { margin: 18px 0 20px; font-size: 64px; line-height: 1.05; letter-spacing: -.055em; }
.library-gate > p:not(.eyebrow) { max-width: 440px; color: var(--muted); font-size: 15px; line-height: 1.85; }
.library-gate > .library-primary { margin: 16px 0 20px; padding-inline: 24px; }
.library-gate > small { color: var(--muted); font-size: 11px; }
.library-gate > a { margin-top: 30px; font-size: 12px; }
.google-letter { display: grid; place-items: center; width: 24px; height: 24px; background: var(--surface); color: var(--green); border-radius: 0; font-weight: 700; }
.library-symbol { font-size: 50px; color: var(--green); }
.gate-art { display: flex; align-items: flex-end; justify-content: center; position: relative; width: 200px; height: 140px; margin-bottom: 35px; border-bottom: 2px solid var(--line); }
.gate-art > span { width: 35px; height: 100px; background: #234d3e; border-radius: 0; border-left: 5px solid #0002; margin: 0 3px; box-shadow: inset 0 14px #fff1, inset 0 -14px #fff1; }
.gate-art > span:nth-child(2) { height: 122px; background: #c7baa0; }
.gate-art > span:nth-child(3) { height: 110px; background: #913f32; transform: rotate(12deg); transform-origin: bottom; margin-left: 8px; }
.gate-art b { position: absolute; right: 6px; bottom: -14px; border: 1px solid var(--line); border-radius: 0; background: var(--surface); color: var(--green); width: 45px; height: 45px; display: grid; place-items: center; font-size: 24px; }
@media (max-width: 1000px) { .books-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; } .library-stats > p { padding-inline: 20px; } }
@media (max-width: 760px) { .books-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .library-stats { grid-template-columns: repeat(3, 1fr); } .library-stats > p { display: none; } .library-stats > div:last-of-type { border: 0; } .library-intro { align-items: flex-start; flex-direction: column; padding-top: 32px; } .library-account { flex-wrap: wrap; } .library-search { width: 100%; } .library-search input { width: 100%; } }
@media (max-width: 480px) { .books-grid { grid-template-columns: 1fr; gap: 24px; } .book-card { display: flex; flex-direction: column; } .book-cover { aspect-ratio: auto; min-height: 230px; padding: 24px; gap: 12px; border-left-width: 6px; } .cover-title { -webkit-line-clamp: 4; } .book-details { padding: 20px; } .book-page { min-height: auto; margin-bottom: 18px; } .book-read { min-height: 48px; padding-inline: 14px; } .library-stats > div { padding: 16px 10px; } .upload-fields { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) { .book-card { transition: none; } }
</style>
