import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useData } from 'vitepress'
import {
  configurePomodoro, createPomodoro, dailyProgress, finishIfDue, pausePomodoro,
  readPomodoro, remainingTime, resetPomodoro, startPomodoro,
  type PomodoroSettings, type PomodoroState,
} from '../pomodoro'

export function usePomodoro() {
  const { site } = useData()
  const storageKey = `front-end-notes:pomodoro:v1:${site.value.base}`
  const state = ref(createPomodoro())
  const now = ref(Date.now())
  const ready = ref(false)
  const storageAvailable = ref(true)
  const message = ref('')
  let interval: ReturnType<typeof setInterval> | undefined

  function readLatest() {
    if (!storageAvailable.value) return
    try {
      state.value = readPomodoro(localStorage.getItem(storageKey))
    } catch {
      storageAvailable.value = false
    }
  }

  function save(next: PomodoroState) {
    state.value = next
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
      storageAvailable.value = true
    } catch {
      storageAvailable.value = false
    }
  }

  function settle(): boolean {
    const previous = state.value
    const next = finishIfDue(previous, now.value)
    if (next === previous) return false
    save(next)
    message.value = previous.phase === 'focus'
      ? 'Foco concluído! Seu ciclo foi registrado. Inicie a pausa quando quiser.'
      : 'Pausa concluída. Quando estiver pronto, inicie outro ciclo de foco.'
    return true
  }

  function tick() {
    now.value = Date.now()
    if (state.value.status === 'running' && state.value.endAt! <= now.value) {
      readLatest()
      settle()
    }
  }

  function sync() {
    now.value = Date.now()
    readLatest()
    settle()
  }

  function handleStorage(event: StorageEvent) {
    if (event.key === storageKey || event.key === null) {
      storageAvailable.value = true
      sync()
    }
  }

  function handleVisibility() {
    if (document.visibilityState === 'visible') sync()
  }

  function prepareAction() {
    if (!ready.value) return false
    now.value = Date.now()
    readLatest()
    return !settle()
  }

  function toggle() {
    if (!prepareAction()) return
    if (state.value.status === 'running') {
      save(pausePomodoro(state.value, now.value))
      message.value = 'Cronômetro pausado.'
    } else {
      const id = globalThis.crypto?.randomUUID?.() ?? `${now.value}-${Math.random().toString(36).slice(2)}`
      save(startPomodoro(state.value, now.value, id))
      message.value = state.value.phase === 'focus' ? 'Hora de focar. Bom estudo!' : 'Pausa iniciada. Aproveite para descansar.'
    }
  }

  function restart() {
    if (!prepareAction()) return
    save(resetPomodoro(state.value))
    message.value = 'Ciclo reiniciado. O tempo parcial não conta para a meta.'
  }

  function skipBreak() {
    if (!prepareAction() || state.value.phase !== 'break') return
    save(resetPomodoro(state.value, 'focus'))
    message.value = 'Pronto para um novo foco. Inicie quando quiser.'
  }

  function configure(settings: PomodoroSettings) {
    if (!prepareAction()) return false
    const next = configurePomodoro(state.value, settings)
    if (next === state.value) return false
    save(next)
    message.value = 'Tempos e meta atualizados.'
    return true
  }

  onMounted(() => {
    sync()
    ready.value = true
    interval = setInterval(tick, 1000)
    window.addEventListener('storage', handleStorage)
    window.addEventListener('focus', sync)
    document.addEventListener('visibilitychange', handleVisibility)
  })

  onUnmounted(() => {
    clearInterval(interval)
    window.removeEventListener('storage', handleStorage)
    window.removeEventListener('focus', sync)
    document.removeEventListener('visibilitychange', handleVisibility)
  })

  return {
    state, ready, storageAvailable, message,
    remaining: computed(() => remainingTime(state.value, now.value)),
    progress: computed(() => dailyProgress(state.value, now.value)),
    toggle, restart, skipBreak, configure,
  }
}
