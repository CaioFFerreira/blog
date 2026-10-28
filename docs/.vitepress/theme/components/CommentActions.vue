<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
const props = defineProps<{ commentId: string; authorName: string; disabled: boolean }>()
const emit = defineEmits<{ edit: []; delete: [] }>()
const trigger = ref<HTMLButtonElement>()
const menu = ref<HTMLElement>()
const expanded = ref(false)
const position = ref({ top: '0px', left: '0px' })
function close(restoreFocus = false) {
  menu.value?.hidePopover()
  expanded.value = false
  if (restoreFocus) trigger.value?.focus({ preventScroll: true })
}
async function toggle(focusFirst = false) {
  if (props.disabled) return
  if (expanded.value) { close(); return }
  const bounds = trigger.value?.getBoundingClientRect()
  if (!bounds) return
  const width = Math.min(176, window.innerWidth - 32)
  position.value = {
    left: `${Math.max(16, Math.min(bounds.right - width, window.innerWidth - width - 16))}px`,
    top: `${bounds.bottom + 120 < window.innerHeight ? bounds.bottom + 4 : Math.max(16, bounds.top - 112)}px`,
  }
  await nextTick()
  if (props.disabled || !menu.value?.isConnected) return
  menu.value.showPopover()
  expanded.value = true
  if (focusFirst) menu.value.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true })
}
function choose(action: 'edit' | 'delete') {
  if (props.disabled) return
  close(true)
  if (action === 'edit') emit('edit')
  else emit('delete')
}
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && expanded.value) { event.preventDefault(); event.stopPropagation(); close(true); return }
  if (!expanded.value || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  event.stopPropagation()
  const buttons = Array.from(menu.value?.querySelectorAll<HTMLButtonElement>('button') ?? [])
  const index = buttons.findIndex(button => button === document.activeElement)
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowUp' ? -1 : 1) + buttons.length) % buttons.length
  buttons[next]?.focus({ preventScroll: true })
}
function onToggle(event: Event) { expanded.value = (event as ToggleEvent).newState === 'open' }
function onScroll(event: Event) {
  if (event.target instanceof Node && menu.value?.contains(event.target)) return
  close()
}
watch(() => props.disabled, disabled => { if (disabled) close() })
onMounted(() => { window.addEventListener('resize', onScroll); document.addEventListener('scroll', onScroll, true) })
onUnmounted(() => { close(); window.removeEventListener('resize', onScroll); document.removeEventListener('scroll', onScroll, true) })
</script>

<template>
  <div class="comment-actions-menu" @keydown="onKeydown">
    <button ref="trigger" class="ui-action comment-options" data-action="ghost" type="button" :disabled="disabled" :aria-label="`Opções do comentário de ${authorName}`" :aria-expanded="expanded" :aria-controls="`comment-actions-${commentId}`" @click="toggle()" @keydown.down.prevent.stop="toggle(true)">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="12" cy="19" r="1.6" /></svg>
    </button>
    <div :id="`comment-actions-${commentId}`" ref="menu" class="comment-options-popover" popover="auto" :style="position" role="group" aria-label="Ações do comentário" @toggle="onToggle">
      <button class="ui-action" data-action="open" type="button" :disabled="disabled" :aria-label="`Editar comentário de ${authorName}`" @click="choose('edit')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15v5Z" /></svg>Editar</button>
      <button class="ui-action" data-action="danger" type="button" :disabled="disabled" :aria-label="`Excluir comentário de ${authorName}`" @click="choose('delete')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" /></svg>Excluir</button>
    </div>
  </div>
</template>

<style scoped>
.comment-actions-menu { flex-shrink: 0; margin-left: auto; }
.comment-options { display: grid; place-items: center; width: 44px; height: 44px; padding: 0; border: 1px solid transparent; }
.comment-options-popover { position: fixed; box-sizing: border-box; width: min(176px, calc(100vw - 32px)); max-height: calc(100dvh - 32px); margin: 0; padding: 6px; overflow-y: auto; border: 1px solid var(--line); border-radius: 2px; background: var(--surface); color: var(--ink); box-shadow: 0 8px 28px #0003; }
.comment-options-popover:popover-open { display: grid; gap: 4px; }
.comment-options-popover button { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px; border-width: 1px; border-style: solid; font-size: 12px; text-align: left; }
.comment-options-popover svg { flex-shrink: 0; }
</style>
