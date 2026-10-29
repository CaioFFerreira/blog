<script setup lang="ts">
import { nextTick, onUnmounted, ref, watch } from 'vue'
import { isTopModal, lockModal, unlockModal } from '../modal-stack'

const props = withDefaults(defineProps<{ modelValue: boolean; blocking?: boolean; compact?: boolean; fullscreen?: boolean }>(), { blocking: false, compact: false, fullscreen: false })
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; opened: []; closed: [] }>()
const dialog = ref<HTMLDialogElement>()
const token = Symbol('modal')
let returnFocus: HTMLElement | null = null
let revision = 0
let disposed = false
let active = false

function release() {
  if (!active) return
  const restore = isTopModal(token)
  active = false
  unlockModal(token)
  if (restore && returnFocus?.isConnected && returnFocus.getClientRects().length) returnFocus.focus({ preventScroll: true })
}
function onClose() {
  // Ignore an old native close event if the dialog was reopened meanwhile.
  if (dialog.value?.open) return
  release()
  if (!disposed) { emit('update:modelValue', false); emit('closed') }
}
function requestClose() { if (!props.blocking) emit('update:modelValue', false) }
function backdrop(event: MouseEvent) {
  if (event.target !== dialog.value || props.blocking) return
  const bounds = dialog.value.getBoundingClientRect()
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) requestClose()
}
function keydown(event: KeyboardEvent) {
  if (event.key !== 'Tab' || !dialog.value || !isTopModal(token)) return
  const controls = Array.from(dialog.value.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]'))
    .filter(element => element.tabIndex >= 0 && element.getClientRects().length && !element.closest('[inert]'))
  const first = controls[0], last = controls.at(-1)
  if (!first) { event.preventDefault(); dialog.value.focus(); return }
  if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.value)) { event.preventDefault(); last?.focus() }
  else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.value)) { event.preventDefault(); first.focus() }
}
function preventScroll(event: Event) { if (props.blocking) event.preventDefault() }
watch(() => props.modelValue, async open => {
  const ticket = ++revision
  await nextTick()
  const element = dialog.value
  if (ticket !== revision || disposed || !element?.isConnected) return
  if (open && !element.open) {
    returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    element.showModal()
    active = true
    lockModal(token)
    emit('opened')
  } else if (!open) {
    if (element.open) element.close()
    release()
  }
}, { immediate: true, flush: 'post' })
onUnmounted(() => { disposed = true; revision++; dialog.value?.close(); release() })
</script>

<template>
  <dialog ref="dialog" class="base-modal" :class="{ 'base-modal-compact': compact, 'base-modal-fullscreen': fullscreen }" tabindex="-1" :aria-busy="blocking || undefined" @cancel.prevent="requestClose" @close="onClose" @click="backdrop" @keydown="keydown" @wheel="preventScroll" @touchmove="preventScroll">
    <slot />
  </dialog>
</template>

<style scoped>
.base-modal { box-sizing: border-box; position: fixed; inset: 0; width: min(680px, calc(100vw - 32px)); max-width: calc(100vw - 32px); max-height: calc(100dvh - 48px); margin: auto; padding: 0; overflow: hidden; border: 1px solid var(--line); border-radius: 0; background: var(--surface); color: var(--ink); box-shadow: 0 24px 90px #0004; overscroll-behavior: contain; }
.base-modal[open] { display: flex; flex-direction: column; }
.base-modal-fullscreen[open] { inset: 0; width: 100vw; max-width: 100vw; height: 100dvh; max-height: 100dvh; margin: 0; border: 0; }
.base-modal::backdrop { background: #08130db3; backdrop-filter: blur(5px); }
.base-modal :deep(.modal-form) { display: flex; flex-direction: column; flex: 1 1 auto; min-width: 0; min-height: 0; max-height: inherit; margin: 0; padding: 0; overflow: hidden; }
.base-modal :deep(.modal-header) { display: grid; grid-template-columns: minmax(0, 1fr); gap: 4px; flex-shrink: 0; padding: 20px 24px; border-bottom: 1px solid var(--line); }
.base-modal :deep(.modal-header h2) { margin: 8px 0; font: 500 24px/1.25 var(--display); letter-spacing: -.03em; overflow-wrap: anywhere; }
.base-modal :deep(.modal-body) { flex: 1 1 auto; min-height: 0; padding: 20px 24px; overflow-y: auto; overscroll-behavior: contain; scrollbar-gutter: stable; }
.base-modal :deep(.modal-footer) { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; flex-shrink: 0; margin: 0; padding: 16px 24px; border-top: 1px solid var(--line); }
.base-modal :deep(.modal-footer > .ui-action[data-action="primary"]) { margin-left: auto; }
.base-modal :deep(.modal-footer > span) { color: var(--muted); font: 11px/1.6 var(--font-sans); }
.base-modal-compact { width: fit-content; padding: 24px; text-align: center; font: 14px/1.6 var(--font-sans); }
.base-modal-compact[open] { align-items: center; justify-content: center; }
@media (max-width: 900px) {
  .base-modal[open] { inset: 0; width: 100vw; max-width: 100vw; height: 100dvh; max-height: 100dvh; margin: 0; border: 0; }
  .base-modal :deep(.modal-header), .base-modal :deep(.modal-body), .base-modal :deep(.modal-footer) { padding-left: max(20px, env(safe-area-inset-left)); padding-right: max(20px, env(safe-area-inset-right)); }
  .base-modal :deep(.modal-header) { padding-top: max(16px, env(safe-area-inset-top)); }
  .base-modal :deep(.modal-footer) { padding-bottom: max(14px, env(safe-area-inset-bottom)); }
  .base-modal-compact { padding: max(24px, env(safe-area-inset-top)) max(24px, env(safe-area-inset-right)) max(24px, env(safe-area-inset-bottom)) max(24px, env(safe-area-inset-left)); }
}
</style>
