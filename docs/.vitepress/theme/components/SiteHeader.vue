<script setup lang="ts">
import { withBase } from 'vitepress'
import { onMounted, onUnmounted, ref } from 'vue'
import FocusAudio from './FocusAudio.vue'
import GoogleLogin from './GoogleLogin.vue'

const menuOpen = ref(false)
const mobile = ref(false)
const navigation = ref<HTMLElement>()
const menuButton = ref<HTMLButtonElement>()
const position = ref({ top: '0px', left: '0px' })
let media: MediaQueryList | undefined
function closeNavigation(restoreFocus = false) {
  if (navigation.value?.matches(':popover-open')) navigation.value.hidePopover()
  menuOpen.value = false
  if (restoreFocus) menuButton.value?.focus({ preventScroll: true })
}
function updateMobile() { closeNavigation(); mobile.value = media?.matches ?? false }
function toggleNavigation(focusFirst = false) {
  if (!mobile.value || !navigation.value || !menuButton.value) return
  if (menuOpen.value) { closeNavigation(); return }
  const bounds = menuButton.value.getBoundingClientRect()
  const width = Math.min(260, window.innerWidth - 32)
  position.value = { top: `${bounds.bottom + 8}px`, left: `${Math.max(16, Math.min(bounds.right - width, window.innerWidth - width - 16))}px` }
  navigation.value.showPopover()
  menuOpen.value = true
  if (focusFirst) navigation.value.querySelector<HTMLAnchorElement>('a')?.focus({ preventScroll: true })
}
function onToggle(event: Event) { menuOpen.value = (event as ToggleEvent).newState === 'open' }
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && menuOpen.value) { event.preventDefault(); event.stopPropagation(); closeNavigation(true) }
}
function onScroll(event: Event) {
  if (event.target instanceof Node && navigation.value?.contains(event.target)) return
  closeNavigation()
}
onMounted(() => {
  media = window.matchMedia('(max-width: 900px)')
  updateMobile()
  media.addEventListener('change', updateMobile)
  window.addEventListener('resize', closeNavigationOnResize)
  document.addEventListener('scroll', onScroll, true)
})
function closeNavigationOnResize() { closeNavigation() }
onUnmounted(() => {
  closeNavigation()
  media?.removeEventListener('change', updateMobile)
  window.removeEventListener('resize', closeNavigationOnResize)
  document.removeEventListener('scroll', onScroll, true)
})
</script>

<template>
  <header class="topbar" @keydown="onKeydown">
    <a class="wordmark" :href="withBase('/')" aria-label="Caio Front-end Notes, início" @click="closeNavigation()">
      <span class="wordmark-mark">c<span>.</span></span>
    </a>
    <div class="header-tools">
    <nav id="main-navigation" ref="navigation" class="header-actions" :popover="mobile ? 'auto' : undefined" :style="mobile ? position : undefined" aria-label="Navegação principal" @toggle="onToggle">
      <a :href="withBase('/')" @click="closeNavigation()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9" /></svg>Início</a>
      <a :href="withBase('/#artigos')" @click="closeNavigation()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 3h10l4 4v14H5V3Zm10 0v5h4M8 12h8m-8 4h8" /></svg>Artigos</a>
      <a :href="withBase('/livros.html')" @click="closeNavigation()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 4h6v16H4zM14 4h6v16h-6zM4 8h6M14 8h6" /></svg>Livros</a>
      <FocusAudio />
    </nav>
    <div class="header-account" @click="closeNavigation()"><GoogleLogin /></div>
    <button ref="menuButton" class="menu-toggle" type="button" aria-label="Menu de navegação" aria-controls="main-navigation" :aria-expanded="menuOpen" @click="toggleNavigation()" @keydown.down.prevent="toggleNavigation(true)">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path :d="menuOpen ? 'm6 6 12 12M6 18 18 6' : 'M4 6h16M4 12h16M4 18h16'" /></svg>
    </button>
    </div>
  </header>
</template>
