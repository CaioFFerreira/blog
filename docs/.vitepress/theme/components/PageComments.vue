<script setup lang="ts">
import RequestLoading from './RequestLoading.vue'
import ToastNotice from './ToastNotice.vue'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { withBase } from 'vitepress'
import { useAuth } from '../composables/useAuth'
import { getSupabase } from '../supabase'

interface PageComment {
  id: string
  author_id: string
  page_number: number
  body: string
  created_at: string
  updated_at: string
  display_name: string
}
const props = defineProps<{ bookId: string; page: number; bookTitle: string; disabled?: boolean }>()
const { user } = useAuth()
const dialog = ref<HTMLDialogElement>()
const trigger = ref<HTMLButtonElement>()
const comments = ref<PageComment[]>([])
const expanded = ref(false)
const loading = ref(false)
const mutating = ref(false)
const access = ref(false)
const more = ref(false)
const nextOffset = ref(0)
const loaded = ref(false)
const draft = ref('')
const editing = ref<string | null>(null)
const editDraft = ref('')
const error = ref('')
const notice = ref('')
let version = 0
let previousOverflow = ''
let locked = false
let disposed = false
const fields = 'id,author_id,page_number,body,created_at,updated_at'
const pageCommentCount = ref<number | null>(null)
const counting = ref(false)
const countUnavailable = ref(false)
let countVersion = 0
let countTimer: ReturnType<typeof setTimeout> | undefined
let countController: AbortController | undefined
const countLabel = computed(() => counting.value ? ' · carregando…' : pageCommentCount.value !== null ? ` · ${pageCommentCount.value}` : countUnavailable.value ? ' · contagem indisponível' : ' · …')
function scheduleCount() {
  const ticket = ++countVersion
  clearTimeout(countTimer)
  countController?.abort()
  pageCommentCount.value = null
  countUnavailable.value = false
  counting.value = false
  const owner = user.value?.id, book = props.bookId, page = props.page
  if (!owner || props.disabled || !Number.isInteger(page) || page < 1) return
  counting.value = true
  countTimer = setTimeout(async () => {
    const controller = new AbortController()
    countController = controller
    try {
      const client = await getSupabase(withBase('/'))
      if (ticket !== countVersion || disposed) return
      const { count, error: queryError } = await client.from('library_page_comments')
        .select('id', { count: 'exact', head: true }).eq('book_id', book).eq('page_number', page).abortSignal(controller.signal)
      if (ticket !== countVersion || disposed || user.value?.id !== owner) return
      if (queryError || count === null) throw queryError ?? new Error('Count unavailable')
      pageCommentCount.value = count
    } catch {
      if (ticket === countVersion && !disposed) countUnavailable.value = true
    } finally {
      if (ticket === countVersion && !disposed) counting.value = false
    }
  }, 250)
}
watch([() => props.bookId, () => props.page, () => props.disabled, () => user.value?.id], scheduleCount, { immediate: true })
const dates = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : dates.format(date)
}
function failMessage(failure: unknown) {
  const record = failure && typeof failure === 'object' ? failure as Record<string, unknown> : {}
  if (record.code === '42501' || record.status === 403) return 'Você não tem mais acesso a estes comentários. O livro pode ter se tornado privado ou a amizade pode ter sido removida.'
  return 'Não foi possível carregar ou salvar os comentários. Tente novamente.'
}
function releaseDialog() {
  expanded.value = false
  if (locked) { document.body.style.overflow = previousOverflow; locked = false }
}
function close() { dialog.value?.close(); releaseDialog() }
function onClose() {
  releaseDialog()
  if (trigger.value?.isConnected) trigger.value.focus({ preventScroll: true })
}
async function open() {
  if (!user.value || props.disabled) return
  expanded.value = true
  await nextTick()
  if (!dialog.value || disposed || !user.value) return
  dialog.value.showModal()
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  locked = true
  void load()
}
function backdrop(event: MouseEvent) {
  if (event.target !== dialog.value) return
  const box = dialog.value.getBoundingClientRect()
  if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close()
}
function trapFocus(event: KeyboardEvent) {
  if (event.key !== 'Tab' || !dialog.value?.open) return
  const elements = Array.from(dialog.value.querySelectorAll<HTMLElement>('button:not(:disabled), textarea:not(:disabled), [tabindex="0"]'))
    .filter(element => element.getClientRects().length > 0)
  const first = elements[0], last = elements[elements.length - 1]
  if (!first || !last) return
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
}
let lastRefresh = 0
async function refreshComments() {
  if (Date.now() - lastRefresh < 1000) return
  lastRefresh = Date.now()
  await load()
}
async function load(append = false) {
  if (!user.value || mutating.value || loading.value) return
  const owner = user.value.id
  const ticket = ++version
  const offset = append ? nextOffset.value : 0
  const book = props.bookId, page = props.page
  loading.value = true
  error.value = ''
  // Clear stale content while checking the book's current access permissions.
  if (!append) { comments.value = []; access.value = false; more.value = false; loaded.value = false }
  try {
    const client = await getSupabase(withBase('/'))
    if (ticket !== version || disposed || user.value?.id !== owner) return
    const { data, error: queryError } = await client.rpc('library_list_page_comments', {
      target_book: book, target_page: page, comment_offset: offset,
    })
    if (ticket !== version || disposed || user.value?.id !== owner) return
    if (queryError) throw queryError
    const rows = (data ?? []) as PageComment[]
    comments.value = append
      ? Array.from(new Map([...comments.value, ...rows.slice(0, 50)].map(comment => [comment.id, comment])).values())
      : rows.slice(0, 50)
    nextOffset.value = offset + Math.min(50, rows.length)
    more.value = rows.length > 50
    access.value = true
    loaded.value = true
    scheduleCount()
  } catch (failure) {
    if (ticket === version && !disposed) {
      comments.value = []
      access.value = false
      more.value = false
      loaded.value = false
      editing.value = null
      error.value = failMessage(failure)
    }
  } finally {
    if (ticket === version && !disposed) loading.value = false
  }
}
async function mutate(operation: 'add' | 'edit' | 'delete', comment?: PageComment) {
  const author = user.value?.id
  if (!author || !access.value || loading.value || mutating.value) return
  if (operation !== 'add' && comment?.author_id !== author) return
  const body = (operation === 'edit' ? editDraft.value : draft.value).trim()
  if (operation !== 'delete' && (!body || body.length > 4000)) {
    error.value = 'Escreva um comentário de até 4.000 caracteres.'
    return
  }
  if (operation === 'delete' && !window.confirm('Excluir seu comentário desta página?')) return
  const ticket = version
  const book = props.bookId, page = props.page
  mutating.value = true
  error.value = ''
  notice.value = ''
  try {
    const client = await getSupabase(withBase('/'))
    if (ticket !== version || disposed || user.value?.id !== author) return
    const result = operation === 'add'
      ? await client.from('library_page_comments').insert({ book_id: book, page_number: page, body }).select(fields).single()
      : operation === 'edit'
        ? await client.from('library_page_comments').update({ body }).eq('id', comment!.id).eq('author_id', author).select(fields).single()
        : await client.from('library_page_comments').delete().eq('id', comment!.id).eq('author_id', author).select('id').single()
    if (ticket !== version || disposed || user.value?.id !== author) return
    if (result.error) throw result.error
    if (operation === 'add') {
      draft.value = ''
      // Refresh from the first batch so pagination stays consistent with other readers.
      notice.value = 'Comentário publicado.'
    } else if (operation === 'edit') {
      editing.value = null
      const row = comments.value.find(item => item.id === comment!.id)
      if (row) Object.assign(row, result.data)
      notice.value = 'Comentário atualizado.'
    } else {
      comments.value = comments.value.filter(item => item.id !== comment!.id)
      editing.value = null
      notice.value = 'Comentário excluído.'
    }
    mutating.value = false
    if (operation === 'add' || operation === 'delete') await load()
  } catch (failure) {
    if (ticket === version && !disposed) {
      error.value = failMessage(failure)
      if ((failure as { code?: string })?.code === '42501') { comments.value = []; access.value = false; loaded.value = false; more.value = false; editing.value = null }
    }
  } finally {
    if (ticket === version && !disposed) mutating.value = false
  }
}
async function startEdit(comment: PageComment) {
  editing.value = comment.id
  editDraft.value = comment.body
  await nextTick()
  document.getElementById(`comment-editor-${comment.id}`)?.focus()
}
watch([() => props.bookId, () => props.page, () => user.value?.id], () => {
  version++
  comments.value = []
  loaded.value = false
  loading.value = false
  mutating.value = false
  access.value = false
  more.value = false
  nextOffset.value = 0
  draft.value = ''
  editing.value = null
  editDraft.value = ''
  notice.value = ''
  error.value = ''
  if (!user.value) close()
  else if (expanded.value) void load()
})
function onFocus() {
  if (expanded.value && user.value && !mutating.value && !loading.value) void refreshComments()
  else if (!counting.value && user.value) scheduleCount()
}
onMounted(() => window.addEventListener('focus', onFocus))
onUnmounted(() => { disposed = true; version++; countVersion++; clearTimeout(countTimer); countController?.abort(); close(); window.removeEventListener('focus', onFocus) })
</script>

<template>
  <div class="page-comments">
    <RequestLoading :message="mutating ? 'Salvando comentário…' : loading ? 'Carregando comentários…' : ''" />
    <button ref="trigger" class="comments-trigger" type="button" :disabled="disabled" aria-haspopup="dialog" aria-controls="page-comments-dialog" @click="open"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M20 11a8 8 0 0 1-8 8H5l-3 3V11a9 9 0 1 1 18 0Z" /></svg>Comentários · página {{ page }}{{ countLabel }}</button>
    <dialog id="page-comments-dialog" ref="dialog" class="comments-dialog" aria-labelledby="comments-title" aria-describedby="comments-description" @cancel.prevent="close" @close="onClose" @click="backdrop" @keydown="trapFocus">
      <header class="comments-heading"><div><p class="eyebrow">LEITURA EM CONVERSA</p><h2 id="comments-title">Comentários da página {{ page }}</h2></div><button class="comments-close" type="button" aria-label="Fechar comentários" @click="close">×</button></header>
      <div class="comments-scroll-body">
      <p id="comments-description" class="comments-description">{{ bookTitle }} · Quem tem acesso ao livro pode ler e comentar.</p>
      <div class="comments-tools"><span>{{ loaded ? `${comments.length}${more ? '+' : ''} comentários` : 'Comentários desta página' }}</span><button type="button" :disabled="loading || mutating" @click="refreshComments">Atualizar</button></div>
      <p v-if="loading" class="comments-message" role="status">Carregando comentários…</p>
      <ToastNotice :model-value="error" kind="error" />
      <button v-if="error" type="button" :disabled="loading || mutating" @click="refreshComments">Tentar novamente</button>
      <ToastNotice v-model="notice" />
      <form v-if="access" class="comment-compose" @submit.prevent="mutate('add')"><label>Seu comentário<textarea v-model="draft" rows="3" maxlength="4000" :disabled="mutating || loading" placeholder="O que você achou desta página?" required></textarea></label><div><small>{{ draft.length }}/4000</small><button class="comment-primary" type="submit" :disabled="mutating || loading || !draft.trim()">{{ mutating ? 'Salvando…' : 'Publicar comentário' }}</button></div></form>
      <p v-if="loaded && !loading && !comments.length" class="comments-empty">Ainda não há comentários nesta página. Comece a conversa.</p>
      <div v-if="comments.length" class="comments-list" tabindex="0" role="region" aria-label="Comentários desta página"><article v-for="comment in comments" :key="comment.id" class="comment-item"><header><span class="comment-avatar" aria-hidden="true">{{ comment.display_name.slice(0, 1).toUpperCase() }}</span><div><strong>{{ comment.display_name }}{{ comment.author_id === user?.id ? ' (você)' : '' }}</strong><span><time :datetime="comment.created_at">{{ formatDate(comment.created_at) }}</time>{{ comment.updated_at !== comment.created_at ? ' · editado' : '' }}</span></div></header><form v-if="editing === comment.id" class="comment-edit" @submit.prevent="mutate('edit', comment)"><label>Editar comentário<textarea :id="`comment-editor-${comment.id}`" v-model="editDraft" rows="3" maxlength="4000" :disabled="mutating" required></textarea></label><div><button type="button" :disabled="mutating" @click="editing = null">Cancelar</button><button class="comment-primary" type="submit" :disabled="mutating || !editDraft.trim()">Salvar alteração</button></div></form><p v-else class="comment-body">{{ comment.body }}</p><div v-if="comment.author_id === user?.id && editing !== comment.id" class="comment-actions"><button type="button" :disabled="mutating || loading" :aria-label="`Editar comentário de ${comment.display_name}`" @click="startEdit(comment)">Editar</button><button class="comment-delete" type="button" :disabled="mutating || loading" :aria-label="`Excluir comentário de ${comment.display_name}`" @click="mutate('delete', comment)">Excluir</button></div></article></div>
      <button v-if="more" class="comments-more" type="button" :disabled="loading || mutating" @click="load(true)">Mostrar mais comentários</button>
      </div>
      <footer class="comments-footer"><span>Se o livro ficar privado, os amigos perdem acesso a esta conversa.</span><button type="button" @click="close">Concluir</button></footer>
    </dialog>
  </div>
</template>

<style scoped>
.page-comments { padding: 20px 24px; border-top: 1px solid var(--line); }
button { min-height: 44px; padding: 10px 13px; border: 1px solid var(--line); border-radius: 2px; background: var(--paper); color: var(--green); font: 500 12px var(--font-sans); cursor: pointer; }
button:disabled { opacity: .5; cursor: default; }
.comments-trigger { display: inline-flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 8px; max-width: 100%; }
.comments-trigger svg { flex-shrink: 0; }
.comments-dialog { width: min(700px, calc(100vw - 32px)); max-height: calc(100dvh - 48px); margin: auto; padding: 0; overflow: hidden; overscroll-behavior: contain; border: 1px solid var(--line); border-radius: 2px; background: var(--surface); color: var(--ink); box-shadow: 0 24px 90px #0004; }
.comments-dialog[open] { display: flex; flex-direction: column; }
.comments-scroll-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 0 28px 20px; scrollbar-gutter: stable; }
.comments-dialog::backdrop { background: #08130db3; backdrop-filter: blur(5px); }
.comments-heading { flex-shrink: 0; padding: 22px 28px; border-bottom: 1px solid var(--line); display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
h2 { margin: 8px 0; font: 500 clamp(22px, 4vw, 28px)/1.2 var(--display); letter-spacing: -.03em; }
.comments-close { width: 44px; padding: 0; flex-shrink: 0; border-radius: 2px; font-size: 24px; }
.comments-description, .comments-empty { color: var(--muted); font-size: 13px; line-height: 1.8; overflow-wrap: anywhere; }
.comments-tools { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-block: 16px; border-bottom: 1px solid var(--line); }
.comments-tools > span, .comments-footer > span { color: var(--muted); font-size: 11px; line-height: 1.7; }
.comments-message, .comments-error { font-size: 12px; line-height: 1.8; }
.comments-message { color: var(--green); }
.comments-error { color: var(--orange); }
.comment-compose, .comment-edit { display: grid; gap: 10px; margin: 20px 0; }
label { display: grid; gap: 10px; color: var(--muted); font-size: 12px; }
textarea { display: block; box-sizing: border-box; width: 100%; min-width: 0; min-height: 100px; max-height: 240px; resize: vertical; padding: 12px; border: 1px solid var(--line); border-radius: 2px; color: var(--ink); background: var(--paper); font: 14px/1.7 var(--font-sans); }
.comment-compose > div, .comment-edit > div { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 10px; }
.comment-compose small { margin-right: auto; color: var(--muted); font-size: 10px; }
.comment-primary { background: var(--green); color: var(--paper); border-color: var(--green); }
.comments-list { min-width: 0; }
.comment-item { padding: 18px 0; border-top: 1px solid var(--line); }
.comment-item > header { display: flex; align-items: center; gap: 10px; }
.comment-avatar { display: grid; place-items: center; flex-shrink: 0; width: 32px; height: 32px; border: 1px solid var(--line); border-radius: 50%; color: var(--green); background: var(--paper); font-size: 12px; }
.comment-item > header > div { display: grid; gap: 5px; min-width: 0; }
.comment-item strong { font-size: 13px; font-weight: 500; overflow-wrap: anywhere; }
.comment-item header div > span { color: var(--muted); font-size: 10px; line-height: 1.6; }
.comment-body { white-space: pre-wrap; overflow-wrap: anywhere; font-size: 14px; line-height: 1.8; }
.comment-actions { display: flex; gap: 8px; }
.comment-actions button { min-height: 36px; padding: 6px 8px; font-size: 11px; background: transparent; }
.comment-delete { color: var(--orange); }
.comments-more { display: block; margin: 18px auto; }
.comments-footer { flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px 28px; margin: 0; border-top: 1px solid var(--line); }
@media (max-width: 480px) { .page-comments { padding-inline: 20px; } .comments-trigger { width: 100%; } .comments-dialog { width: calc(100vw - 24px); max-height: calc(100dvh - 24px); } .comments-heading { padding: 16px 20px; } .comments-scroll-body { padding: 0 20px 16px; } .comments-footer { padding: 12px 20px; } textarea { font-size: 16px; } .comment-actions button { min-height: 44px; } .comments-footer { align-items: flex-start; flex-direction: column; } .comments-footer > button { width: 100%; } }
</style>
