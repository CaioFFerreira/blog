<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import RequestLoading from './RequestLoading.vue'
import ToastNotice from './ToastNotice.vue'
import LibraryNotifications from './LibraryNotifications.vue'
import { useData } from 'vitepress'
import { useAuth } from '../composables/useAuth'

const { frontmatter, isDark } = useData()
const { user, ready, busy, errorMessage, accountName, signIn, signOut } = useAuth()
const trigger = ref<HTMLButtonElement>()
const dropdown = ref<HTMLElement>()
const expanded = ref(false)
const mounted = ref(false)
const position = ref({ top: '0px', left: '0px' })
function closeMenu() { dropdown.value?.hidePopover(); expanded.value = false }
async function openMenu(focusFirst = false) {
  if (!user.value || busy.value) return
  if (expanded.value) { closeMenu(); return }
  const bounds = trigger.value?.getBoundingClientRect()
  if (!bounds) return
  const width = Math.min(260, window.innerWidth - 32)
  position.value = {
    left: `${Math.max(16, Math.min(bounds.right - width, window.innerWidth - width - 16))}px`,
    top: `${Math.max(16, Math.min(bounds.bottom + 8, window.innerHeight - 190))}px`,
  }
  await nextTick()
  dropdown.value?.showPopover()
  expanded.value = true
  if (focusFirst) dropdown.value?.querySelector<HTMLButtonElement>('button')?.focus()
}
function onToggle(event: Event) { expanded.value = (event as ToggleEvent).newState === 'open' }
function changeTheme() { isDark.value = !isDark.value; closeMenu(); trigger.value?.focus() }
function logout() { closeMenu(); void signOut() }
watch(() => user.value?.id, closeMenu)
onMounted(() => {
  mounted.value = true
  window.addEventListener('resize', closeMenu)
  document.addEventListener('scroll', closeMenu, true)
})
onUnmounted(() => {
  closeMenu()
  window.removeEventListener('resize', closeMenu)
  document.removeEventListener('scroll', closeMenu, true)
})
</script>

<template>
  <div class="google-login" :aria-busy="busy || !ready">
    <template v-if="user">
      <button ref="trigger" class="account-trigger" type="button" :disabled="busy" :aria-expanded="expanded" aria-controls="account-dropdown" :aria-label="`Opções da conta de ${accountName}`" @click="openMenu()" @keydown.down.prevent="openMenu(true)">
        <span class="account-avatar" aria-hidden="true">{{ accountName.slice(0, 1).toUpperCase() }}</span>
        <span class="account-name" :title="accountName">{{ accountName }}</span>
        <svg class="account-chevron" :class="{ expanded }" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      <LibraryNotifications />
    </template>
    <template v-else>
      <button data-action="primary" class="ui-action" type="button" :disabled="!ready || busy" @click="signIn(frontmatter.layout === 'library' ? '/livros.html' : '/')">{{ !ready ? 'Carregando conta…' : busy ? 'Entrando…' : 'Entrar com Google' }}</button>
      <button data-action="ghost" class="ui-action guest-theme" type="button" :aria-label="isDark ? 'Ativar tema claro' : 'Ativar tema escuro'" @click="isDark = !isDark">{{ isDark ? '☀' : '☾' }}</button>
    </template>
    <Teleport v-if="mounted" to="body">
      <div id="account-dropdown" ref="dropdown" class="account-dropdown" popover="auto" :style="position" role="group" aria-label="Opções da conta" @toggle="onToggle">
        <p class="dropdown-name">{{ accountName }}</p>
        <button data-action="ghost" class="ui-action" type="button" @click="changeTheme"><span aria-hidden="true">{{ isDark ? '☀' : '☾' }}</span>{{ isDark ? 'Ativar tema claro' : 'Ativar tema escuro' }}</button>
        <button data-action="ghost" class="ui-action account-logout" type="button" :disabled="busy" @click="logout"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M9 4H4v16h5m5-13 5 5-5 5m-5-5h10" /></svg>Sair da conta</button>
      </div>
      <RequestLoading :message="busy ? (user ? 'Saindo da conta…' : 'Conectando com Google…') : ''" />
      <ToastNotice :model-value="errorMessage" kind="error" />
    </Teleport>
  </div>
</template>

<style scoped>
.google-login { display: flex; position: relative; align-items: center; gap: 12px; min-width: 0; padding-left: 24px; border-left: 1px solid var(--line); }
button { min-height: 44px; padding: 8px 12px; border: 1px solid var(--line); border-radius: 2px; background: var(--surface); color: var(--green); font: inherit; cursor: pointer; }
button:disabled { opacity: .6; cursor: default; }
button:focus-visible { outline: 2px solid var(--green); outline-offset: 3px; }
.account-trigger { display: flex; align-items: center; gap: 10px; min-width: 0; padding: 4px 6px; border-color: transparent; background: transparent; }
.account-trigger:hover { background: var(--surface); }
.account-avatar { display: grid; place-items: center; flex-shrink: 0; width: 30px; height: 30px; border-radius: 50%; background: var(--green); color: var(--paper); font-weight: 700; }
.account-name { max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--ink); font-size: 13px; }
.account-chevron { flex-shrink: 0; color: var(--muted); transition: transform .15s; }
.account-chevron.expanded { transform: rotate(180deg); }
.guest-theme { width: 44px; padding: 0; font-size: 23px; }
.account-dropdown { position: fixed; box-sizing: border-box; width: min(260px, calc(100vw - 32px)); max-height: calc(100dvh - 32px); margin: 0; padding: 6px; overflow-y: auto; border: 1px solid var(--line); border-radius: 2px; background: var(--surface); color: var(--ink); box-shadow: 0 10px 36px #0003; }
.dropdown-name { margin: 0 4px 6px; padding: 10px 8px 14px; border-bottom: 1px solid var(--line); color: var(--muted); font: 12px/1.6 var(--font-sans); overflow-wrap: anywhere; }
.account-dropdown button { display: flex; align-items: center; gap: 12px; width: 100%; padding: 10px 12px; border: 0; text-align: left; font: 13px var(--font-sans); }
.account-dropdown button:hover { background: color-mix(in srgb, var(--green) 8%, transparent); }
.account-dropdown button > span { display: inline-grid; place-items: center; width: 18px; font-size: 20px; }
@media (max-width: 900px) { .google-login { width: 100%; padding: 12px 0 0; margin-top: 8px; border-left: 0; border-top: 1px solid var(--line); } .account-trigger { flex: 1; padding-inline: 12px; } .account-name { max-width: none; flex: 1; text-align: left; } .guest-theme { margin-left: auto; } }
</style>
