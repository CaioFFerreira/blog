<script setup lang="ts">
import type { PDFDocumentProxy, PDFDocumentLoadingTask, RenderTask } from 'pdfjs-dist'
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { withBase } from 'vitepress'
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'

const props = defineProps<{ url: string; initialPage: number; title: string; saving?: boolean }>()
const emit = defineEmits<{ pageChange: [page: number]; save: [page: number]; ready: [value: boolean] }>()
const stage = ref<HTMLElement>()
const canvas = ref<HTMLCanvasElement>()
const loading = ref(true)
const rendering = ref(false)
const error = ref('')
const currentPage = ref(1)
const pageInput = ref(1)
const totalPages = ref(0)
const pageText = ref('')
const passwordRequired = ref(false)
const password = ref('')
const passwordError = ref(false)
let providePassword: ((password: string) => void) | undefined
let pdf: PDFDocumentProxy | null = null
let loadingTask: PDFDocumentLoadingTask | undefined
let renderTask: RenderTask | undefined
let observer: ResizeObserver | undefined
let loadVersion = 0
let renderVersion = 0
let resizeFrame = 0
let disposed = false

function release() {
  loadVersion++
  renderVersion++
  renderTask?.cancel()
  renderTask = undefined
  const previous = loadingTask
  loadingTask = undefined
  pdf = null
  if (previous) void previous.destroy().catch(() => {})
  providePassword = undefined
  password.value = ''
  passwordRequired.value = false
  pageText.value = ''
  if (canvas.value) { canvas.value.width = 0; canvas.value.height = 0 }
}
async function renderPage() {
  const document = pdf
  if (!document || !canvas.value || !stage.value || disposed) return
  const ticket = ++renderVersion
  const previous = renderTask
  previous?.cancel()
  rendering.value = true
  emit('ready', false)
  error.value = ''
  try {
    if (previous) await previous.promise.catch(() => {})
    if (ticket !== renderVersion || disposed || document !== pdf) return
    const page = await document.getPage(currentPage.value)
    if (ticket !== renderVersion || disposed || document !== pdf || !canvas.value) return
    const natural = page.getViewport({ scale: 1 })
    const available = Math.max(1, (stage.value?.clientWidth ?? 300) - 24)
    const viewport = page.getViewport({ scale: Math.min(available, 1400) / natural.width })
    // Keep a single page and cap canvas memory, especially on iOS.
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(4_000_000 / (viewport.width * viewport.height)))
    const target = canvas.value
    target.width = Math.max(1, Math.floor(viewport.width * pixelRatio))
    target.height = Math.max(1, Math.floor(viewport.height * pixelRatio))
    target.style.width = `${viewport.width}px`
    target.style.height = `${viewport.height}px`
    renderTask = page.render({
      canvas: target, viewport,
      transform: [pixelRatio, 0, 0, pixelRatio, 0, 0],
    })
    await renderTask.promise
    if (ticket !== renderVersion || disposed || document !== pdf) return
    pageInput.value = currentPage.value
    emit('pageChange', currentPage.value)
    emit('ready', true)
    const text = await page.getTextContent()
    if (ticket === renderVersion && !disposed) {
      pageText.value = text.items.map(item => 'str' in item ? item.str : '').join(' ')
    }
  } catch (failure) {
    if (ticket === renderVersion && !disposed && !(failure instanceof Error && failure.name === 'RenderingCancelledException')) {
      error.value = 'Não foi possível mostrar esta página. Clique em Tentar novamente para reabrir o leitor.'
    }
  } finally {
    if (ticket === renderVersion && !disposed) rendering.value = false
  }
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
    await renderPage()
  } catch {
    if (ticket === loadVersion && !disposed) {
      loading.value = false
      passwordRequired.value = false
      error.value = 'Não foi possível carregar o PDF no leitor. Verifique sua conexão e clique em Tentar novamente.'
    }
  }
}
function navigate(page: number) {
  if (!pdf || rendering.value || !Number.isInteger(page) || page < 1 || page > totalPages.value) {
    pageInput.value = currentPage.value
    return
  }
  currentPage.value = page
  pageText.value = ''
  void renderPage()
  stage.value?.scrollTo({ top: 0, left: 0 })
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
    resizeFrame = requestAnimationFrame(() => { if (pdf) void renderPage() })
  })
  if (stage.value) observer.observe(stage.value)
  void loadDocument()
})
watch(() => props.url, () => { if (!disposed) void loadDocument() })
onUnmounted(() => {
  disposed = true
  observer?.disconnect()
  cancelAnimationFrame(resizeFrame)
  release()
})
</script>

<template>
  <div class="pdf-reader" :aria-busy="loading || rendering">
    <div v-if="totalPages" class="pdf-toolbar">
      <div class="pdf-navigation"><button type="button" :disabled="rendering || currentPage <= 1" aria-label="Página anterior" @click="navigate(currentPage - 1)">←</button><form @submit.prevent="navigate(pageInput)"><label><span class="pdf-accessible-text">Página</span><input v-model.number="pageInput" type="number" min="1" :max="totalPages" :disabled="rendering" aria-label="Ir para página" @change="navigate(pageInput)"></label><span class="pdf-page-count">/ {{ totalPages }}</span></form><button type="button" :disabled="rendering || currentPage >= totalPages" aria-label="Próxima página" @click="navigate(currentPage + 1)">→</button></div>
      <button class="pdf-save" type="button" :disabled="loading || rendering || !!error || saving" :aria-label="`Salvar página ${currentPage}`" @click="emit('save', currentPage)">{{ saving ? 'Salvando…' : 'Salvar' }}</button>
    </div>
    <p v-if="loading && !passwordRequired" class="pdf-message" role="status">Preparando o PDF para leitura…</p>
    <form v-if="passwordRequired" class="pdf-password" @submit.prevent="unlock"><label>Este PDF está protegido. Informe a senha do arquivo.<input v-model="password" type="password" autocomplete="off" required></label><p v-if="passwordError" role="alert">Senha incorreta. Tente novamente.</p><button type="submit">Abrir PDF</button></form>
    <div v-if="error" class="pdf-error" role="alert"><p>{{ error }}</p><button type="button" @click="loadDocument">Tentar novamente</button></div>
    <p v-if="rendering" class="pdf-rendering" role="status">Carregando página {{ currentPage }}…</p>
    <div ref="stage" class="pdf-stage" :class="{ 'is-loading': loading || rendering || !!error }" tabindex="0" :aria-label="`${title}, página ${currentPage} de ${totalPages}`">
      <canvas ref="canvas" role="img" :aria-label="`${title}, página ${currentPage}`"></canvas>
      <p class="pdf-accessible-text">{{ pageText }}</p>
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
.pdf-navigation input { width: 64px; min-height: 44px; padding: 8px; border: 1px solid var(--line); border-radius: 5px; background: var(--paper); color: var(--ink); font-size: 16px; }
button { display: inline-flex; align-items: center; justify-content: center; min-width: 44px; min-height: 44px; padding: 8px 12px; border: 1px solid var(--line); border-radius: 5px; background: var(--paper); color: var(--green); font: inherit; cursor: pointer; }
button:disabled { opacity: .45; cursor: not-allowed; }
.pdf-stage { border-radius: 0 0 7px 7px; position: relative; width: 100%; max-height: 80dvh; padding: 12px; overflow: auto; overscroll-behavior: contain; background: #424744; }
.pdf-stage canvas { display: block; margin-inline: auto; background: white; box-shadow: 0 3px 16px #0003; }
.pdf-stage.is-loading canvas { visibility: hidden; }
.pdf-stage.is-loading { min-height: 80px; }
.pdf-message, .pdf-rendering, .pdf-error, .pdf-password { padding: 20px; color: var(--muted); font-size: 13px; line-height: 1.7; }
.pdf-rendering { margin: 0; padding-block: 10px; }
.pdf-error, .pdf-password > p { color: var(--orange); }
.pdf-password { display: grid; gap: 12px; }
.pdf-password label { display: grid; gap: 10px; }
.pdf-password input { width: 100%; min-height: 44px; padding: 10px; border: 1px solid var(--line); border-radius: 5px; background: var(--paper); color: var(--ink); font-size: 16px; }
.pdf-password > button { justify-self: start; }
.pdf-accessible-text { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
@media (max-width: 600px) {
  .pdf-toolbar { padding: 8px 10px; gap: 8px; }
  .pdf-navigation { display: grid; grid-template-columns: 44px minmax(0, 1fr) 44px; flex: 1 1 0; min-width: 0; gap: 6px; }
  .pdf-navigation form { justify-content: center; min-width: 0; gap: 5px; }
  .pdf-navigation label { min-width: 0; gap: 0; }
  .pdf-navigation input { appearance: textfield; width: 54px; padding: 6px; text-align: center; font-variant-numeric: tabular-nums; }
  .pdf-navigation input::-webkit-inner-spin-button, .pdf-navigation input::-webkit-outer-spin-button { appearance: none; margin: 0; }
  .pdf-save { padding-inline: 10px; }
}

</style>
