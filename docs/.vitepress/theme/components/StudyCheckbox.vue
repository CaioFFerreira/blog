<script setup lang="ts">
import { withBase } from 'vitepress'
import { useStudyProgress } from '../composables/useStudyProgress'

const props = defineProps<{ url: string; title: string; version: string }>()
const { studied } = useStudyProgress(() => props.url, () => props.version)
</script>

<template>
  <a class="study-checkbox" :class="{ 'is-studied': studied }" :href="withBase(`${url}#quiz`)" :aria-label="`${studied ? 'Conhecimento validado; rever quiz' : 'Responder quiz para validar conhecimento'}: ${title}`">
    <span class="study-indicator" aria-hidden="true">
      <svg v-if="studied" viewBox="0 0 20 20" fill="none"><path d="m5 10 3.2 3.2L15 6.5" /></svg>
      <span v-else>?</span>
    </span>
    <span>{{ studied ? 'Validado' : 'Fazer quiz' }}</span>
  </a>
</template>
