<script setup lang="ts">
import RequestLoading from './RequestLoading.vue'
import ToastNotice from './ToastNotice.vue'
import type { PDFDocumentProxy, PDFDocumentLoadingTask, PDFPageProxy, RenderTask } from 'pdfjs-dist'
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { withBase } from 'vitepress'
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'

const props = defineProps<{ url: string; initialPage: number; title: string; saving?: boolean }>()
const emit = defineEmits<{ pageChange: [page: number]; save: [page: number]; ready: [value: boolean] }>()
const stage = ref<HTMLElement>()
const pages = ref<Array<{ number: number; ratio: number; ready: boolean; text: string }>>([])
const loading = ref(true)
const rendering = ref(false)
const error = ref('')
const currentPage = ref(1)
const pageInput = ref(1)
const totalPages = ref(0)
const passwordRequired = ref(false)
const password = ref('')
const passwordError = ref(false)
let providePassword: ((password: string) => void) | undefined
let pdf: PDFDocumentProxy | null = null
let loadingTask: PDFDocumentLoadingTask | undefined
const renders = new Map<number, { task?: RenderTask; page?: PDFPageProxy }>()
const canvasTasks = new WeakMap<HTMLCanvasElement, Promise<unknown>>()
let visibleKey = ''
let scrollFrame = 0
let observer: ResizeObserver | undefined
let loadVersion = 0
let resizeFrame = 0
let disposed = false

function clearCanvas(number: number) {
  const target = stage.value?.querySelector<HTMLCanvasElement>(`[data-page="${number}"] canvas`)
  if (target) { target.width = 0; target.height = 0 }
  const item = pages.value[number - 1]
  if (item) { item.ready = false; item.text = '' }
}
function cancelPages() {
  for (const number of Array.from(renders.keys())) retirePage(number)
  renders.clear()
  visibleKey = ''
}
function retirePage(number: number) {
  const entry = renders.get(number)
  if (!entry) return
  entry.task?.cancel()
  renders.delete(number)
  clearCanvas(number)
  void (entry.task?.promise ?? Promise.resolve()).catch(() => {}).then(() => {
    if (!renders.has(number)) entry.page?.cleanup()
  })
}
function release() {
  loadVersion++
  cancelPages()
  const previous = loadingTask
  loadingTask = undefined
  pdf = null
  if (previous) void previous.destroy().catch(() => {})
  providePassword = undefined
  password.value = ''
  passwordRequired.value = false
  pages.value = []
}
function updateReady() {
  const ready = !!pages.value[currentPage.value - 1]?.ready
  rendering.value = !!pdf && !ready
  emit('ready', ready)
}
async function renderPage(number: number) {
  const document = pdf
  const target = stage.value?.querySelector<HTMLCanvasElement>(`[data-page="${number}"] canvas`)
  if (!document || !target || disposed || renders.has(number)) return
  const entry: { task?: RenderTask; page?: PDFPageProxy } = {}
  renders.set(number, entry)
  const valid = () => !disposed && pdf === document && renders.get(number) === entry
  try {
    const page = await document.getPage(number)
    if (!valid()) return
    entry.page = page
    const natural = page.getViewport({ scale: 1 })
    const item = pages.value[number - 1]
    item.ratio = natural.height / natural.width
    await nextTick()
    if (!valid()) return
    const width = target.parentElement!.clientWidth
    const viewport = page.getViewport({ scale: Math.max(1, width) / natural.width })
    await canvasTasks.get(target)?.catch(() => {})
    if (!valid()) return
    // Only three nearby pages have allocated canvases, each capped at two million pixels.
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(2_000_000 / (viewport.width * viewport.height)))
    target.width = Math.max(1, Math.floor(viewport.width * pixelRatio))
    target.height = Math.max(1, Math.floor(viewport.height * pixelRatio))
    entry.task = page.render({ canvas: target, viewport, transform: [pixelRatio, 0, 0, pixelRatio, 0, 0] })
    canvasTasks.set(target, entry.task.promise)
    await entry.task.promise
    if (!valid()) return
    item.ready = true
    updateReady()
    const text = await page.getTextContent()
    if (valid()) item.text = text.items.map(item => 'str' in item ? item.str : '').join(' ')
  } catch (failure) {
    if (valid() && !(failure instanceof Error && failure.name === 'RenderingCancelledException')) {
      error.value = 'Não foi possível mostrar esta página. Clique em Tentar novamente para reabrir o leitor.'
      updateReady()
    }
  }
}
function showNearbyPages() {
  if (!pdf || !stage.value) return
  const number = currentPage.value
  const wanted = [number, number - 1, number + 1].filter(page => page >= 1 && page <= totalPages.value)
  const key = wanted.join(',')
  if (key !== visibleKey) {
    visibleKey = key
    for (const page of Array.from(renders.keys())) {
      if (!wanted.includes(page)) retirePage(page)
    }
    for (const page of wanted) void renderPage(page)
  }
  updateReady()
}
function setCurrentPage(number: number) {
  if (currentPage.value !== number) {
    error.value = ''
    currentPage.value = number
    pageInput.value = number
    emit('pageChange', number)
  }
  showNearbyPages()
}
function onScroll() {
  cancelAnimationFrame(scrollFrame)
  scrollFrame = requestAnimationFrame(() => {
    const container = stage.value
    if (!container || !pdf) return
    const marker = container.scrollTop + Math.min(container.clientHeight * .35, 200)
    let number = 1
    for (const element of Array.from(container.querySelectorAll<HTMLElement>('[data-page]'))) {
      if (element.offsetTop > marker) break
      number = Number(element.dataset.page)
    }
    setCurrentPage(number)
  })
}
async function loadDocument() {
  release()
  const ticket = loadVersion
  loading.value = true
  emit('ready', false)
  rendering.value = false
  error.value = ''
  totalPages.value = 0
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    if (ticket !== loadVersion || disposed) return
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
    loadingTask = pdfjs.getDocument({
      url: props.url,
      cMapUrl: withBase('/pdfjs-assets/cmaps/'), cMapPacked: true,
      standardFontDataUrl: withBase('/pdfjs-assets/standard_fonts/'),
      wasmUrl: withBase('/pdfjs-assets/wasm/'),
      iccUrl: withBase('/pdfjs-assets/iccs/'),
    })
    loadingTask.onPassword = (updatePassword: (password: string) => void, reason: number) => {
      if (ticket !== loadVersion || disposed) return
      providePassword = updatePassword
      passwordRequired.value = true
      passwordError.value = reason === 2
      password.value = ''
    }
    const document = await loadingTask.promise
    if (ticket !== loadVersion || disposed) return
    pdf = document
    totalPages.value = document.numPages
    currentPage.value = Math.max(1, Math.min(document.numPages, Math.trunc(props.initialPage) || 1))
    pageInput.value = currentPage.value
    loading.value = false
    await nextTick()
    const first = await document.getPage(currentPage.value)
    if (ticket !== loadVersion || disposed) return
    const viewport = first.getViewport({ scale: 1 })
    pages.value = Array.from({ length: document.numPages }, (_, index) => ({ number: index + 1, ratio: viewport.height / viewport.width, ready: false, text: '' }))
    await nextTick()
    emit('pageChange', currentPage.value)
    navigate(currentPage.value)
  } catch {
    if (ticket === loadVersion && !disposed) {
      loading.value = false
      passwordRequired.value = false
      error.value = 'Não foi possível carregar o PDF no leitor. Verifique sua conexão e clique em Tentar novamente.'
    }
  }
}
function navigate(page: number) {
  if (!pdf || !Number.isInteger(page) || page < 1 || page > totalPages.value) {
    pageInput.value = currentPage.value
    return
  }
  setCurrentPage(page)
  const target = stage.value?.querySelector<HTMLElement>(`[data-page="${page}"]`)
  if (target && stage.value) stage.value.scrollTo({ top: target.offsetTop - 12, left: 0 })
}
function unlock() {
  if (!providePassword || !password.value) return
  const value = password.value
  password.value = ''
  passwordRequired.value = false
  providePassword(value)
}
onMounted(() => {
  let previousWidth = 0
  observer = new ResizeObserver(entries => {
    const width = entries[0]?.contentRect.width ?? 0
    if (Math.abs(width - previousWidth) < 1) return
    previousWidth = width
    cancelAnimationFrame(resizeFrame)
    resizeFrame = requestAnimationFrame(() => {
      if (!pdf) return
      cancelPages()
      void nextTick(() => navigate(currentPage.value))
    })
  })
  if (stage.value) observer.observe(stage.value)
  void loadDocument()
})
watch(() => props.url, () => { if (!disposed) void loadDocument() })
onUnmounted(() => {
  disposed = true
  observer?.disconnect()
  cancelAnimationFrame(resizeFrame)
  cancelAnimationFrame(scrollFrame)
  release()
})
</script>

<template>
  <div class="pdf-reader" :aria-busy="loading || rendering">
    <RequestLoading :message="loading && !passwordRequired ? 'Preparando PDF…' : ''" />
    <div v-if="totalPages" class="pdf-toolbar">
      <div class="pdf-navigation"><form @submit.prevent="navigate(pageInput)"><label><span class="pdf-accessible-text">Página</span><input v-model.number="pageInput" type="number" min="1" :max="totalPages" :disabled="loading" aria-label="Ir para página"></label><span class="pdf-page-count">/ {{ totalPages }}</span><button type="submit" :disabled="loading" aria-label="Ir para a página informada">Ir</button></form></div>
      <button class="pdf-save" type="button" :disabled="loading || rendering || !!error || saving" :aria-label="`Salvar página ${currentPage}`" @click="emit('save', currentPage)">{{ saving ? 'Salvando…' : 'Salvar' }}</button>
    </div>
    <p v-if="loading && !passwordRequired" class="pdf-message" role="status">Preparando o PDF para leitura…</p>
    <form v-if="passwordRequired" class="pdf-password" @submit.prevent="unlock"><label>Este PDF está protegido. Informe a senha do arquivo.<input v-model="password" type="password" autocomplete="off" required></label><ToastNotice :model-value="passwordError ? 'Senha incorreta. Tente novamente.' : ''" kind="error" /><button type="submit">Abrir PDF</button></form>
    <ToastNotice :model-value="error" kind="error" /><div v-if="error" class="pdf-error"><button type="button" @click="loadDocument">Tentar novamente</button></div>
    <p v-if="rendering" class="pdf-rendering" role="status">Carregando página {{ currentPage }}…</p>
    <div ref="stage" class="pdf-stage" tabindex="0" :aria-label="`${title}, leitura contínua, página ${currentPage} de ${totalPages}`" @scroll.passive="onScroll">
      <div v-for="item in pages" :key="item.number" class="pdf-page" :data-page="item.number" :style="{ aspectRatio: `1 / ${item.ratio}` }" :aria-busy="!item.ready">
        <canvas v-show="item.ready" width="0" height="0" role="img" :aria-label="`${title}, página ${item.number}`"></canvas>
        <span v-if="!item.ready" class="page-placeholder">Página {{ item.number }}{{ Math.abs(item.number - currentPage) <= 1 ? ' · carregando…' : '' }}</span>
        <p class="pdf-accessible-text">{{ item.text }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pdf-reader { min-width: 0; }
.pdf-page-count { white-space: nowrap; font-variant-numeric: tabular-nums; }
.pdf-toolbar, .pdf-navigation, .pdf-navigation form { display: flex; align-items: center; gap: 8px; }
.pdf-toolbar { position: sticky; top: env(safe-area-inset-top, 0px); z-index: 30; background: var(--surface); box-shadow: 0 3px 10px #00000012; justify-content: space-between; flex-wrap: wrap; padding: 14px 20px; border-top: 1px solid var(--line); gap: 12px; }
.pdf-navigation { flex-wrap: nowrap; min-width: 0; }
.pdf-save { background: var(--green); color: var(--paper); border-color: var(--green); font-size: 13px; font-weight: 500; }
.pdf-navigation form { font-size: 12px; color: var(--muted); }
.pdf-navigation label { display: flex; align-items: center; gap: 8px; }
.pdf-navigation input { width: 64px; min-height: 44px; padding: 8px; border: 1px solid var(--line); border-radius: 2px; background: var(--paper); color: var(--ink); font-size: 16px; }
button { display: inline-flex; align-items: center; justify-content: center; min-width: 44px; min-height: 44px; padding: 8px 12px; border: 1px solid var(--line); border-radius: 2px; background: var(--paper); color: var(--green); font: inherit; cursor: pointer; }
button:disabled { opacity: .45; cursor: default; }
.pdf-stage { box-sizing: border-box; border-radius: 0 0 2px 2px; position: relative; width: 100%; height: 80dvh; min-height: 240px; padding: 12px; overflow: auto; overscroll-behavior: contain; overflow-anchor: auto; background: #424744; }
.pdf-page { position: relative; width: min(100%, 1400px); margin: 0 auto 16px; background: white; box-shadow: 0 3px 16px #0003; }
.pdf-page:last-child { margin-bottom: 0; }
.pdf-page canvas { position: absolute; inset: 0; display: block; width: 100%; height: 100%; }
.page-placeholder { position: absolute; inset: 0; display: grid; place-items: center; color: #596c5e; font-size: 13px; }
.pdf-message, .pdf-rendering, .pdf-error, .pdf-password { padding: 20px; color: var(--muted); font-size: 13px; line-height: 1.7; }
.pdf-rendering { margin: 0; padding-block: 10px; }
.pdf-error, .pdf-password > p { color: var(--orange); }
.pdf-password { display: grid; gap: 12px; }
.pdf-password label { display: grid; gap: 10px; }
.pdf-password input { width: 100%; min-height: 44px; padding: 10px; border: 1px solid var(--line); border-radius: 2px; background: var(--paper); color: var(--ink); font-size: 16px; }
.pdf-password > button { justify-self: start; }
.pdf-accessible-text { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
@media (max-width: 600px) {
  .pdf-toolbar { padding: 8px 10px; gap: 8px; }
  .pdf-navigation { flex: 1 1 0; min-width: 0; }
  .pdf-navigation form { justify-content: flex-start; min-width: 0; gap: 5px; }
  .pdf-navigation label { min-width: 0; gap: 0; }
  .pdf-navigation input { appearance: textfield; width: 54px; padding: 6px; text-align: center; font-variant-numeric: tabular-nums; }
  .pdf-navigation input::-webkit-inner-spin-button, .pdf-navigation input::-webkit-outer-spin-button { appearance: none; margin: 0; }
  .pdf-save { padding-inline: 10px; }
}

</style>
