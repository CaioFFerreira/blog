<script setup lang="ts">
import BaseModal from './BaseModal.vue'
import ModalHeader from './ModalHeader.vue'
import LoadingDots from './LoadingDots.vue'
import RequestLoading from './RequestLoading.vue'
import ToastNotice from './ToastNotice.vue'
import CommentActions from './CommentActions.vue'
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
interface CommentReaction { comment_id: string; likes: number; dislikes: number; my_reaction: -1 | 0 | 1 }
const props = defineProps<{ bookId: string; page: number; bookTitle: string; disabled?: boolean; autoOpen?: boolean }>()
const { user } = useAuth()
const comments = ref<PageComment[]>([])
const expanded = ref(false)
const loading = ref(false)
const mutating = ref(false)
const reacting = ref<string | null>(null)
const reactions = ref<Record<string, CommentReaction>>({})
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
let disposed = false
const fields = 'id,author_id,page_number,body,created_at,updated_at'
const pageCommentCount = ref<number | null>(null)
const counting = ref(false)
const countUnavailable = ref(false)
let countVersion = 0
let countTimer: ReturnType<typeof setTimeout> | undefined
let countController: AbortController | undefined
const countDescription = computed(() => counting.value ? 'Carregando quantidade de comentários.' : pageCommentCount.value !== null ? `${pageCommentCount.value} comentários nesta página.` : countUnavailable.value ? 'Contagem indisponível. Abra os comentários para tentar novamente.' : 'Aguardando a página do livro.')
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
function close() { expanded.value = false }
function open() {
  if (!user.value || props.disabled || expanded.value) return
  expanded.value = true
}
let autoOpened = false
watch([() => props.autoOpen, () => props.disabled, () => user.value?.id], () => {
  if (props.autoOpen && !props.disabled && user.value && !autoOpened) {
    autoOpened = true
    void open()
  }
}, { immediate: true })
let lastRefresh = 0
async function refreshComments() {
  if (Date.now() - lastRefresh < 1000) return
  lastRefresh = Date.now()
  await load()
}
async function load(append = false) {
  if (!user.value || mutating.value || reacting.value || loading.value) return
  const owner = user.value.id
  const ticket = ++version
  const offset = append ? nextOffset.value : 0
  const book = props.bookId, page = props.page
  loading.value = true
  error.value = ''
  // Clear stale content while checking the book's current access permissions.
  if (!append) { comments.value = []; reactions.value = {}; access.value = false; more.value = false; loaded.value = false }
  try {
    const client = await getSupabase(withBase('/'))
    if (ticket !== version || disposed || user.value?.id !== owner) return
    const { data, error: queryError } = await client.rpc('library_list_page_comments', {
      target_book: book, target_page: page, comment_offset: offset,
    })
    if (ticket !== version || disposed || user.value?.id !== owner) return
    if (queryError) throw queryError
    const rows = (data ?? []) as PageComment[]
    const batch = rows.slice(0, 50)
    const batchReactions: Record<string, CommentReaction> = {}
    if (batch.length) {
      const totals = await client.rpc('library_comment_reaction_totals', { target_comments: batch.map(comment => comment.id) })
      if (ticket !== version || disposed || user.value?.id !== owner) return
      if (totals.error?.code === '42501') throw totals.error
      if (totals.error) error.value = 'Não foi possível carregar as reações. Atualize os comentários e confira se a migração 008 foi aplicada.'
      else for (const row of (totals.data ?? []) as CommentReaction[]) batchReactions[row.comment_id] = row
    }
    reactions.value = append ? { ...reactions.value, ...batchReactions } : batchReactions
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
      reactions.value = {}
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
  if (!author || !access.value || loading.value || mutating.value || reacting.value) return
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
      if ((failure as { code?: string })?.code === '42501') { comments.value = []; reactions.value = {}; access.value = false; loaded.value = false; more.value = false; editing.value = null }
    }
  } finally {
    if (ticket === version && !disposed) mutating.value = false
  }
}
async function react(comment: PageComment, choice: -1 | 1) {
  const owner = user.value?.id, previous = reactions.value[comment.id]
  if (!owner || !access.value || !previous || loading.value || mutating.value || reacting.value) return
  const ticket = version
  const selected = previous.my_reaction === choice ? 0 : choice
  reacting.value = comment.id
  error.value = ''
  notice.value = ''
  try {
    const client = await getSupabase(withBase('/'))
    if (ticket !== version || disposed || user.value?.id !== owner) return
    const { data, error: failure } = await client.rpc('library_set_comment_reaction', { target_comment: comment.id, target_reaction: selected })
    if (ticket !== version || disposed || user.value?.id !== owner) return
    if (failure) throw failure
    const result = (data as CommentReaction[] | null)?.[0]
    if (!result || result.comment_id !== comment.id) throw new Error('Reaction unavailable')
    reactions.value = { ...reactions.value, [comment.id]: result }
    notice.value = selected === 0 ? 'Reação removida.' : 'Reação atualizada.'
  } catch (failure) {
    if (ticket === version && !disposed) {
      error.value = (failure as { code?: string })?.code === '42501' ? failMessage(failure) : 'Não foi possível salvar sua reação. Tente novamente.'
      if ((failure as { code?: string })?.code === '42501') {
        comments.value = []; reactions.value = {}; access.value = false; loaded.value = false; more.value = false; editing.value = null
      }
    }
  } finally { if (ticket === version && !disposed) reacting.value = null }
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
  reactions.value = {}
  loaded.value = false
  loading.value = false
  mutating.value = false
  reacting.value = null
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
  if (expanded.value && user.value && !mutating.value && !reacting.value && !loading.value) void refreshComments()
  else if (!counting.value && user.value) scheduleCount()
}
onMounted(() => window.addEventListener('focus', onFocus))
onUnmounted(() => { disposed = true; version++; countVersion++; clearTimeout(countTimer); countController?.abort(); close(); window.removeEventListener('focus', onFocus) })
</script>

<template>
  <div class="page-comments">
    <RequestLoading :message="reacting ? 'Salvando reação…' : mutating ? 'Salvando comentário…' : loading ? 'Carregando comentários…' : ''" />
    <button data-action="open" class="ui-action comments-trigger" type="button" :disabled="disabled || counting" :aria-busy="counting" :aria-label="counting ? `Carregando comentários da página ${page}` : undefined" aria-haspopup="dialog" aria-controls="page-comments-dialog" :aria-describedby="`comment-count-${bookId}-${page}`" @click="open"><span class="comments-button-content" :class="{ 'is-loading': counting }"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M20 11a8 8 0 0 1-8 8H5l-3 3V11a9 9 0 1 1 18 0Z" /></svg><span class="comments-trigger-label">Comentários · página {{ page }}</span><span class="comments-count" :title="countDescription" aria-hidden="true">{{ pageCommentCount === null ? '—' : pageCommentCount > 99 ? '99+' : pageCommentCount }}</span></span><span v-if="counting" class="comments-button-loading" aria-hidden="true"><LoadingDots /></span></button>
    <span :id="`comment-count-${bookId}-${page}`" class="comments-sr" role="status" aria-live="polite">{{ countDescription }}</span>
    <BaseModal v-model="expanded" id="page-comments-dialog" class="comments-dialog" aria-labelledby="comments-title" aria-describedby="comments-description" @opened="load()">
      <ModalHeader class="comments-heading" close-label="Fechar comentários" @close="close"><p class="eyebrow">LEITURA EM CONVERSA</p><h2 id="comments-title">Comentários da página {{ page }}</h2></ModalHeader>
      <div class="comments-scroll-body modal-body">
      <p id="comments-description" class="comments-description">{{ bookTitle }} · Quem tem acesso ao livro pode ler e comentar.</p>
      <div class="comments-tools"><span>{{ loaded ? `${comments.length}${more ? '+' : ''} comentários` : 'Comentários desta página' }}</span><button data-action="ghost" class="ui-action" type="button" :disabled="loading || mutating || !!reacting" @click="refreshComments"><span class="action-icon" aria-hidden="true">↻</span>Atualizar</button></div>
      <p v-if="loading" class="comments-message" role="status">Carregando comentários…</p>
      <ToastNotice :model-value="error" kind="error" />
      <button data-action="ghost" class="ui-action" v-if="error" type="button" :disabled="loading || mutating || !!reacting" @click="refreshComments"><span class="action-icon" aria-hidden="true">↻</span>Tentar novamente</button>
      <ToastNotice v-model="notice" />
      <form v-if="access" class="comment-compose" @submit.prevent="mutate('add')"><label>Seu comentário<textarea v-model="draft" rows="3" maxlength="4000" :disabled="mutating || loading || !!reacting" placeholder="O que você achou desta página?" required></textarea></label><div><small>{{ draft.length }}/4000</small><button data-action="primary" class="ui-action comment-primary" type="submit" :disabled="mutating || loading || !!reacting || !draft.trim()">{{ mutating ? 'Salvando…' : 'Publicar comentário' }}</button></div></form>
      <p v-if="loaded && !loading && !comments.length" class="comments-empty">Ainda não há comentários nesta página. Comece a conversa.</p>
      <div v-if="comments.length" class="comments-list" tabindex="0" role="region" aria-label="Comentários desta página"><article v-for="comment in comments" :key="comment.id" class="comment-item"><header><span class="comment-avatar" aria-hidden="true">{{ comment.display_name.slice(0, 1).toUpperCase() }}</span><div class="comment-author"><strong>{{ comment.display_name }}{{ comment.author_id === user?.id ? ' (você)' : '' }}</strong><span><time :datetime="comment.created_at">{{ formatDate(comment.created_at) }}</time>{{ comment.updated_at !== comment.created_at ? ' · editado' : '' }}</span></div><CommentActions v-if="comment.author_id === user?.id && editing !== comment.id" :comment-id="comment.id" :author-name="comment.display_name" :disabled="mutating || loading || !!reacting" @edit="startEdit(comment)" @delete="mutate('delete', comment)" /></header><form v-if="editing === comment.id" class="comment-edit" @submit.prevent="mutate('edit', comment)"><label>Editar comentário<textarea :id="`comment-editor-${comment.id}`" v-model="editDraft" rows="3" maxlength="4000" :disabled="mutating || !!reacting" required></textarea></label><div><button data-action="ghost" class="ui-action" type="button" :disabled="mutating || !!reacting" @click="editing = null">Cancelar</button><button data-action="primary" class="ui-action comment-primary" type="submit" :disabled="mutating || !!reacting || !editDraft.trim()">Salvar alteração</button></div></form><p v-else class="comment-body">{{ comment.body }}</p><div class="comment-reactions" role="group" :aria-label="`Reações ao comentário de ${comment.display_name}`">
          <button data-action="ghost" class="ui-action reaction-button" :class="{ selected: reactions[comment.id]?.my_reaction === 1 }" type="button" :disabled="loading || mutating || !!reacting || !reactions[comment.id]" :aria-pressed="reactions[comment.id]?.my_reaction === 1" :aria-label="`Curtir comentário de ${comment.display_name}`" @click="react(comment, 1)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M7 10v11H3V10h4Zm0 0 5-7c2 0 3 1 2 4l-1 3h6c2 0 2 2 2 3l-2 7c0 1-1 1-2 1H7" /></svg><span>Curtir</span><span class="reaction-count">{{ reactions[comment.id]?.likes ?? '—' }}</span></button>
          <button data-action="ghost" class="ui-action reaction-button" :class="{ selected: reactions[comment.id]?.my_reaction === -1 }" type="button" :disabled="loading || mutating || !!reacting || !reactions[comment.id]" :aria-pressed="reactions[comment.id]?.my_reaction === -1" :aria-label="`Não curtir comentário de ${comment.display_name}`" @click="react(comment, -1)"><svg class="dislike-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M7 10v11H3V10h4Zm0 0 5-7c2 0 3 1 2 4l-1 3h6c2 0 2 2 2 3l-2 7c0 1-1 1-2 1H7" /></svg><span>Não curtir</span><span class="reaction-count">{{ reactions[comment.id]?.dislikes ?? '—' }}</span></button>
        </div></article></div>
      <button data-action="ghost" v-if="more" class="ui-action comments-more" type="button" :disabled="loading || mutating || !!reacting" @click="load(true)">Mostrar mais comentários</button>
      </div>
      <footer class="comments-footer modal-footer"><span>Se o livro ficar privado, os amigos perdem acesso a esta conversa.</span><button data-action="ghost" class="ui-action" type="button" @click="close">Fechar</button></footer>
    </BaseModal>
  </div>
</template>

<style scoped>
.page-comments { padding: 20px 24px; border-top: 1px solid var(--line); }
button { min-height: 44px; padding: 10px 13px; border: 1px solid var(--line); border-radius: 0; background: var(--paper); color: var(--green); font: 500 12px var(--font-sans); cursor: pointer; }
button:disabled { opacity: .5; cursor: default; }
.comments-trigger { position: relative; display: inline-flex; align-items: center; justify-content: center; flex-wrap: nowrap; gap: 8px; max-width: 100%; }
.comments-trigger svg { flex-shrink: 0; }
.comments-trigger-label { min-width: 0; }
.comments-count { display: inline-grid; place-items: center; flex-shrink: 0; width: 32px; height: 20px; background: color-mix(in srgb, var(--green) 10%, transparent); font-size: 11px; font-variant-numeric: tabular-nums; }
.comments-button-content { display: inline-flex; align-items: center; gap: 8px; min-width: 0; max-width: 100%; }
.comments-button-content.is-loading { visibility: hidden; }
.comments-button-loading { position: absolute; inset: 0; display: grid; place-items: center; }
.comments-sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.comments-description, .comments-empty { color: var(--muted); font-size: 13px; line-height: 1.8; overflow-wrap: anywhere; }
.comments-tools { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-block: 16px; border-bottom: 1px solid var(--line); }
.comments-tools > span { color: var(--muted); font-size: 11px; line-height: 1.7; }
.comments-message { font-size: 12px; line-height: 1.8; }
.comments-message { color: var(--green); }
.comment-compose, .comment-edit { display: grid; gap: 10px; margin: 20px 0; }
label { display: grid; gap: 10px; color: var(--muted); font-size: 12px; }
textarea { display: block; box-sizing: border-box; width: 100%; min-width: 0; min-height: 100px; max-height: 240px; resize: vertical; padding: 12px; border: 1px solid var(--line); border-radius: 0; color: var(--ink); background: var(--paper); font: 14px/1.7 var(--font-sans); }
.comment-compose > div, .comment-edit > div { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 10px; }
.comment-compose small { margin-right: auto; color: var(--muted); font-size: 10px; }
.comment-primary { background: var(--green); color: var(--paper); border-color: var(--green); }
.comments-list { min-width: 0; }
.comment-item { padding: 18px 0; border-top: 1px solid var(--line); }
.comment-item > header { display: flex; align-items: center; gap: 10px; }
.comment-avatar { display: grid; place-items: center; flex-shrink: 0; width: 32px; height: 32px; border: 1px solid var(--line); border-radius: 0; color: var(--green); background: var(--paper); font-size: 12px; }
.comment-author { display: grid; gap: 5px; min-width: 0; flex: 1; }
.comment-item strong { font-size: 13px; font-weight: 500; overflow-wrap: anywhere; }
.comment-author > span { color: var(--muted); font-size: 10px; line-height: 1.6; }
.comment-body { white-space: pre-wrap; overflow-wrap: anywhere; font-size: 14px; line-height: 1.8; }
.comment-reactions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
.comment-reactions .reaction-button { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 8px; font-size: 12px; }
.comment-reactions .reaction-button.selected { background: color-mix(in srgb, var(--green) 10%, transparent); border-color: color-mix(in srgb, var(--green) 35%, transparent); color: var(--green); font-weight: 600; }
.comment-reactions .reaction-button.selected:hover:not(:disabled) { background: color-mix(in srgb, var(--green) 14%, transparent); border-color: var(--green); color: var(--green); }
.reaction-button svg { flex-shrink: 0; }
.dislike-icon { transform: rotate(180deg); }
.reaction-count { min-width: 12px; font-variant-numeric: tabular-nums; }
.comments-more { display: block; margin: 18px auto; }
@media (max-width: 480px) { .page-comments { padding-inline: 20px; } .comments-trigger { width: 100%; } }
</style>
