<script setup lang="ts">
import { nextTick, onUnmounted, ref, watch } from 'vue'

const props = defineProps<{ modelValue: string; kind?: 'success' | 'error' }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const toast = ref<HTMLElement>()
let timer: ReturnType<typeof setTimeout> | undefined
let revision = 0
function pauseDismissal() { clearTimeout(timer) }
function dismiss() {
  clearTimeout(timer)
  toast.value?.hidePopover?.()
  emit('update:modelValue', '')
}
watch(() => props.modelValue, async message => {
  const current = ++revision
  clearTimeout(timer)
  if (!message) {
    toast.value?.hidePopover?.()
    return
  }
  await nextTick()
  if (current !== revision || !toast.value?.isConnected) return
  toast.value.showPopover?.()
  timer = setTimeout(dismiss, props.kind === 'error' ? 10000 : 5000)
}, { immediate: true })
onUnmounted(() => { revision++; clearTimeout(timer) })
</script>

<template>
  <div ref="toast" class="action-toast" :class="{ 'toast-error': kind === 'error' }" popover="manual" :role="kind === 'error' ? 'alert' : 'status'" :aria-live="kind === 'error' ? 'assertive' : 'polite'" aria-atomic="true" @mouseenter="pauseDismissal" @focusin="pauseDismissal">
    <span class="toast-check" aria-hidden="true">{{ kind === 'error' ? '!' : '✓' }}</span>
    <span>{{ modelValue }}</span>
    <slot />
    <button type="button" aria-label="Fechar notificação" @click="dismiss">×</button>
  </div>
</template>

<style scoped>
.action-toast { position: fixed; inset: max(20px, env(safe-area-inset-top)) 20px auto auto; box-sizing: border-box; width: max-content; max-width: min(420px, calc(100vw - 32px)); margin: 0; padding: 12px 12px 12px 16px; border: 1px solid var(--green); border-radius: 2px; background: var(--surface); color: var(--ink); box-shadow: 0 8px 28px #0003; font: 13px/1.6 var(--font-sans); }
.action-toast:popover-open { display: flex; align-items: center; gap: 12px; }
.toast-check { color: var(--green); font-size: 20px; }
.toast-error { border-color: var(--orange); }
.toast-error .toast-check { color: var(--orange); font-weight: 700; }
button { flex-shrink: 0; width: 36px; height: 36px; padding: 0; border: 0; border-radius: 2px; background: transparent; color: var(--muted); font-size: 24px; cursor: pointer; }
button:hover { background: color-mix(in srgb, var(--green) 10%, transparent); }
button:focus-visible { outline: 2px solid var(--green); outline-offset: 2px; }
@media (max-width: 480px) { .action-toast { inset-inline: 16px; width: auto; max-width: none; } button { width: 44px; height: 44px; } }
</style>
