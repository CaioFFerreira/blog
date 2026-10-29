<script setup lang="ts">
import BaseModal from './BaseModal.vue'
import LoadingDots from './LoadingDots.vue'
defineProps<{ message: string }>()
</script>
<template>
  <BaseModal :model-value="!!message" blocking compact class="request-loading" aria-label="Aguarde">
    <LoadingDots /><p role="status" aria-live="polite">{{ message }}</p>
  </BaseModal>
</template>
<style scoped>
.request-loading p { margin: 12px 0 0; }
</style>
