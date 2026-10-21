export interface PomodoroSettings {
  focusMinutes: number
  breakMinutes: number
  dailyGoal: number
}

export interface PomodoroState {
  settings: PomodoroSettings
  phase: 'focus' | 'break'
  status: 'ready' | 'running' | 'paused'
  remainingMs: number
  endAt: number | null
  sessionId: string | null
  completed: Record<string, { day: string; minutes: number }>
}

export const defaultSettings: PomodoroSettings = { focusMinutes: 25, breakMinutes: 5, dailyGoal: 4 }

export function localDay(timestamp: number): string {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function validSettings(value: unknown): value is PomodoroSettings {
  if (!value || typeof value !== 'object') return false
  const settings = value as PomodoroSettings
  return Number.isInteger(settings.focusMinutes) && settings.focusMinutes >= 1 && settings.focusMinutes <= 120
    && Number.isInteger(settings.breakMinutes) && settings.breakMinutes >= 1 && settings.breakMinutes <= 60
    && Number.isInteger(settings.dailyGoal) && settings.dailyGoal >= 1 && settings.dailyGoal <= 20
}

export function phaseDuration(state: Pick<PomodoroState, 'phase' | 'settings'>): number {
  return (state.phase === 'focus' ? state.settings.focusMinutes : state.settings.breakMinutes) * 60_000
}

export function createPomodoro(): PomodoroState {
  return {
    settings: { ...defaultSettings }, phase: 'focus', status: 'ready',
    remainingMs: defaultSettings.focusMinutes * 60_000, endAt: null, sessionId: null, completed: {},
  }
}

export function readPomodoro(raw: string | null): PomodoroState {
  try {
    const value = JSON.parse(raw ?? 'null') as PomodoroState | null
    if (!value || !validSettings(value.settings)
      || !['focus', 'break'].includes(value.phase) || !['ready', 'running', 'paused'].includes(value.status)
      || !Number.isFinite(value.remainingMs) || value.remainingMs <= 0 || value.remainingMs > phaseDuration(value)
      || (value.status === 'running'
        ? !Number.isFinite(value.endAt) || value.endAt! <= 0 || value.endAt! > 8.64e15
        : value.endAt !== null)
      || (value.status !== 'ready' && (typeof value.sessionId !== 'string' || !value.sessionId || value.sessionId.length > 100))
      || (value.status === 'ready' && value.sessionId !== null)
      || !value.completed || typeof value.completed !== 'object' || Array.isArray(value.completed)) return createPomodoro()
    const completed: PomodoroState['completed'] = {}
    for (const [id, entry] of Object.entries(value.completed)) {
      if (id && id.length <= 100 && entry && typeof entry.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(entry.day)
        && Number.isInteger(entry.minutes) && entry.minutes >= 1 && entry.minutes <= 120) {
        Object.defineProperty(completed, id, { value: entry, enumerable: true, configurable: true, writable: true })
      }
    }
    return { settings: { ...value.settings }, phase: value.phase, status: value.status,
      remainingMs: value.remainingMs, endAt: value.endAt, sessionId: value.sessionId, completed }
  } catch {
    return createPomodoro()
  }
}

export function remainingTime(state: PomodoroState, now: number): number {
  return state.status === 'running' ? Math.max(0, Math.min(phaseDuration(state), state.endAt! - now)) : state.remainingMs
}

export function finishIfDue(state: PomodoroState, now: number): PomodoroState {
  if (state.status !== 'running' || state.endAt! > now) return state
  const completed = { ...state.completed }
  if (state.phase === 'focus' && state.sessionId) {
    completed[state.sessionId] = { day: localDay(state.endAt!), minutes: state.settings.focusMinutes }
  }
  const next: PomodoroState = { ...state, phase: state.phase === 'focus' ? 'break' : 'focus',
    status: 'ready', endAt: null, sessionId: null, completed }
  next.remainingMs = phaseDuration(next)
  return next
}

export function startPomodoro(state: PomodoroState, now: number, sessionId: string): PomodoroState {
  if (state.status === 'running') return state
  return { ...state, status: 'running', endAt: now + state.remainingMs, sessionId: state.sessionId ?? sessionId }
}

export function pausePomodoro(state: PomodoroState, now: number): PomodoroState {
  const settled = finishIfDue(state, now)
  if (settled !== state || state.status !== 'running') return settled
  return { ...state, status: 'paused', remainingMs: remainingTime(state, now), endAt: null }
}

export function resetPomodoro(state: PomodoroState, phase = state.phase): PomodoroState {
  const next = { ...state, phase, status: 'ready' as const, endAt: null, sessionId: null }
  return { ...next, remainingMs: phaseDuration(next) }
}

export function configurePomodoro(state: PomodoroState, settings: PomodoroSettings): PomodoroState {
  if (state.status !== 'ready' || !validSettings(settings)) return state
  return resetPomodoro({ ...state, settings: { ...settings } })
}

export function dailyProgress(state: PomodoroState, now: number) {
  const today = localDay(now)
  const sessions = Object.values(state.completed).filter(entry => entry.day === today)
  return { sessions: sessions.length, minutes: sessions.reduce((sum, entry) => sum + entry.minutes, 0) }
}

export function formatCountdown(milliseconds: number): string {
  const seconds = Math.ceil(Math.max(0, milliseconds) / 1000)
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}
