<script setup lang="ts">
import BaseModal from './BaseModal.vue'
import ModalHeader from './ModalHeader.vue'
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { withBase } from 'vitepress'
import { useAuth } from '../composables/useAuth'
import { getSupabase } from '../supabase'
import RequestLoading from './RequestLoading.vue'
import ToastNotice from './ToastNotice.vue'

interface Notification {
  id: string; book_id: string; comment_id: string; page_number: number
  book_title: string; display_name: string; created_at: string; read_at: string | null
}
const { user } = useAuth()
const emit = defineEmits<{ 'unread-change': [count: number]; opened: []; closed: [] }>()
const expanded = ref(false)
const unread = ref(0)
watch(unread, count => emit('unread-change', count), { immediate: true })
const counting = ref(false)
const loading = ref(false)
const busy = ref(false)
const items = ref<Notification[]>([])
const more = ref(false)
const error = ref('')
const notice = ref('')
let offset = 0, version = 0, countVersion = 0, lastLoad = 0
let interval: ReturnType<typeof setInterval> | undefined
let disposed = false
const date = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
function formatDate(value: string) { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? '' : date.format(parsed) }
async function refreshCount() {
  const owner = user.value?.id
  if (!owner || counting.value || disposed) return
  const ticket = ++countVersion
  counting.value = true
  try {
    const client = await getSupabase(withBase('/'))
    const { count, error: failure } = await client.from('library_notifications').select('id', { count: 'exact', head: true }).is('read_at', null)
    if (!failure && ticket === countVersion && user.value?.id === owner && !disposed) unread.value = count ?? 0
  } catch { /* Opening the list provides an actionable error if unavailable. */ }
  finally { if (ticket === countVersion) counting.value = false }
}
async function load(append = false) {
  const owner = user.value?.id
  if (!owner || loading.value || busy.value || (!append && Date.now() - lastLoad < 1000)) return
  lastLoad = Date.now()
  const ticket = ++version
  loading.value = true
  error.value = ''
  try {
    const client = await getSupabase(withBase('/'))
    const start = append ? offset : 0
    const { data, error: failure } = await client.rpc('library_list_notifications', { notification_offset: start })
    if (ticket !== version || user.value?.id !== owner || disposed) return
    if (failure) throw failure
    const rows = (data ?? []) as Notification[]
    items.value = append ? Array.from(new Map([...items.value, ...rows.slice(0, 50)].map(item => [item.id, item])).values()) : rows.slice(0, 50)
    offset = start + Math.min(rows.length, 50)
    more.value = rows.length > 50
    void refreshCount()
  } catch {
    if (ticket === version && !disposed) error.value = 'Não foi possível carregar as notificações. Tente atualizar. Confira se a migração 007 foi aplicada.'
  } finally { if (ticket === version) loading.value = false }
}
function open() {
  if (!user.value || disposed) return
  emit('opened')
  expanded.value = true
}
function close() { expanded.value = false }
async function markRead(item?: Notification) {
  const owner = user.value?.id
  if (!owner || busy.value || loading.value) return
  const ticket = version
  busy.value = true
  error.value = ''
  try {
    const client = await getSupabase(withBase('/'))
    const { error: failure } = await client.rpc('library_mark_notifications_read', { target_notification: item?.id ?? null })
    if (ticket !== version || user.value?.id !== owner || disposed) return
    if (failure) throw failure
    const now = new Date().toISOString()
    for (const row of items.value) if (!item || row.id === item.id) row.read_at = now
    countVersion++; counting.value = false
    if (item) void refreshCount()
    else { unread.value = 0; notice.value = 'Todas as notificações foram marcadas como lidas.' }
    if (item) {
      close()
      const detail = { bookId: item.book_id, page: item.page_number }
      if (window.location.pathname === withBase('/livros.html')) {
        window.dispatchEvent(new CustomEvent('library:open-notification', { detail }))
      } else {
        const destination = new URL(withBase('/livros.html'), window.location.origin)
        destination.searchParams.set('book', item.book_id)
        destination.searchParams.set('page', String(item.page_number))
        destination.searchParams.set('comments', '1')
        window.location.assign(destination.href)
      }
    }
  } catch {
    if (ticket === version && !disposed) error.value = 'Não foi possível marcar a notificação como lida. Tente novamente.'
  } finally { if (ticket === version) busy.value = false }
}
watch(() => user.value?.id, () => {
  version++; countVersion++; lastLoad = 0
  close(); unread.value = 0; items.value = []; more.value = false; offset = 0
  loading.value = false; busy.value = false; counting.value = false; error.value = ''; notice.value = ''
  if (user.value) void refreshCount()
}, { immediate: true })
function onFocus() { if (document.visibilityState === 'visible' && !busy.value) { void refreshCount(); if (expanded.value) void load() } }
onMounted(() => {
  window.addEventListener('focus', onFocus)
  document.addEventListener('visibilitychange', onFocus)
  interval = setInterval(onFocus, 60000)
})
onUnmounted(() => {
  disposed = true; version++; countVersion++; clearInterval(interval); close()
  window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onFocus)
})
</script>

<template>
  <div v-if="user" class="library-notifications">
    <button data-action="ghost" class="ui-action notification-menu-item" type="button" :aria-label="`Notificações${unread ? `, ${unread} não lidas` : ''}`" :aria-busy="counting" aria-haspopup="dialog" aria-controls="notifications-dialog" @click="open">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 4h16v16H4zM8 9h8m-8 5h5" /></svg>
      <span>Notificações</span><span v-if="unread" class="notification-count" aria-hidden="true">{{ unread > 99 ? '99+' : unread }}</span>
    </button>
    <Teleport to="body">
    <RequestLoading :message="busy ? 'Atualizando notificações…' : loading ? 'Carregando notificações…' : ''" />
    <ToastNotice v-if="!expanded" :model-value="error" kind="error" />
    <ToastNotice v-if="!expanded" v-model="notice" />
    <BaseModal v-model="expanded" id="notifications-dialog" class="notifications-dialog" aria-labelledby="notifications-title" @opened="load()" @closed="emit('closed')">
      <ModalHeader close-label="Fechar notificações" @close="close"><h2 id="notifications-title">Notificações <small v-if="unread">{{ unread }} não lidas</small></h2></ModalHeader>
      <div class="notifications-body modal-body">
        <p class="notifications-caption">Comentários recebidos nos seus livros. Clique para abrir a página e a conversa.</p>
        <div class="notifications-actions"><button data-action="ghost" class="ui-action" type="button" :disabled="busy || loading" @click="load()"><span class="action-icon" aria-hidden="true">↻</span>Atualizar</button><button data-action="ghost" class="ui-action notification-mark-read" type="button" :disabled="busy || loading || !unread" @click="markRead()">Marcar todas como lidas</button></div>
        <ToastNotice v-if="expanded" :model-value="error" kind="error" /><ToastNotice v-if="expanded" v-model="notice" />
        <p v-if="!loading && !items.length && !error" class="notifications-empty">Nenhuma notificação por enquanto.</p>
        <ul v-if="items.length"><li v-for="item in items" :key="item.id"><button class="notification-item" :class="{ unread: !item.read_at }" type="button" :disabled="busy || loading" @click="markRead(item)"><span class="notification-indicator" aria-hidden="true"></span><span><strong>{{ item.display_name }}</strong> comentou em <strong>{{ item.book_title }}</strong><span class="notification-meta">Página {{ item.page_number }} · {{ formatDate(item.created_at) }}{{ !item.read_at ? ' · Não lida' : '' }}</span></span><span aria-hidden="true">→</span></button></li></ul>
        <button data-action="ghost" class="ui-action" v-if="more" type="button" :disabled="busy || loading" @click="load(true)">Mostrar mais notificações</button>
      </div>
    </BaseModal>
    </Teleport>
  </div>
</template>

<style scoped>
.library-notifications { display: flex; align-items: center; width: 100%; }
button { min-height: 44px; padding: 8px 12px; border: 1px solid var(--line); border-radius: 0; background: var(--paper); color: var(--green); font: 500 12px var(--font-sans); cursor: pointer; }
button:disabled { opacity: .5; cursor: default; }
button:focus-visible { outline: 2px solid var(--green); outline-offset: 2px; }
.notification-menu-item.ui-action { width: 100%; justify-content: flex-start; }
.notification-count { margin-left: auto; min-width: 20px; padding: 1px 4px; background: var(--green); color: var(--paper); text-align: center; font-size: 10px; line-height: 1.4; }
h2 small { display: block; margin-top: 6px; font: 12px var(--font-sans); color: var(--muted); letter-spacing: normal; }
.notifications-caption, .notifications-empty { color: var(--muted); font-size: 13px; line-height: 1.7; }
.notifications-caption { margin: 0 0 16px; }
.notification-mark-read { border-color: transparent; background: transparent; font-weight: 400; color: var(--muted); }
.notification-mark-read:hover:not(:disabled) { background: color-mix(in srgb, var(--green) 8%, transparent); color: var(--green); }
.notifications-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
ul { margin: 0 0 16px; padding: 0; list-style: none; }
li + li { border-top: 1px solid var(--line); }
.notification-item { display: flex; align-items: flex-start; gap: 12px; width: 100%; padding: 16px 10px; border: 0; background: transparent; text-align: left; color: var(--ink); font-weight: 400; font-size: 13px; line-height: 1.7; }
.notification-item > span:nth-child(2) { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.notification-item:hover { background: color-mix(in srgb, var(--green) 7%, transparent); }
.notification-item.unread { background: color-mix(in srgb, var(--green) 5%, transparent); }
.notification-indicator { flex-shrink: 0; width: 6px; height: 6px; margin-top: 8px; background: transparent; border-radius: 0; }
.unread .notification-indicator { background: var(--green); }
.notification-meta { display: block; margin-top: 4px; color: var(--muted); font-size: 11px; }
@media (max-width: 480px) { .notifications-actions { display: grid; grid-template-columns: 1fr; } }
</style>
