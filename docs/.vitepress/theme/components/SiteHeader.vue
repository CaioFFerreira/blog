<script setup lang="ts">
import { useData, withBase } from 'vitepress'

const { isDark } = useData()
</script>

<template>
  <header class="topbar">
    <a class="wordmark" :href="withBase('/')" aria-label="Caio Front-end Notes, início">
      <span class="wordmark-mark">c<span>.</span></span>
      <span class="wordmark-copy"><span>CAIO / BLOG</span><strong>FRONT-END NOTES</strong></span>
    </a>
    <nav class="header-actions" aria-label="Navegação principal">
      <a :href="withBase('/#comece-aqui')">Comece aqui</a>
      <a :href="withBase('/#artigos')">Artigos</a>
      <button class="theme-toggle" :aria-label="isDark ? 'Ativar tema claro' : 'Ativar tema escuro'" @click="isDark = !isDark">
        {{ isDark ? '☀' : '☾' }}
      </button>
    </nav>
  </header>
</template>
