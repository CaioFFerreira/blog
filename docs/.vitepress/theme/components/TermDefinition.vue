<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useId } from 'vue'

const props = defineProps<{ term: string; definition: string }>()
const id = `term-${useId()}`
const trigger = ref<HTMLButtonElement>()
const panel = ref<HTMLElement>()
const open = ref(false)
const position = ref({ left: '12px', top: '12px', width: '300px' })

function close(): void { open.value = false }

async function toggle(): Promise<void> {
  if (open.value) { close(); return }
  if (!trigger.value) return
  const rect = trigger.value.getBoundingClientRect()
  const width = Math.min(320, window.innerWidth - 24)
  position.value = {
    width: `${width}px`,
    left: `${Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))}px`,
    top: `${rect.bottom + 8}px`,
  }
  open.value = true
  await nextTick()
  if (!open.value || !panel.value) return
  const height = panel.value.getBoundingClientRect().height
  const top = rect.bottom + 8 + height <= window.innerHeight - 12
    ? rect.bottom + 8
    : Math.max(12, rect.top - height - 8)
  position.value.top = `${top}px`
}

function outside(event: PointerEvent): void {
  if (event.target instanceof Node && !trigger.value?.contains(event.target) && !panel.value?.contains(event.target)) close()
}
function escape(event: KeyboardEvent): void {
  if (open.value && event.key === 'Escape') { event.stopPropagation(); close() }
}
function scroll(event: Event): void {
  if (event.target instanceof Node && panel.value?.contains(event.target)) return
  close()
}
onMounted(() => {
  document.addEventListener('pointerdown', outside)
  document.addEventListener('keydown', escape)
  window.addEventListener('resize', close)
  window.addEventListener('scroll', scroll, true)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', outside)
  document.removeEventListener('keydown', escape)
  window.removeEventListener('resize', close)
  window.removeEventListener('scroll', scroll, true)
})
</script>

<template>
  <button ref="trigger" type="button" class="term-trigger" :aria-expanded="open" :aria-describedby="open ? id : undefined" :aria-label="`${props.term}: ver significado`" @click="toggle" @blur="close">{{ props.term }}<span class="term-mark" aria-hidden="true">?</span></button>
  <Teleport to="body">
    <span v-if="open" :id="id" ref="panel" role="tooltip" class="term-tooltip" :style="position">
      <strong>{{ props.term }}</strong>
      <span>{{ props.definition }}</span>
      <small>Esc ou clique fora para fechar.</small>
    </span>
  </Teleport>
</template>
