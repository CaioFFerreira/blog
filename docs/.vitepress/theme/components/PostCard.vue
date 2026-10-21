<script setup lang="ts">
import { withBase } from 'vitepress'
import type { Post } from '../types'
import { formatDate } from '../utils'
import StudyCheckbox from './StudyCheckbox.vue'

defineProps<{ post: Post; index: number }>()
</script>

<template>
  <article class="post-card">
    <div class="post-topline">
      <div class="post-meta"><span>{{ post.category }}</span><span>{{ String(index + 1).padStart(2, '0') }}</span></div>
      <StudyCheckbox :url="post.url" :title="post.title" :version="post.quizVersion" />
    </div>
    <h2><a class="post-card-link" :href="withBase(post.url)">{{ post.title }}</a></h2>
    <p>{{ post.description }}</p>
    <div class="tags"><span v-for="tag in post.tags" :key="tag">#{{ tag }}</span></div>
    <div class="card-footer"><time :datetime="post.date">{{ formatDate(post.date) }}</time><span>Ler artigo ↗</span></div>
  </article>
</template>
