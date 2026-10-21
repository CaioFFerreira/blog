<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { usePomodoro } from '../composables/usePomodoro'
import { formatCountdown } from '../pomodoro'

const { state, ready, remaining, progress, message, storageAvailable, toggle, restart, skipBreak, configure } = usePomodoro()
const expanded = ref(false)
const widget = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const heading = ref<HTMLElement | null>(null)
const draft = ref({ ...state.value.settings })
const settingsOpen = ref(false)
const phaseLabel = computed(() => state.value.phase === 'focus' ? 'Foco' : 'Pausa')
const goalReached = computed(() => progress.value.sessions >= state.value.settings.dailyGoal)
const progressValue = computed(() => Math.min(progress.value.sessions, state.value.settings.dailyGoal))

watch(() => JSON.stringify(state.value.settings), () => { draft.value = { ...state.value.settings } })

async function togglePanel() {
  if (expanded.value) {
    close()
    return
  }
  expanded.value = true
  await nextTick()
  heading.value?.focus()
}

async function close(restoreFocus = false) {
  expanded.value = false
  if (restoreFocus) {
    await nextTick()
    trigger.value?.focus()
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && expanded.value) close(true)
}

function handleOutside(event: PointerEvent) {
  if (event.target instanceof Node && !widget.value?.contains(event.target)) close()
}

function saveSettings() {
  if (configure(draft.value)) settingsOpen.value = false
}

onMounted(() => document.addEventListener('pointerdown', handleOutside))
onUnmounted(() => document.removeEventListener('pointerdown', handleOutside))
</script>

<template>
  <aside ref="widget" class="pomodoro-widget" aria-label="Pomodoro e meta diária" @keydown="handleKeydown">
    <section v-show="expanded" id="pomodoro-panel" class="pomodoro-panel" aria-labelledby="pomodoro-title">
      <div class="pomodoro-heading">
        <div><p class="eyebrow">Um ciclo de cada vez</p><h2 id="pomodoro-title" ref="heading" tabindex="-1">Seu tempo de estudo</h2></div>
        <button class="pomodoro-close" type="button" aria-label="Recolher Pomodoro" @click="close(true)">×</button>
      </div>
      <p class="pomodoro-phase">{{ phaseLabel }} <span>· {{ state.status === 'running' ? 'Em andamento' : state.status === 'paused' ? 'Pausado' : 'Pronto para começar' }}</span></p>
      <div class="pomodoro-countdown" role="timer" aria-live="off" :aria-label="`${phaseLabel}: ${formatCountdown(remaining)} restantes`">{{ formatCountdown(remaining) }}</div>
      <div class="pomodoro-actions">
        <button class="pomodoro-primary" type="button" :disabled="!ready" @click="toggle">{{ state.status === 'running' ? 'Pausar' : state.status === 'paused' ? 'Continuar' : `Iniciar ${phaseLabel.toLowerCase()}` }}</button>
        <button class="pomodoro-secondary" type="button" :disabled="!ready || state.status === 'ready'" @click="restart">Reiniciar ciclo</button>
      </div>
      <button v-if="state.phase === 'break'" class="pomodoro-text-button" type="button" :disabled="!ready" @click="skipBreak">Voltar ao foco</button>
      <p class="pomodoro-status">{{ message }}</p>
      <div class="pomodoro-goal">
        <div><strong>Meta de hoje</strong><span>{{ progress.sessions }} / {{ state.settings.dailyGoal }} ciclos</span></div>
        <progress :value="progressValue" :max="state.settings.dailyGoal" aria-label="Ciclos de foco concluídos hoje" />
        <p>{{ goalReached ? 'Meta alcançada! Cada novo ciclo é uma conquista extra.' : 'Cada ciclo de foco completo conta para a sua meta.' }}</p>
        <small>{{ progress.minutes }} min de foco concluídos hoje</small>
      </div>
      <button class="pomodoro-text-button" type="button" :aria-expanded="settingsOpen" aria-controls="pomodoro-settings" @click="settingsOpen = !settingsOpen">{{ settingsOpen ? 'Fechar ajustes' : 'Ajustar tempos e meta' }}</button>
      <form v-show="settingsOpen" id="pomodoro-settings" class="pomodoro-settings" @submit.prevent="saveSettings">
        <fieldset :disabled="!ready || state.status !== 'ready'">
          <legend>Seu ritmo de estudo</legend>
          <label>Foco (min)<input v-model.number="draft.focusMinutes" type="number" min="1" max="120" step="1" required></label>
          <label>Pausa (min)<input v-model.number="draft.breakMinutes" type="number" min="1" max="60" step="1" required></label>
          <label>Ciclos por dia<input v-model.number="draft.dailyGoal" type="number" min="1" max="20" step="1" required></label>
          <button class="pomodoro-secondary" type="submit">Salvar ajustes</button>
        </fieldset>
        <p v-if="state.status !== 'ready'" class="pomodoro-help">Reinicie ou conclua o ciclo atual para ajustar os tempos e a meta.</p>
      </form>
      <p class="pomodoro-help">Só o foco concluído conta. A meta renova à meia-noite no horário deste dispositivo. Cada próximo ciclo começa quando você decidir.</p>
      <p v-if="!storageAvailable" class="pomodoro-help">O navegador não permitiu salvar. Seu progresso ficará disponível somente nesta visita.</p>
    </section>
    <p class="pomodoro-announcement" role="status" aria-live="polite" aria-atomic="true">{{ message }}</p>
    <button ref="trigger" class="pomodoro-trigger" type="button" :class="{ 'is-running': state.status === 'running' }" :aria-expanded="expanded" :aria-label="`${expanded ? 'Recolher' : 'Abrir'} Pomodoro`" aria-controls="pomodoro-panel" @click="togglePanel">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="14" r="8" /><path d="M9 2h6M12 2v4m0 8 3-3M19 5l2 2" /></svg>
      <span>Pomodoro <strong>{{ formatCountdown(remaining) }}</strong></span>
      <span class="pomodoro-trigger-goal" :aria-label="`${progress.sessions} de ${state.settings.dailyGoal} ciclos hoje`">{{ progress.sessions }}/{{ state.settings.dailyGoal }} <span v-if="goalReached" aria-hidden="true">✓</span></span>
    </button>
  </aside>
</template>
