<script setup lang="ts">
import BaseModal from './BaseModal.vue'
import ModalHeader from './ModalHeader.vue'
import RequestLoading from './RequestLoading.vue'
import ToastNotice from './ToastNotice.vue'
import ActionDropdown from './ActionDropdown.vue'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { withBase } from 'vitepress'
import { useAuth } from '../composables/useAuth'
import { getSupabase } from '../supabase'
import type { LibraryFriend } from '../library'

const emit = defineEmits<{
  visit: [friend: LibraryFriend]
  refreshed: [friends: LibraryFriend[]]
}>()
const { user } = useAuth()
const friends = ref<LibraryFriend[]>([])
const code = ref('')
const friendCode = ref('')
const expanded = ref(false)
function openDialog() { if (user.value) expanded.value = true }
function closeDialog() { expanded.value = false }
const loading = ref(false)
const busy = ref(false)
const error = ref('')
const notice = ref('')
let generation = 0
const accepted = computed(() => friends.value.filter(friend => friend.status === 'accepted'))
const pending = computed(() => friends.value.filter(friend => friend.status === 'pending'))
const received = computed(() => pending.value.filter(friend => friend.direction === 'received').length)

let lastRefresh = 0
async function refresh(force = false) {
  const owner = user.value?.id
  if (!owner || loading.value || (!force && Date.now() - lastRefresh < 1000)) return
  lastRefresh = Date.now()
  const ticket = ++generation
  loading.value = true
  error.value = ''
  try {
    const client = await getSupabase(withBase('/'))
    const [list, invite] = await Promise.all([
      client.rpc('library_list_friends'), client.rpc('library_my_friend_code'),
    ])
    if (ticket !== generation || user.value?.id !== owner) return
    if (list.error || invite.error) throw list.error ?? invite.error
    friends.value = list.data ?? []
    code.value = invite.data ?? ''
    emit('refreshed', friends.value)
  } catch {
    if (ticket === generation) error.value = 'Não foi possível carregar as amizades. Tente atualizar em instantes.'
  } finally {
    if (ticket === generation) loading.value = false
  }
}
watch(() => user.value?.id, () => {
  generation++
  lastRefresh = 0
  friends.value = []
  code.value = ''
  friendCode.value = ''
  notice.value = ''
  error.value = ''
  busy.value = false
  loading.value = false
  closeDialog()
  if (user.value) void refresh()
}, { immediate: true })

async function act(operation: 'request' | 'accept' | 'remove', friend?: LibraryFriend) {
  if (!user.value || busy.value || loading.value) return
  if (operation === 'request' && !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(friendCode.value.trim())) {
    error.value = 'Cole o código completo que seu amigo compartilhou com você.'
    return
  }
  if (operation === 'remove' && friend?.status === 'accepted'
    && !window.confirm(`Remover a amizade com ${friend.display_name}? Vocês deixarão de acessar os livros compartilhados um do outro.`)) return
  const owner = user.value.id
  const ticket = generation
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    const client = await getSupabase(withBase('/'))
    const result = operation === 'request'
      ? await client.rpc('library_request_friendship', { friend_code: friendCode.value.trim() })
      : await client.rpc(operation === 'accept' ? 'library_accept_friendship' : 'library_remove_friendship', { friendship_id: friend!.friendship_id })
    if (ticket !== generation || user.value?.id !== owner) return
    if (result.error) throw result.error
    friendCode.value = ''
    notice.value = operation === 'request' ? 'Solicitação enviada. O acesso depende do aceite do seu amigo.'
      : operation === 'accept' ? 'Amizade aceita. Vocês já podem explorar as estantes um do outro.'
        : 'Solicitação ou amizade removida.'
    if (operation === 'accept') closeDialog()
    await refresh(true)
  } catch {
    if (user.value?.id === owner && ticket === generation) error.value = operation === 'request'
      ? 'Não foi possível enviar. Confira o código e use o código de outra pessoa.'
      : 'Não foi possível atualizar a amizade. Atualize a lista e tente novamente.'
  } finally {
    if (user.value?.id === owner) busy.value = false
  }
}
async function copyCode() {
  try {
    await navigator.clipboard.writeText(code.value)
    notice.value = 'Código copiado. Compartilhe com a pessoa que deseja adicionar.'
  } catch {
    notice.value = 'Selecione o código acima e copie manualmente.'
  }
}
function onFocus() { if (user.value && !busy.value) void refresh() }
onMounted(() => window.addEventListener('focus', onFocus))
onUnmounted(() => { generation++; closeDialog(); window.removeEventListener('focus', onFocus) })
</script>

<template>
  <section class="friends-area" aria-label="Amigos da biblioteca">
    <RequestLoading :message="busy ? 'Atualizando amizade…' : loading ? 'Carregando amizades…' : ''" />
    <div class="friends-actions"><button data-action="ghost" class="ui-action" type="button" :disabled="loading || busy" @click="refresh()"><span class="action-icon" aria-hidden="true">↻</span>Atualizar</button><button data-action="open" class="ui-action add-friend" type="button" aria-haspopup="dialog" aria-controls="friends-dialog" @click="openDialog"><span class="action-icon" aria-hidden="true">+</span>{{ received ? `Convites recebidos (${received})` : 'Adicionar amigo' }}</button></div>
    <div class="friends-panel">
    <header class="friends-heading"><h2>Amigos <span>{{ accepted.length }}</span></h2></header>
    <p class="friends-caption">Amigos podem ler seus livros compartilhados. Livros privados e progresso continuam individuais.</p>
    <p v-if="loading && !expanded" class="friends-message" role="status">Atualizando amizades…</p>
    <ToastNotice v-if="!expanded" :model-value="error" kind="error" />
    <ToastNotice v-if="!expanded" v-model="notice" />
    <BaseModal v-model="expanded" id="friends-dialog" class="friends-dialog" aria-labelledby="friends-dialog-title" aria-describedby="friends-dialog-description">
      <ModalHeader class="dialog-heading" close-label="Fechar janela de amigos" @close="closeDialog"><h2 id="friends-dialog-title">Adicionar amigo</h2></ModalHeader>
      <div class="friends-modal-body modal-body">
      <p id="friends-dialog-description" class="dialog-description">Compartilhe seu código ou use o código de um amigo para enviar um convite.</p>
    <div class="friends-settings">
      <label>Seu código de amizade<span class="invite-code"><input :value="code" readonly aria-label="Seu código de amizade" placeholder="Carregando código…" @focus="($event.target as HTMLInputElement).select()"><button data-action="ghost" class="ui-action" type="button" :disabled="!code" @click="copyCode">Copiar</button></span></label>
      <form @submit.prevent="act('request')"><label>Código do seu amigo<input v-model="friendCode" autofocus maxlength="36" autocomplete="off" placeholder="Cole aqui o código recebido" required :disabled="busy"></label><button data-action="primary" class="ui-action" type="submit" :disabled="busy || !friendCode.trim()">Enviar solicitação</button></form>
    </div>

      <p v-if="loading" class="friends-message" role="status">Atualizando amizades…</p>
      <ToastNotice v-if="expanded" :model-value="error" kind="error" />
      <ToastNotice v-if="expanded" v-model="notice" />
    <div v-if="pending.length" class="friend-requests friends-scroll" tabindex="0" role="region" aria-label="Solicitações de amizade"><h3>Solicitações</h3><div v-for="friend in pending" :key="friend.friendship_id" class="friend-row"><span class="friend-avatar" aria-hidden="true">{{ friend.display_name.slice(0, 1).toUpperCase() }}</span><div class="friend-name"><strong>{{ friend.display_name }}</strong><small>{{ friend.direction === 'received' ? 'Quer compartilhar estantes com você' : 'Aguardando aceite' }}</small></div><template v-if="friend.direction === 'received'"><button data-action="primary" class="ui-action accept-friend" type="button" :disabled="busy" @click="act('accept', friend)">Aceitar e compartilhar</button><button data-action="danger" class="ui-action" type="button" :disabled="busy" @click="act('remove', friend)">Recusar convite</button></template><button data-action="danger" class="ui-action" v-else type="button" :disabled="busy" @click="act('remove', friend)">Cancelar convite</button></div></div>

      </div>
    </BaseModal>
    <div v-if="accepted.length" class="friend-list friends-scroll" tabindex="0" role="region" aria-label="Estantes dos amigos"><div v-for="friend in accepted" :key="friend.friendship_id" class="friend-row"><div class="friend-identity"><span class="friend-avatar" aria-hidden="true">{{ friend.display_name.slice(0, 1).toUpperCase() }}</span><div class="friend-name"><strong>{{ friend.display_name }}</strong></div></div><ActionDropdown :menu-id="`friend-actions-${friend.friendship_id}`" :label="`Opções da amizade com ${friend.display_name}`" menu-label="Ações da amizade" :disabled="busy || loading" :actions="[
      { id: 'visit', label: 'Ver livros', kind: 'navigate', icon: 'books' },
      { id: 'remove', label: 'Remover', ariaLabel: `Remover amizade com ${friend.display_name}`, kind: 'danger-ghost', icon: 'delete' },
    ]" @select="action => action === 'visit' ? emit('visit', friend) : act('remove', friend)" /></div></div>
    <p v-else-if="!loading && !error" class="friends-empty">Nenhum amigo adicionado.</p>
    </div>
  </section>
</template>

<style scoped>
.friends-modal-body .friends-scroll { max-height: none; overflow: visible; scrollbar-gutter: auto; }
.dialog-description { max-width: 540px; color: var(--muted); font-size: 13px; line-height: 1.8; margin: 10px 0 24px; }
.friends-panel { border: 1px solid var(--line); border-radius: 0; padding: 24px; margin: 0 0 30px; background: var(--surface); }
.friends-actions { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
h2 { font: 500 24px/1.3 var(--display); letter-spacing: -.03em; margin: 6px 0; }
h2 > span { font: 11px var(--mono); color: var(--muted); margin-left: 8px; }
.friends-caption, .friends-empty { font-size: 12px; color: var(--muted); line-height: 1.8; }
.friends-caption { margin: 12px 0 20px; max-width: 650px; }
.friends-empty { margin-bottom: 0; }
button { min-height: 44px; padding: 9px 12px; border: 1px solid var(--line); border-radius: 0; color: var(--green); background: var(--paper); font: 500 12px var(--font-sans); cursor: pointer; }
button:disabled { opacity: .5; cursor: default; }
.friends-settings { display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px; padding: 0 0 8px; }
.friends-settings > label, .friends-settings > form { padding: 20px; border: 1px solid var(--line); border-radius: 0; background: var(--paper); }
.friends-settings form button { width: 100%; }
.add-friend { background: var(--green); color: var(--paper); border-color: var(--green); }
label { display: flex; flex-direction: column; gap: 10px; font-size: 12px; color: var(--muted); min-width: 0; }
label small { font-size: 11px; line-height: 1.6; }
input { min-width: 0; width: 100%; min-height: 44px; padding: 10px; border: 1px solid var(--line); border-radius: 0; background: var(--paper); color: var(--ink); font: 12px var(--mono); }
.invite-code { display: flex; gap: 8px; }
form { display: flex; align-items: flex-start; flex-direction: column; gap: 12px; }
form label { width: 100%; }
form button, .accept-friend { background: var(--green); color: var(--paper); border-color: var(--green); }
.friends-message { font-size: 12px; line-height: 1.8; }
.friends-message { color: var(--green); }
h3 { font: 500 12px var(--display); color: var(--muted); }
.friends-scroll { max-height: min(340px, 45dvh); overflow-y: auto; overscroll-behavior: contain; scrollbar-gutter: stable; scrollbar-width: thin; scrollbar-color: var(--line) transparent; }
.friends-scroll > h3 { position: sticky; top: 0; z-index: 1; margin: 0; padding: 14px 0; background: var(--surface); }
.friend-row { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; padding: 14px 0; border-top: 1px solid var(--line); }
.friend-identity { display: flex; align-items: center; flex: 1; gap: 10px; min-width: 0; }
.friend-identity .friend-name { min-width: 0; }
.friend-avatar { width: 34px; height: 34px; display: grid; place-items: center; flex-shrink: 0; border-radius: 0; color: var(--green); background: var(--paper); border: 1px solid var(--line); font-size: 13px; }
.friend-name { display: flex; flex: 1; min-width: 120px; flex-direction: column; gap: 5px; overflow-wrap: anywhere; }
.friend-name strong { color: var(--ink); font-size: 13px; font-weight: 500; }
.friend-name small { color: var(--muted); font-size: 11px; }
@media (max-width: 640px) { .friend-list .friend-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 12px; padding-block: 16px; } .friend-list { scroll-padding-block: 16px; } .friends-settings > label, .friends-settings > form { padding: 16px; } .friends-settings { grid-template-columns: 1fr; } .friends-panel { padding: 20px; } }
</style>
