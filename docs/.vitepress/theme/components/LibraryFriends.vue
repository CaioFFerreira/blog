<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
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
const friendDialog = ref<HTMLDialogElement>()
const dialogTrigger = ref<HTMLButtonElement>()
let previousOverflow = ''
let scrollLocked = false

async function openDialog() {
  expanded.value = true
  await nextTick()
  if (!user.value || !friendDialog.value || friendDialog.value.open) return
  friendDialog.value.showModal()
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  scrollLocked = true
}
function releaseDialog() {
  expanded.value = false
  if (scrollLocked) {
    document.body.style.overflow = previousOverflow
    scrollLocked = false
  }
}
function closeDialog() {
  friendDialog.value?.close()
  releaseDialog()
}
function onDialogClose() {
  releaseDialog()
  if (dialogTrigger.value?.isConnected) dialogTrigger.value.focus({ preventScroll: true })
}
function closeOnBackdrop(event: MouseEvent) {
  if (event.target !== friendDialog.value) return
  const bounds = friendDialog.value.getBoundingClientRect()
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeDialog()
}
function trapFocus(event: KeyboardEvent) {
  if (event.key !== 'Tab' || !friendDialog.value?.open) return
  const controls = Array.from(friendDialog.value.querySelectorAll<HTMLElement>(
    'button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]',
  )).filter(element => element.tabIndex >= 0 && element.getClientRects().length > 0)
  const first = controls[0]
  const last = controls[controls.length - 1]
  if (!first || !last) return
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}
const loading = ref(false)
const busy = ref(false)
const error = ref('')
const notice = ref('')
let generation = 0
const accepted = computed(() => friends.value.filter(friend => friend.status === 'accepted'))
const pending = computed(() => friends.value.filter(friend => friend.status === 'pending'))
const received = computed(() => pending.value.filter(friend => friend.direction === 'received').length)

async function refresh() {
  const owner = user.value?.id
  if (!owner) return
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
  if (!user.value || busy.value) return
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
    await refresh()
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
  <section class="friends-panel" aria-label="Amigos da biblioteca">
    <div class="friends-heading"><div><p class="eyebrow">LEITURAS EM BOA COMPANHIA</p><h2>Amigos & estantes <span>{{ accepted.length }}</span></h2></div><div class="friends-actions"><button type="button" :disabled="loading || busy" @click="refresh">Atualizar</button><button ref="dialogTrigger" class="add-friend" type="button" aria-haspopup="dialog" aria-controls="friends-dialog" @click="openDialog">{{ received ? `Convites recebidos (${received})` : 'Adicionar amigo' }} <span aria-hidden="true">+</span></button></div></div>
    <p class="friends-caption">Após o aceite, vocês acessam os livros marcados como compartilhados nas duas estantes. Livros privados continuam só com o dono. Sua página e seu status de leitura continuam só seus.</p>
    <p v-if="loading && !expanded" class="friends-message" role="status">Atualizando amizades…</p>
    <p v-if="error && !expanded" class="friends-error" role="alert">{{ error }} <button type="button" :disabled="busy || loading" @click="refresh">Atualizar lista</button></p>
    <p v-if="notice && !expanded" class="friends-message" role="status">{{ notice }}</p>
    <dialog id="friends-dialog" ref="friendDialog" class="friends-dialog" aria-labelledby="friends-dialog-title" aria-describedby="friends-dialog-description" @cancel.prevent="closeDialog" @close="onDialogClose" @click="closeOnBackdrop" @keydown="trapFocus">
      <div class="dialog-heading"><div><p class="eyebrow">BOAS LEITURAS, BOAS COMPANHIAS</p><h2 id="friends-dialog-title">Conecte suas estantes.</h2></div><button class="dialog-close" type="button" aria-label="Fechar janela de amigos" @click="closeDialog"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg></button></div>
      <div class="friends-modal-body">
      <p id="friends-dialog-description" class="dialog-description">Compartilhe seu código ou envie uma solicitação. Após o aceite, os livros compartilhados ficam disponíveis para ambos. Livros privados e progresso de leitura continuam individuais.</p>
    <div class="friends-settings">
      <label>Seu código de amizade<span class="invite-code"><input :value="code" readonly aria-label="Seu código de amizade" placeholder="Carregando código…" @focus="($event.target as HTMLInputElement).select()"><button type="button" :disabled="!code" @click="copyCode">Copiar</button></span><small>Compartilhe este código. Você decide quais solicitações aceitar.</small></label>
      <form @submit.prevent="act('request')"><label>Código do seu amigo<input v-model="friendCode" autofocus maxlength="36" autocomplete="off" placeholder="Cole aqui o código recebido" required :disabled="busy"></label><button type="submit" :disabled="busy || !friendCode.trim()">Enviar solicitação</button></form>
    </div>

      <p v-if="loading" class="friends-message" role="status">Atualizando amizades…</p>
      <p v-if="error" class="friends-error" role="alert">{{ error }} <button type="button" :disabled="busy || loading" @click="refresh">Atualizar lista</button></p>
      <p v-if="notice" class="friends-message" role="status">{{ notice }}</p>
    <div v-if="pending.length" class="friend-requests friends-scroll" tabindex="0" role="region" aria-label="Solicitações de amizade"><h3>Solicitações</h3><div v-for="friend in pending" :key="friend.friendship_id" class="friend-row"><span class="friend-avatar" aria-hidden="true">{{ friend.display_name.slice(0, 1).toUpperCase() }}</span><div class="friend-name"><strong>{{ friend.display_name }}</strong><small>{{ friend.direction === 'received' ? 'Quer compartilhar estantes com você' : 'Aguardando aceite' }}</small></div><template v-if="friend.direction === 'received'"><button class="accept-friend" type="button" :disabled="busy" @click="act('accept', friend)">Aceitar e compartilhar</button><button type="button" :disabled="busy" @click="act('remove', friend)">Recusar</button></template><button v-else type="button" :disabled="busy" @click="act('remove', friend)">Cancelar</button></div></div>

      </div>
      <footer class="dialog-footer"><span>Você escolhe quais convites aceitar.</span><button type="button" @click="closeDialog">Concluir</button></footer>
    </dialog>
    <div v-if="accepted.length" class="friend-list friends-scroll" tabindex="0" role="region" aria-label="Estantes dos amigos"><div v-for="friend in accepted" :key="friend.friendship_id" class="friend-row"><div class="friend-identity"><span class="friend-avatar" aria-hidden="true">{{ friend.display_name.slice(0, 1).toUpperCase() }}</span><div class="friend-name"><strong>{{ friend.display_name }}</strong><small>Estante compartilhada</small></div></div><div class="friend-row-actions"><button class="visit-friend" type="button" :disabled="busy" @click="emit('visit', friend)">Ver livros ↗</button><button class="remove-friend" type="button" :disabled="busy" :aria-label="`Remover amizade com ${friend.display_name}`" @click="act('remove', friend)">Remover</button></div></div></div>
    <p v-else-if="!loading && !error" class="friends-empty">Uma boa leitura fica ainda melhor quando é compartilhada. Convide alguém para começar.</p>
  </section>
</template>

<style scoped>
.friends-dialog { width: min(680px, calc(100vw - 32px)); max-height: calc(100dvh - 48px); margin: auto; padding: 0; overflow: hidden; overscroll-behavior: contain; border: 1px solid var(--line); border-radius: 16px; background: var(--surface); color: var(--ink); box-shadow: 0 24px 90px #0004; }
.friends-dialog[open] { display: flex; flex-direction: column; }
.friends-modal-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 0 30px 22px; scrollbar-gutter: stable; }
.friends-modal-body .friends-scroll { max-height: none; overflow: visible; scrollbar-gutter: auto; }
.friends-dialog::backdrop { background: #08130db3; backdrop-filter: blur(5px); }
.dialog-heading { flex-shrink: 0; padding: 22px 30px; border-bottom: 1px solid var(--line); display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.dialog-heading h2 { font-size: clamp(25px, 5vw, 32px); margin: 10px 0; }
.dialog-close { display: grid; place-items: center; flex-shrink: 0; width: 44px; padding: 0; border-radius: 50%; }
.dialog-description { max-width: 540px; color: var(--muted); font-size: 13px; line-height: 1.8; margin: 10px 0 24px; }
.dialog-footer { flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; gap: 16px; border-top: 1px solid var(--line); margin: 0; padding: 16px 30px; }
.dialog-footer span { color: var(--muted); font-size: 11px; line-height: 1.6; }
.remove-friend { color: #a32f32; border-color: #a32f3266; background: #a32f320a; }
.remove-friend:hover:not(:disabled) { background: #a32f321a; }
:global(.dark) .remove-friend { color: #f3a3a3; border-color: #f3a3a366; background: #f3a3a30a; }
.friends-panel { border: 1px solid var(--line); border-radius: 8px; padding: 24px; margin: 0 0 30px; background: var(--surface); }
.friends-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.friends-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
h2 { font: 500 24px/1.3 var(--display); letter-spacing: -.03em; margin: 6px 0; }
h2 > span { font: 11px var(--mono); color: var(--muted); margin-left: 8px; }
.friends-caption, .friends-empty { font-size: 12px; color: var(--muted); line-height: 1.8; }
.friends-caption { margin: 12px 0 20px; max-width: 650px; }
.friends-empty { margin-bottom: 0; }
button { min-height: 44px; padding: 9px 12px; border: 1px solid var(--line); border-radius: 5px; color: var(--green); background: var(--paper); font: 500 12px var(--font-sans); cursor: pointer; }
button:disabled { opacity: .5; cursor: wait; }
.friends-settings { display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px; padding: 0 0 8px; }
.friends-settings > label, .friends-settings > form { padding: 20px; border: 1px solid var(--line); border-radius: 10px; background: var(--paper); }
.friends-settings form button { width: 100%; }
.add-friend { background: var(--green); color: var(--paper); border-color: var(--green); }
label { display: flex; flex-direction: column; gap: 10px; font-size: 12px; color: var(--muted); min-width: 0; }
label small { font-size: 11px; line-height: 1.6; }
input { min-width: 0; width: 100%; min-height: 44px; padding: 10px; border: 1px solid var(--line); border-radius: 5px; background: var(--paper); color: var(--ink); font: 12px var(--mono); }
.invite-code { display: flex; gap: 8px; }
form { display: flex; align-items: flex-start; flex-direction: column; gap: 12px; }
form label { width: 100%; }
form button, .accept-friend { background: var(--green); color: var(--paper); border-color: var(--green); }
.friends-message, .friends-error { font-size: 12px; line-height: 1.8; }
.friends-message { color: var(--green); }
.friends-error { color: var(--orange); }
h3 { font: 500 12px var(--display); color: var(--muted); }
.friends-scroll { max-height: min(340px, 45dvh); overflow-y: auto; overscroll-behavior: contain; scrollbar-gutter: stable; scrollbar-width: thin; scrollbar-color: var(--line) transparent; }
.friends-scroll > h3 { position: sticky; top: 0; z-index: 1; margin: 0; padding: 14px 0; background: var(--surface); }
.friend-row { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; padding: 14px 0; border-top: 1px solid var(--line); }
.friend-identity { display: flex; align-items: center; flex: 1; gap: 10px; min-width: 0; }
.friend-row-actions { display: flex; flex-shrink: 0; gap: 8px; }
.friend-identity .friend-name { min-width: 0; }
.friend-avatar { width: 34px; height: 34px; display: grid; place-items: center; flex-shrink: 0; border-radius: 50%; color: var(--green); background: var(--paper); border: 1px solid var(--line); font-size: 13px; }
.friend-name { display: flex; flex: 1; min-width: 120px; flex-direction: column; gap: 5px; overflow-wrap: anywhere; }
.friend-name strong { color: var(--ink); font-size: 13px; font-weight: 500; }
.friend-name small { color: var(--muted); font-size: 11px; }
.visit-friend { margin-left: auto; }
@media (max-width: 640px) { .friend-list .friend-row { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; padding-block: 16px; } .friend-row-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); width: 100%; } .friend-row-actions button { width: 100%; min-width: 0; margin: 0; } .friends-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); width: 100%; } .friends-actions button { min-width: 0; } .friend-list { scroll-padding-block: 16px; } .friends-modal-body { padding: 0 20px 18px; } .dialog-heading { padding: 16px 20px; } .dialog-footer { padding: 12px 20px; } .friends-dialog { padding: 0; width: calc(100vw - 24px); max-height: calc(100dvh - 24px); border-radius: 12px; } .friends-dialog input { font-size: 16px; } .friends-settings > label, .friends-settings > form { padding: 16px; } .friends-settings { grid-template-columns: 1fr; } .friends-heading { align-items: flex-start; flex-direction: column; } .friends-panel { padding: 20px; } .friends-heading button { width: 100%; } }
</style>
