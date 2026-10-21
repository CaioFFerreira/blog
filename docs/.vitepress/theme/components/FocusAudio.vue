<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import { createFocusAudio } from '../focus-audio'
import musicUrl from '../../../../src/assets/audio/Just One More Drink -- Jazz Noir - Pop Studio.mp3?url'

const playing = ref(false)
const busy = ref(false)
const ready = ref(false)
const supported = ref(true)
const error = ref('')
const expanded = ref(false)
const container = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const heading = ref<HTMLElement | null>(null)
const player = createFocusAudio(musicUrl)
player.onStateChange(value => { playing.value = value })
player.onError(() => { error.value = 'Não foi possível carregar a música. Confira sua conexão e tente novamente.' })

async function togglePanel() {
  expanded.value = !expanded.value
  if (expanded.value) {
    await nextTick()
    heading.value?.focus()
  }
}

function closeOnOutside(event: PointerEvent) {
  if (event.target instanceof Node && !container.value?.contains(event.target)) expanded.value = false
}

function closeOnEscape(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !expanded.value) return
  event.stopPropagation()
  expanded.value = false
  trigger.value?.focus()
}

async function toggleAudio() {
  if (busy.value || !ready.value || !supported.value) return
  busy.value = true
  error.value = ''
  try {
    if (playing.value) await player.pause()
    else await player.play()
  } catch {
    error.value = 'Não foi possível reproduzir o som. Tente novamente ou confira as permissões de áudio do navegador.'
  } finally {
    busy.value = false
  }
}

onMounted(() => {
  supported.value = typeof window.Audio === 'function'
  ready.value = true
  document.addEventListener('pointerdown', closeOnOutside)
})

onUnmounted(() => {
  document.removeEventListener('pointerdown', closeOnOutside)
  player.dispose()
})
</script>

<template>
  <div ref="container" class="audio-menu" @keydown="closeOnEscape">
    <button ref="trigger" class="audio-menu-trigger" type="button" :aria-expanded="expanded" aria-controls="focus-audio-panel" @click="togglePanel">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 14v-3a8 8 0 0 1 16 0v3M4 13H3v7h4v-7H4Zm16 0h1v7h-4v-7h3Z" /></svg>
      <span>Música <span v-if="playing" class="audio-playing-dot" aria-label="tocando">●</span></span>
    </button>
  <section v-show="expanded" id="focus-audio-panel" class="focus-audio" aria-labelledby="focus-audio-title">
    <div class="focus-audio-heading">
      <h2 id="focus-audio-title" ref="heading" tabindex="-1">Música de fundo</h2>
      <button class="audio-close" type="button" aria-label="Fechar player de sons" @click="expanded = false; trigger?.focus()">×</button>
    </div>
    <p class="audio-help">Just One More Drink — Jazz Noir · Pop Studio. Continua tocando ao fechar o painel e navegar pelos posts.</p>
    <template v-if="supported">
      <div class="focus-audio-controls">
        <button class="audio-play" type="button" :disabled="!ready || busy" :aria-pressed="playing" @click="toggleAudio">{{ busy ? 'Aguarde…' : playing ? 'Pausar som' : 'Reproduzir som' }}</button>
        <span class="focus-audio-state" role="status">{{ playing ? 'Tocando' : 'Som pausado' }}</span>
      </div>
      <p class="audio-help">Volume do player em 100%. Ajuste o volume pelo computador ou dispositivo.</p>
      <p class="audio-help">A reprodução começa quando você decidir, independente do Pomodoro.</p>
    </template>
    <p v-else class="audio-help">Este navegador não oferece suporte ao player de sons.</p>
    <p v-if="error" class="focus-audio-error" role="alert">{{ error }}</p>
  </section>
  </div>
</template>
