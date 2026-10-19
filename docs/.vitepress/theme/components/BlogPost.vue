<script setup lang="ts">
import { Content, useData, withBase } from 'vitepress'
import { data as posts } from '../posts.data'
import { computed } from 'vue'
import { formatDate } from '../utils'
import StudyCheckbox from './StudyCheckbox.vue'
import { readingPaths, readingSequence } from '../reading-paths'

const { page } = useData()
const post = computed(() => posts.find(item => item.url === `/${page.value.relativePath.replace(/\.md$/, '.html')}`))
const readingIndex = computed(() => readingSequence.findIndex(item => item.url === post.value?.url))
const previousPost = computed(() => readingIndex.value > 0 ? readingSequence[readingIndex.value - 1] : undefined)
const nextPost = computed(() => readingIndex.value >= 0 ? readingSequence[readingIndex.value + 1] : undefined)
const path = computed(() => readingPaths.find(item => item.posts.some(article => article.url === post.value?.url)))
const pathIndex = computed(() => path.value?.posts.findIndex(item => item.url === post.value?.url) ?? -1)
</script>

<template>
  <article class="article">
    <a class="back-link" :href="withBase('/')">← Todos os artigos</a>
    <header v-if="post" class="article-header">
      <div class="post-topline">
        <p class="eyebrow">{{ post.category }}</p>
        <StudyCheckbox :url="post.url" :title="post.title" />
      </div>
      <h1>{{ post.title }}</h1>
      <p class="intro-description">{{ post.description }}</p>
      <div class="post-meta"><span>Por Caio</span><time :datetime="post.date">{{ formatDate(post.date) }}</time></div>
      <div class="tags"><span v-for="tag in post.tags" :key="tag">#{{ tag }}</span></div>
      <p v-if="path" class="reading-position">Trilha {{ path.category }} · Artigo {{ pathIndex + 1 }} de {{ path.posts.length }} <a :href="withBase('/#trilhas')">Ver trilhas</a></p>
    </header>
    <p class="term-help">Dica de leitura: clique nas palavras com sublinhado pontilhado e “?” para ver o significado.</p>
    <Content class="prose" />
    <footer class="article-footer">
      <nav v-if="readingIndex >= 0" class="reading-pagination" aria-label="Sequência de leitura">
        <a v-if="previousPost" :href="withBase(previousPost.url)"><span>← Leitura anterior</span><strong>{{ previousPost.title }}</strong></a>
        <a v-if="nextPost" :href="withBase(nextPost.url)"><span>Próxima leitura →</span><strong>{{ nextPost.title }}</strong><small v-if="nextPost.category !== post?.category">Continue em {{ nextPost.category }}</small></a>
      </nav>
      <p v-if="readingIndex >= 0 && !nextPost" class="reading-hint">Você chegou ao fim da sequência sugerida. Escolha uma trilha para revisar ou explore os novos artigos.</p>
      <a :href="withBase('/')">← Voltar ao caderno</a>
    </footer>
  </article>
</template>
