<script setup lang="ts">
import { useData, withBase } from 'vitepress'
import { onMounted, onUnmounted, ref } from 'vue'

const { isDark } = useData()
const menuOpen = ref(false)
const header = ref<HTMLElement | null>(null)
const menuButton = ref<HTMLButtonElement | null>(null)

function closeOnOutsideClick(event: PointerEvent) {
  if (event.target instanceof Node && !header.value?.contains(event.target)) menuOpen.value = false
}

function closeOnEscape(event: KeyboardEvent) {
  if (event.key === 'Escape' && menuOpen.value) {
    menuOpen.value = false
    menuButton.value?.focus()
  }
}

onMounted(() => document.addEventListener('pointerdown', closeOnOutsideClick))
onUnmounted(() => document.removeEventListener('pointerdown', closeOnOutsideClick))
</script>

<template>
  <header ref="header" class="topbar" @keydown="closeOnEscape">
    <a class="wordmark" :href="withBase('/')" aria-label="Caio Front-end Notes, início" @click="menuOpen = false">
      <span class="wordmark-mark">c<span>.</span></span>
      <span class="wordmark-copy"><span>CAIO / BLOG</span><strong>FRONT-END NOTES</strong></span>
    </a>
    <button ref="menuButton" class="menu-toggle" type="button" aria-controls="main-navigation" :aria-expanded="menuOpen" @click="menuOpen = !menuOpen">
      <span>Menu</span>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path :d="menuOpen ? 'm6 6 12 12M6 18 18 6' : 'M4 6h16M4 12h16M4 18h16'" />
      </svg>
    </button>
    <nav id="main-navigation" class="header-actions" :class="{ 'is-open': menuOpen }" aria-label="Navegação principal">
      <a :href="withBase('/#comece-aqui')" @click="menuOpen = false">Comece aqui</a>
      <a :href="withBase('/#artigos')" @click="menuOpen = false">Artigos</a>
      <button class="theme-toggle" :aria-label="isDark ? 'Ativar tema claro' : 'Ativar tema escuro'" @click="isDark = !isDark">
        {{ isDark ? '☀' : '☾' }}
      </button>
    </nav>
  </header>
</template>
