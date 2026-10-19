<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { data as posts } from '../posts.data'
import { data as topics } from '../topics.data'
import PostCard from './PostCard.vue'
import ReadingPaths from './ReadingPaths.vue'

const search = ref('')
const category = ref('Todos')
const pageSize = 12
const currentPage = ref(1)
const listHeading = ref<HTMLHeadingElement>()
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
const pageCount = computed(() => Math.max(1, Math.ceil(filteredPosts.value.length / pageSize)))
const pageStart = computed(() => (currentPage.value - 1) * pageSize)
const visiblePosts = computed(() => filteredPosts.value.slice(pageStart.value, pageStart.value + pageSize))
const pageItems = computed(() => {
  const items: { page: number | null; key: string }[] = []
  let previous = 0
  for (let page = 1; page <= pageCount.value; page++) {
    if (page !== 1 && page !== pageCount.value && Math.abs(page - currentPage.value) > 1) continue
    if (previous && page - previous > 1) items.push({ page: null, key: `gap-${page}` })
    items.push({ page, key: String(page) })
    previous = page
  }
  return items
})

watch([search, category], () => { currentPage.value = 1 }, { flush: 'sync' })
watch(pageCount, count => { currentPage.value = Math.min(currentPage.value, count) }, { flush: 'sync' })

async function changePage(page: number): Promise<void> {
  const target = Math.max(1, Math.min(page, pageCount.value))
  if (target === currentPage.value) return
  currentPage.value = target
  await nextTick()
  listHeading.value?.focus({ preventScroll: true })
  listHeading.value?.scrollIntoView({ block: 'start' })
}
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
    <div class="library-heading">
      <h2 ref="listHeading" tabindex="-1">ÚLTIMAS ANOTAÇÕES</h2>
      <span role="status"><template v-if="filteredPosts.length">{{ pageStart + 1 }}–{{ pageStart + visiblePosts.length }} DE </template>{{ filteredPosts.length }} {{ filteredPosts.length === 1 ? 'ARTIGO' : 'ARTIGOS' }}</span>
    </div>
    <div v-if="filteredPosts.length" class="post-grid"><PostCard v-for="(post, index) in visiblePosts" :key="post.url" :post="post" :index="pageStart + index" /></div>
    <div v-else class="empty-state"><h2>Nenhum artigo encontrado.</h2><p>Tente outro termo ou escolha outra categoria.</p></div>
    <nav v-if="pageCount > 1" class="post-pagination" aria-label="Paginação dos artigos">
      <span class="pagination-status">Página {{ currentPage }} de {{ pageCount }}</span>
      <div class="pagination-buttons">
        <button type="button" :disabled="currentPage === 1" @click="changePage(currentPage - 1)">← Anterior</button>
        <template v-for="item in pageItems" :key="item.key">
          <button v-if="item.page !== null" type="button" :aria-label="`Página ${item.page}`" :aria-current="currentPage === item.page ? 'page' : undefined" @click="changePage(item.page)">{{ item.page }}</button>
          <span v-else class="pagination-gap" aria-hidden="true">…</span>
        </template>
        <button type="button" :disabled="currentPage === pageCount" @click="changePage(currentPage + 1)">Próxima →</button>
      </div>
    </nav>
  </section>
</template>
