<script setup lang="ts">
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
  expanded.value = false
  if (user.value) void refresh()
}, { immediate: true })

async function act(operation: 'request' | 'accept' | 'remove', friend?: LibraryFriend) {
  if (!user.value || busy.value) return
  if (operation === 'request' && !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(friendCode.value.trim())) {
    error.value = 'Cole o código completo que seu amigo compartilhou com você.'
    return
  }
  if (operation === 'remove' && friend?.status === 'accepted'
    && !window.confirm(`Remover a amizade com ${friend.display_name}? Vocês deixarão de acessar os livros um do outro.`)) return
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
onUnmounted(() => { generation++; window.removeEventListener('focus', onFocus) })
</script>

<template>
  <section class="friends-panel" aria-label="Amigos da biblioteca">
    <div class="friends-heading"><div><p class="eyebrow">LEITURAS EM BOA COMPANHIA</p><h2>Amigos & estantes <span>{{ accepted.length }}</span></h2></div><div class="friends-actions"><button type="button" :disabled="loading || busy" @click="refresh">Atualizar</button><button type="button" :aria-expanded="expanded" aria-controls="friends-settings" @click="expanded = !expanded">{{ expanded ? 'Fechar' : received ? `Convites recebidos (${received})` : 'Adicionar amigo' }} <span aria-hidden="true">{{ expanded ? '−' : '+' }}</span></button></div></div>
    <p class="friends-caption">Após o aceite, vocês compartilham todos os livros atuais e futuros das duas estantes. Sua página e seu status de leitura continuam só seus.</p>
    <div v-if="expanded" id="friends-settings" class="friends-settings">
      <label>Seu código de amizade<span class="invite-code"><input :value="code" readonly aria-label="Seu código de amizade" placeholder="Carregando código…" @focus="($event.target as HTMLInputElement).select()"><button type="button" :disabled="!code" @click="copyCode">Copiar</button></span><small>Compartilhe este código. Você decide quais solicitações aceitar.</small></label>
      <form @submit.prevent="act('request')"><label>Código do seu amigo<input v-model="friendCode" maxlength="36" autocomplete="off" placeholder="Cole aqui o código recebido" required :disabled="busy"></label><button type="submit" :disabled="busy || !friendCode.trim()">Enviar solicitação</button></form>
    </div>
    <p v-if="loading" class="friends-message" role="status">Atualizando amizades…</p>
    <p v-if="error" class="friends-error" role="alert">{{ error }} <button type="button" :disabled="busy || loading" @click="refresh">Atualizar lista</button></p>
    <p v-if="notice" class="friends-message" role="status">{{ notice }}</p>
    <div v-if="expanded && pending.length" class="friend-requests"><h3>Solicitações</h3><div v-for="friend in pending" :key="friend.friendship_id" class="friend-row"><span class="friend-avatar" aria-hidden="true">{{ friend.display_name.slice(0, 1).toUpperCase() }}</span><div class="friend-name"><strong>{{ friend.display_name }}</strong><small>{{ friend.direction === 'received' ? 'Quer compartilhar estantes com você' : 'Aguardando aceite' }}</small></div><template v-if="friend.direction === 'received'"><button class="accept-friend" type="button" :disabled="busy" @click="act('accept', friend)">Aceitar e compartilhar</button><button type="button" :disabled="busy" @click="act('remove', friend)">Recusar</button></template><button v-else type="button" :disabled="busy" @click="act('remove', friend)">Cancelar</button></div></div>
    <div v-if="accepted.length" class="friend-list"><div v-for="friend in accepted" :key="friend.friendship_id" class="friend-row"><span class="friend-avatar" aria-hidden="true">{{ friend.display_name.slice(0, 1).toUpperCase() }}</span><div class="friend-name"><strong>{{ friend.display_name }}</strong><small>Estante compartilhada</small></div><button class="visit-friend" type="button" :disabled="busy" @click="emit('visit', friend)">Ver livros ↗</button><button v-if="expanded" type="button" :disabled="busy" :aria-label="`Remover amizade com ${friend.display_name}`" @click="act('remove', friend)">Remover</button></div></div>
    <p v-else-if="!loading && !error" class="friends-empty">Uma boa leitura fica ainda melhor quando é compartilhada. Convide alguém para começar.</p>
  </section>
</template>

<style scoped>
.friends-panel { border: 1px solid var(--line); border-radius: 8px; padding: 24px; margin: 0 0 30px; background: var(--surface); }
.friends-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.friends-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
h2 { font: 500 24px/1.3 var(--display); letter-spacing: -.03em; margin: 6px 0; }
h2 > span { font: 11px var(--mono); color: var(--muted); margin-left: 8px; }
.friends-caption, .friends-empty { font-size: 12px; color: var(--muted); line-height: 1.8; }
.friends-caption { margin: 12px 0 20px; max-width: 650px; }
.friends-empty { margin-bottom: 0; }
button { min-height: 44px; padding: 9px 12px; border: 1px solid var(--line); border-radius: 5px; color: var(--green); background: var(--paper); font: 500 12px 'DM Sans', sans-serif; cursor: pointer; }
button:disabled { opacity: .5; cursor: wait; }
.friends-settings { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; border-top: 1px solid var(--line); padding: 22px 0; }
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
.friend-row { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; padding: 14px 0; border-top: 1px solid var(--line); }
.friend-avatar { width: 34px; height: 34px; display: grid; place-items: center; flex-shrink: 0; border-radius: 50%; color: var(--green); background: var(--paper); border: 1px solid var(--line); font-size: 13px; }
.friend-name { display: flex; flex: 1; min-width: 120px; flex-direction: column; gap: 5px; overflow-wrap: anywhere; }
.friend-name strong { color: var(--ink); font-size: 13px; font-weight: 500; }
.friend-name small { color: var(--muted); font-size: 11px; }
.visit-friend { margin-left: auto; }
@media (max-width: 640px) { .friends-settings { grid-template-columns: 1fr; } .friends-heading { align-items: flex-start; flex-direction: column; } .friends-panel { padding: 20px; } .friends-heading button { width: 100%; } }
</style>
