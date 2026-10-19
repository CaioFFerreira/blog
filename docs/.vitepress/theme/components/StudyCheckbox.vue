<script setup lang="ts">
import { useStudyProgress } from '../composables/useStudyProgress'

const props = defineProps<{ url: string; title: string }>()
const { studied, setStudied } = useStudyProgress(() => props.url)

function handleChange(event: Event) {
  setStudied((event.target as HTMLInputElement).checked)
}
</script>

<template>
  <label class="study-checkbox" :class="{ 'is-studied': studied }" :title="studied ? 'Desmarcar como estudado' : 'Marcar como estudado'">
    <input type="checkbox" :checked="studied" :aria-label="`Marcar como estudado: ${title}`" @change="handleChange">
    <span class="study-indicator" aria-hidden="true">
      <svg viewBox="0 0 20 20" fill="none"><path d="m5 10 3.2 3.2L15 6.5" /></svg>
    </span>
    <span>{{ studied ? 'Estudado' : 'Estudar' }}</span>
  </label>
</template>
