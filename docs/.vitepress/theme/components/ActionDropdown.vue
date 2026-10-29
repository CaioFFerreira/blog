<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
const props = defineProps<{ menuId: string; label: string; menuLabel: string; disabled: boolean; actions: ReadonlyArray<{ id: string; label: string; ariaLabel?: string; kind: 'open' | 'navigate' | 'danger' | 'danger-ghost' | 'ghost'; icon: 'edit' | 'delete' | 'books' }> }>()
const emit = defineEmits<{ select: [action: string] }>()
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
function choose(action: string) {
  if (props.disabled) return
  close(true)
  emit('select', action)
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
  <div class="action-dropdown" @keydown="onKeydown">
    <button ref="trigger" class="ui-action action-dropdown-trigger" data-action="ghost" type="button" :disabled="disabled" :aria-label="label" :aria-expanded="expanded" :aria-controls="menuId" @click="toggle()" @keydown.down.prevent.stop="toggle(true)">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="12" cy="19" r="1.6" /></svg>
    </button>
    <div :id="menuId" ref="menu" class="action-dropdown-popover" popover="auto" :style="position" role="group" :aria-label="menuLabel" @toggle="onToggle">
      <button v-for="action in actions" :key="action.id" class="ui-action" :data-action="action.kind" type="button" :disabled="disabled" :aria-label="action.ariaLabel ?? action.label" @click="choose(action.id)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
          <path v-if="action.icon === 'edit'" d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15v5Z" />
          <path v-else-if="action.icon === 'books'" d="M4 4h6v16H4zM14 4h6v16h-6zM4 8h6M14 8h6" />
          <path v-else d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" />
        </svg>{{ action.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.action-dropdown { flex-shrink: 0; margin-left: auto; }
.action-dropdown-trigger { display: grid; place-items: center; width: 44px; height: 44px; padding: 0; border: 1px solid transparent; }
.action-dropdown-popover { position: fixed; box-sizing: border-box; width: min(176px, calc(100vw - 32px)); max-height: calc(100dvh - 32px); margin: 0; padding: 6px; overflow-y: auto; border: 1px solid var(--line); border-radius: 0; background: var(--surface); color: var(--ink); box-shadow: 0 8px 28px #0003; }
.action-dropdown-popover:popover-open { display: grid; gap: 4px; }
.action-dropdown-popover button.ui-action { justify-content: flex-start; display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px; border-width: 1px; border-style: solid; font-size: 12px; text-align: left; }
.action-dropdown-popover svg { flex-shrink: 0; }
</style>
