<script setup lang="ts">
withDefaults(defineProps<{ closeLabel?: string }>(), { closeLabel: 'Fechar modal' })
const emit = defineEmits<{ close: [] }>()
</script>
<template>
  <header class="modal-header">
    <div class="modal-close-row">
      <button class="ui-action modal-close" data-action="ghost" type="button" :aria-label="closeLabel" @click="emit('close')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg></button>
    </div>
    <div class="modal-heading-content"><slot /></div>
  </header>
</template>
<style scoped>
.modal-close-row { display: flex; justify-content: flex-end; width: 100%; }
.modal-close { width: 44px; height: 44px; flex-shrink: 0; }
.modal-heading-content { width: 100%; min-width: 0; }
</style>
