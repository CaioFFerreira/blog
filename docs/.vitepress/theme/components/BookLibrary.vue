<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { withBase } from 'vitepress'
import { useAuth } from '../composables/useAuth'
import { getSupabase } from '../supabase'
import { normalizeSearch, pdfBucket, statusLabels, validatePdf, type LibraryBook, type ReadingStatus } from '../library'

const { user, ready, busy: authBusy, accountName, errorMessage: authError, signIn } = useAuth()
const books = ref<LibraryBook[]>([])
const loading = ref(false)
const error = ref('')
const notice = ref('')
const search = ref('')
const filter = ref<ReadingStatus | 'all'>('all')
const showUpload = ref(false)
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
  showUpload.value = false
  file.value = null
  if (fileInput.value) fileInput.value.value = ''
  title.value = ''
  author.value = ''
  uploading.value = false
  saving.value = null
}
async function loadBooks() {
  const owner = uid.value
  if (!owner) return
  const ticket = ++generation
  loading.value = true
  error.value = ''
  try {
    const client = await getSupabase(withBase('/'))
    const { data, error: queryError } = await client.from('library_books')
      .select('id,owner_id,title,author,pdf_path,status,last_page,created_at')
      .eq('owner_id', owner).order('created_at', { ascending: false }).limit(1000)
    if (ticket !== generation || uid.value !== owner) return
    if (queryError) throw queryError
    books.value = (data ?? []) as LibraryBook[]
  } catch {
    if (ticket === generation) error.value = 'Não foi possível carregar seus livros. Tente novamente em instantes.'
  } finally {
    if (ticket === generation) loading.value = false
  }
}
watch(uid, () => {
  resetPrivateState()
  loading.value = false
  if (uid.value) void loadBooks()
}, { immediate: true, flush: 'sync' })
onUnmounted(resetPrivateState)

function chooseFile(event: Event) {
  const input = event.target as HTMLInputElement
  file.value = input.files?.[0] ?? null
  if (!title.value && file.value) title.value = file.value.name.replace(/\.pdf$/i, '').replace(/[_-]/g, ' ')
}
async function uploadBook() {
  const owner = uid.value
  const selected = file.value
  if (!owner || !selected || uploading.value) return
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
    }).select().single()
    if (insertError) {
      await client.storage.from(pdfBucket).remove([path])
      throw insertError
    }
    if (ticket !== generation || uid.value !== owner) return
    books.value.unshift(data as LibraryBook)
    title.value = ''
    author.value = ''
    file.value = null
    if (fileInput.value) fileInput.value.value = ''
    showUpload.value = false
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
    const { data, error: updateError } = await client.from('library_books').update(changes)
      .eq('id', book.id).eq('owner_id', owner).select().single()
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
      <div><p class="eyebrow">SEU PRÓXIMO CAPÍTULO</p><h1>Sua estante, <em>seu ritmo.</em></h1><p>Olá, {{ firstName }}. Que tal reservar um tempo para uma boa leitura?</p></div>
      <button class="library-primary" type="button" :aria-expanded="showUpload" aria-controls="upload-book" @click="showUpload = !showUpload"><span aria-hidden="true">+</span> Adicionar livro</button>
    </header>
    <div class="library-stats" aria-label="Resumo da biblioteca">
      <div><span>NA ESTANTE</span><strong>{{ counts.all.toString().padStart(2, '0') }}</strong><small>livros para explorar</small></div>
      <div><span>EM ANDAMENTO</span><strong>{{ counts.reading.toString().padStart(2, '0') }}</strong><small>capítulos acontecendo</small></div>
      <div><span>CONCLUÍDOS</span><strong>{{ counts.read.toString().padStart(2, '0') }}</strong><small>histórias que ficam</small></div>
      <p>Uma página de cada vez.<br><em>O importante é continuar.</em><span aria-hidden="true">✳</span></p>
    </div>
    <form v-if="showUpload" id="upload-book" class="library-upload" @submit.prevent="uploadBook">
      <div><p class="eyebrow">MAIS UM NA ESTANTE</p><h2>Adicione sua próxima leitura</h2><p>Escolha um PDF de até 50 MB. Ele ficará disponível apenas na sua conta.</p></div>
      <label class="pdf-picker">Arquivo PDF<input ref="fileInput" type="file" accept=".pdf,application/pdf" required :disabled="uploading" @change="chooseFile"></label>
      <div class="upload-fields"><label>Título<input v-model="title" maxlength="200" required :disabled="uploading" placeholder="Como se chama o livro?"></label><label>Autor <small>(opcional)</small><input v-model="author" maxlength="200" :disabled="uploading" placeholder="Quem escreveu?"></label></div>
      <div class="upload-actions"><button class="library-primary" type="submit" :disabled="uploading || !file">{{ uploading ? 'Enviando PDF…' : 'Guardar na biblioteca' }}</button><button class="library-secondary" type="button" :disabled="uploading" @click="showUpload = false">Cancelar</button></div>
    </form>
    <p v-if="authError" class="library-error" role="alert">{{ authError }}</p>
    <div v-if="error" class="library-error" role="alert">{{ error }} <button v-if="!books.length && !uploading" type="button" @click="loadBooks">Tentar novamente</button></div>
    <p v-if="notice" class="library-notice" role="status">{{ notice }}</p>
    <section v-if="activeBook && pdfUrl" class="library-reader" aria-label="Leitor de PDF">
      <div class="reader-top"><div><p class="eyebrow">MODO LEITURA</p><h2 ref="readerHeading" tabindex="-1">{{ activeBook.title }}</h2></div><button class="library-secondary" type="button" @click="closeReader">Fechar leitor ×</button></div>
      <div class="reader-controls"><form @submit.prevent="savePage"><label>Última página <input v-model.number="page" type="number" min="1" max="100000" required></label><button class="library-secondary" type="submit" :disabled="!!saving">Salvar página</button></form><a :href="pdfUrl" target="_blank" rel="noopener">Abrir PDF em outra aba ↗</a></div>
      <p class="reader-hint">Anote e salve a página antes de sair. Se o leitor não aparecer no seu dispositivo, abra o PDF em outra aba.</p>
      <iframe :key="pdfUrl" :src="`${pdfUrl}#page=${activeBook.last_page}`" :title="`Ler ${activeBook.title}`"></iframe>
    </section>
    <div class="library-toolbar">
      <div class="library-filters" role="group" aria-label="Filtrar por leitura"><button v-for="item in filters" :key="item.value" type="button" :aria-pressed="filter === item.value" @click="filter = item.value">{{ item.label }}<span>{{ counts[item.value] }}</span></button></div>
      <label class="library-search"><span aria-hidden="true">⌕</span><input v-model="search" type="search" aria-label="Buscar livros por título ou autor" placeholder="Buscar na estante…"></label>
    </div>
    <p v-if="loading" class="library-empty" role="status">Buscando suas próximas leituras…</p>
    <div v-else-if="!books.length && !error" class="library-empty"><span aria-hidden="true">▤</span><h2>Sua estante começa com um livro.</h2><p>Adicione seu primeiro PDF e encontre aqui um cantinho para ler no seu ritmo.</p><button class="library-primary" type="button" @click="showUpload = true">+ Adicionar meu primeiro livro</button></div>
    <div v-else-if="!filtered.length && !error" class="library-empty"><h2>Nenhum livro por aqui.</h2><p>Experimente outro título, autor ou filtro de leitura.</p><button class="library-secondary" type="button" @click="search = ''; filter = 'all'">Limpar filtros</button></div>
    <div v-else class="books-grid">
      <article v-for="(book, index) in visibleBooks" :key="book.id" class="book-card">
        <div class="book-cover" :class="`cover-${index % 4}`" aria-hidden="true"><span class="cover-format">BIBLIOTECA PESSOAL / PDF</span><span class="cover-title">{{ book.title }}</span><span class="cover-author">{{ book.author || 'Uma nova leitura' }}</span><span class="cover-mark">c.</span><span class="cover-lines"></span></div>
        <div class="book-details"><span class="book-status" :class="book.status"><i></i>{{ statusLabels[book.status] }}</span><h2>{{ book.title }}</h2><p>{{ book.author || 'Autor não informado' }}</p><div class="book-page">{{ book.status === 'read' ? 'Leitura concluída ✓' : book.last_page > 1 ? `Última página salva: ${book.last_page}` : 'Uma boa leitura espera por você' }}</div>
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
.library-toolbar { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 18px; padding-bottom: 20px; margin: 30px 0; border-bottom: 1px solid var(--line); }
.library-filters { display: flex; flex-wrap: wrap; gap: 4px; }
.library-filters button { min-height: 44px; display: flex; align-items: center; gap: 8px; border: 1px solid transparent; border-radius: 5px; padding: 8px 12px; background: transparent; color: var(--muted); font-size: 12px; cursor: pointer; }
.library-filters button[aria-pressed='true'] { border-color: var(--line); background: var(--surface); color: var(--green); }
.library-filters button > span { font: 10px var(--mono); opacity: .7; }
.library-search { display: flex; align-items: center; gap: 10px; padding: 0 14px; border: 1px solid var(--line); border-radius: 5px; background: var(--surface); color: var(--muted); }
.library-search > span { font-size: 24px; }
.library-search input { min-height: 44px; width: 190px; min-width: 0; border: 0; background: transparent; color: var(--ink); font-size: 13px; }
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
.book-status-label select { max-width: 100%; min-height: 36px; padding: 6px; border: 1px solid var(--line); border-radius: 4px; font: 11px 'DM Sans', sans-serif; background: var(--paper); color: var(--ink); }
.book-read { width: 100%; display: flex; align-items: center; justify-content: space-between; min-height: 44px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 5px; background: transparent; color: var(--green); font: 500 12px 'DM Sans', sans-serif; cursor: pointer; }
.book-read:hover { border-color: var(--green); }
.library-upload { display: grid; gap: 20px; padding: 28px; margin-bottom: 26px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface); }
.library-upload h2 { margin: 8px 0; font-size: 24px; }
.library-upload p:not(.eyebrow) { color: var(--muted); font-size: 13px; line-height: 1.7; }
.library-upload label { display: grid; gap: 10px; color: var(--muted); font-size: 12px; }
.library-upload input { width: 100%; min-height: 44px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 5px; background: var(--paper); color: var(--ink); }
.library-upload input[type='file'] { padding: 18px; border-style: dashed; }
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
@media (max-width: 480px) { .books-grid { grid-template-columns: 1fr; gap: 24px; } .book-card { display: grid; grid-template-columns: 110px minmax(0, 1fr); } .book-cover { aspect-ratio: auto; min-height: 100%; padding: 18px 12px; gap: 12px; border-left-width: 5px; } .cover-title { font-size: 17px; -webkit-line-clamp: 7; } .cover-format { font-size: 6px; } .cover-author { font-size: 9px; } .cover-mark { font-size: 24px; } .book-details { padding: 16px; } .book-details h2 { font-size: 16px; } .library-stats > div { padding: 16px 10px; } .library-stats div > span { font-size: 8px; } .library-stats strong { font-size: 30px; } .library-stats small { font-size: 10px; } .upload-fields { grid-template-columns: 1fr; } .library-upload { padding: 20px; } .reader-top { align-items: flex-start; flex-direction: column; } .library-filters button { padding-inline: 8px; font-size: 11px; } }
@media (prefers-reduced-motion: reduce) { .book-card { transition: none; } }
</style>
