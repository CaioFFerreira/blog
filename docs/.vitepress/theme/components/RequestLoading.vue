<script setup lang="ts">
import { nextTick, onUnmounted, ref, watch } from 'vue'
const props = defineProps<{ message: string }>()
const dialog = ref<HTMLDialogElement>()
let revision = 0
watch(() => props.message, async message => {
  const ticket = ++revision
  await nextTick()
  if (ticket !== revision || !dialog.value?.isConnected) return
  if (message && !dialog.value.open) dialog.value.showModal()
  else if (!message && dialog.value.open) dialog.value.close()
}, { immediate: true })
onUnmounted(() => { revision++; dialog.value?.close() })
</script>
<template>
  <dialog ref="dialog" class="request-loading" aria-label="Aguarde" aria-busy="true" @cancel.prevent @keydown.esc.prevent @wheel.prevent @touchmove.prevent>
    <span class="loading-spinner" aria-hidden="true"></span><p role="status" aria-live="polite">{{ message }}</p>
  </dialog>
</template>
<style scoped>
.request-loading { position: fixed; inset: 0; margin: auto; max-width: calc(100vw - 48px); padding: 24px; border: 1px solid var(--line); border-radius: 2px; background: var(--surface); color: var(--ink); font: 14px/1.6 var(--font-sans); text-align: center; }
.request-loading::backdrop { background: #0006; }
.request-loading p { margin: 12px 0 0; }
.loading-spinner { display: inline-block; width: 24px; height: 24px; border: 2px solid var(--line); border-top-color: var(--green); border-radius: 50%; animation: request-spin .8s linear infinite; }
@keyframes request-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .loading-spinner { animation: none; } }
</style>
