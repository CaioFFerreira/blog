<script setup lang="ts">
import { useData, withBase } from 'vitepress'
import SiteHeader from './components/SiteHeader.vue'
import BlogHome from './components/BlogHome.vue'
import BlogPost from './components/BlogPost.vue'
import BookLibrary from './components/BookLibrary.vue'

const { frontmatter, page } = useData()
</script>

<template>
  <div class="app-shell">
    <a class="skip-link" href="#main-content">Pular para o conteúdo</a>
    <SiteHeader />
    <main id="main-content" tabindex="-1">
      <section v-if="page.isNotFound" class="empty-state"><p class="eyebrow">404</p><h1>Página não encontrada.</h1><a :href="withBase('/')">Voltar aos artigos →</a></section>
      <BlogHome v-else-if="frontmatter.layout === 'home'" />
      <BookLibrary v-else-if="frontmatter.layout === 'library'" />
      <BlogPost v-else />
    </main>
    <footer class="site-footer"><span>Feito com curiosidade. Escrito por Caio.</span></footer>
  </div>
</template>
