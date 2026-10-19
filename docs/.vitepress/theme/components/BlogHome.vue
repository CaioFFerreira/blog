<script setup lang="ts">
import { computed, ref } from 'vue'
import { data as posts } from '../posts.data'
import { data as topics } from '../topics.data'
import PostCard from './PostCard.vue'
import ReadingPaths from './ReadingPaths.vue'

const search = ref('')
const category = ref('Todos')
const categories = computed(() => ['Todos', ...new Set([...topics, ...posts.map(post => post.category)])])
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const searchIndex = posts.map(post => ({
  post,
  text: normalize(`${post.title} ${post.description} ${post.category} ${post.tags.join(' ')} ${post.content}`),
}))
const filteredPosts = computed(() => {
  const terms = normalize(search.value.trim()).split(/\s+/).filter(Boolean)
  return searchIndex.filter(({ post, text }) =>
    (category.value === 'Todos' || post.category === category.value)
    && terms.every(term => text.includes(term)),
  ).map(({ post }) => post)
})
</script>

<template>
  <section class="intro" aria-labelledby="page-title">
    <div>
      <p class="eyebrow">UM CADERNO ABERTO / DESENVOLVIMENTO WEB</p>
      <h1 id="page-title">Entre uma ideia<br>e <em>uma linha de código.</em></h1>
      <p class="intro-description">Notas sobre front-end, boas práticas e o que aprendo construindo para a web.</p>
    </div>
    <div class="library-stamp"><span>NO CADERNO</span><strong>{{ String(posts.length).padStart(2, '0') }}</strong><span>{{ posts.length === 1 ? 'artigo publicado' : 'artigos publicados' }}</span></div>
  </section>
  <ReadingPaths />
  <section id="artigos" aria-label="Artigos do blog">
    <div class="controls">
      <div class="category-tabs" aria-label="Filtrar por categoria">
        <button v-for="item in categories" :key="item" :aria-pressed="category === item" @click="category = item">{{ item }}</button>
      </div>
      <label class="search-box"><span>Buscar</span><input v-model="search" type="search" placeholder="Título ou texto do artigo…" aria-label="Buscar no título e no texto dos artigos"></label>
    </div>
    <div class="library-heading"><span>ÚLTIMAS ANOTAÇÕES</span><span role="status">{{ filteredPosts.length }} {{ filteredPosts.length === 1 ? 'ARTIGO' : 'ARTIGOS' }}</span></div>
    <div v-if="filteredPosts.length" class="post-grid"><PostCard v-for="(post, index) in filteredPosts" :key="post.url" :post="post" :index="index" /></div>
    <div v-else class="empty-state"><h2>Nenhum artigo encontrado.</h2><p>Tente outro termo ou escolha outra categoria.</p></div>
  </section>
</template>
