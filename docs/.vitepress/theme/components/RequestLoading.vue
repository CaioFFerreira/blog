<script setup lang="ts">
import BaseModal from './BaseModal.vue'
defineProps<{ message: string }>()
</script>
<template>
  <BaseModal :model-value="!!message" blocking compact class="request-loading" aria-label="Aguarde">
    <svg class="loading-dots" width="40" height="16" viewBox="0 0 40 16" fill="currentColor" aria-hidden="true"><circle cx="8" cy="8" r="3" /><circle cx="20" cy="8" r="3" /><circle cx="32" cy="8" r="3" /></svg><p role="status" aria-live="polite">{{ message }}</p>
  </BaseModal>
</template>
<style scoped>
.request-loading p { margin: 12px 0 0; }
.loading-dots { flex-shrink: 0; color: var(--green); overflow: visible; }
.loading-dots circle { animation: request-pulse 1.2s ease-in-out infinite; transform-origin: center; }
.loading-dots circle:nth-child(2) { animation-delay: .15s; }
.loading-dots circle:nth-child(3) { animation-delay: .3s; }
@keyframes request-pulse { 0%, 60%, 100% { opacity: .3; transform: translateY(0); } 30% { opacity: 1; transform: translateY(-3px); } }
@media (prefers-reduced-motion: reduce) { .loading-dots circle { animation: none; } }
</style>
