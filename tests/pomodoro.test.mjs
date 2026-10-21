import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  configurePomodoro, createPomodoro, dailyProgress, finishIfDue, formatCountdown,
  localDay, pausePomodoro, readPomodoro, remainingTime, resetPomodoro, startPomodoro,
} from '../docs/.vitepress/theme/pomodoro.ts'

process.env.TZ = 'America/Sao_Paulo'
const start = new Date(2026, 9, 21, 10).getTime()
const minute = 60_000

test('padrão: 25 minutos de foco, 5 de pausa e meta de quatro ciclos', () => {
  const state = createPomodoro()
  assert.deepEqual(state.settings, { focusMinutes: 25, breakMinutes: 5, dailyGoal: 4 })
  assert.equal(state.remainingMs, 25 * minute)
  assert.deepEqual(dailyProgress(state, start), { sessions: 0, minutes: 0 })
})

test('contagem usa o prazo real mesmo quando o intervalo da aba atrasa', () => {
  const state = startPomodoro(createPomodoro(), start, 'focus-1')
  assert.equal(remainingTime(state, start + 7 * minute + 1234), 18 * minute - 1234)
  assert.equal(remainingTime(state, start + 30 * minute), 0)
})

test('pausar congela o restante e continuar preserva a mesma sessão', () => {
  const running = startPomodoro(createPomodoro(), start, 'focus-1')
  const paused = pausePomodoro(running, start + 10 * minute)
  assert.equal(paused.status, 'paused')
  assert.equal(remainingTime(paused, start + 100 * minute), 15 * minute)
  const resumed = startPomodoro(paused, start + 100 * minute, 'unused-id')
  assert.equal(resumed.sessionId, 'focus-1')
  assert.equal(resumed.endAt, start + 115 * minute)
  assert.equal(dailyProgress(resumed, start).sessions, 0)
})

test('somente foco completo conta; pausa não aumenta a meta', () => {
  const running = startPomodoro(createPomodoro(), start, 'focus-1')
  assert.equal(finishIfDue(running, start + 24 * minute), running)
  const finished = finishIfDue(running, start + 25 * minute)
  assert.equal(finished.phase, 'break')
  assert.equal(finished.status, 'ready')
  assert.equal(finished.remainingMs, 5 * minute)
  assert.deepEqual(dailyProgress(finished, start), { sessions: 1, minutes: 25 })
  const rest = startPomodoro(finished, start + 25 * minute, 'break-1')
  const rested = finishIfDue(rest, start + 30 * minute)
  assert.equal(rested.phase, 'focus')
  assert.equal(rested.status, 'ready')
  assert.deepEqual(dailyProgress(rested, start), { sessions: 1, minutes: 25 })
})

test('repetir conclusão da mesma sessão não duplica o crédito', () => {
  const running = startPomodoro(createPomodoro(), start, 'same-session')
  const first = finishIfDue(running, start + 25 * minute)
  const duplicate = finishIfDue({ ...running, completed: first.completed }, start + 30 * minute)
  assert.equal(dailyProgress(duplicate, start).sessions, 1)
  assert.equal(finishIfDue(first, start + 50 * minute), first)
})

test('reabrir depois de horas encerra só o ciclo iniciado e não inicia outros', () => {
  const saved = JSON.stringify(startPomodoro(createPomodoro(), start, 'focus-1'))
  const restored = finishIfDue(readPomodoro(saved), start + 8 * 60 * minute)
  assert.equal(restored.status, 'ready')
  assert.equal(restored.phase, 'break')
  assert.equal(dailyProgress(restored, start).sessions, 1)
})

test('recarregar preserva o prazo, as configurações e uma sessão pausada', () => {
  const custom = configurePomodoro(createPomodoro(), { focusMinutes: 40, breakMinutes: 10, dailyGoal: 3 })
  const running = startPomodoro(custom, start, 'custom')
  const restored = readPomodoro(JSON.stringify(running))
  assert.deepEqual(restored, running)
  assert.equal(remainingTime(restored, start + 12 * minute), 28 * minute)
  const paused = pausePomodoro(restored, start + 12 * minute)
  assert.deepEqual(readPomodoro(JSON.stringify(paused)), paused)
})

test('reiniciar descarta tempo parcial, preservando os ciclos já concluídos', () => {
  const completed = finishIfDue(startPomodoro(createPomodoro(), start, 'done'), start + 25 * minute)
  const next = resetPomodoro(completed, 'focus')
  const running = startPomodoro(next, start + 30 * minute, 'partial')
  const reset = resetPomodoro(pausePomodoro(running, start + 35 * minute))
  assert.equal(reset.remainingMs, 25 * minute)
  assert.equal(reset.sessionId, null)
  assert.equal(reset.status, 'ready')
  assert.deepEqual(dailyProgress(reset, start), { sessions: 1, minutes: 25 })
})

test('pausar exatamente no prazo conclui o foco sem perder o crédito', () => {
  const running = startPomodoro(createPomodoro(), start, 'done')
  const result = pausePomodoro(running, start + 25 * minute)
  assert.equal(result.status, 'ready')
  assert.equal(result.phase, 'break')
  assert.equal(dailyProgress(result, start).sessions, 1)
})

test('meta usa o dia local e renova à meia-noite, preservando o histórico', () => {
  const beforeMidnight = new Date(2026, 9, 21, 23, 30).getTime()
  const afterMidnight = new Date(2026, 9, 22, 0, 5).getTime()
  const first = finishIfDue(startPomodoro(createPomodoro(), beforeMidnight, 'yesterday'), beforeMidnight + 25 * minute)
  assert.equal(localDay(beforeMidnight), '2026-10-21')
  assert.equal(new Date(beforeMidnight).toISOString().slice(0, 10), '2026-10-22')
  assert.equal(dailyProgress(first, beforeMidnight).sessions, 1)
  assert.equal(dailyProgress(first, afterMidnight).sessions, 0)
  assert.equal(Object.keys(first.completed).length, 1)
})

test('foco que cruza meia-noite conta no dia em que conclui', () => {
  const late = new Date(2026, 9, 21, 23, 50).getTime()
  const nextDay = new Date(2026, 9, 22, 1).getTime()
  const result = finishIfDue(startPomodoro(createPomodoro(), late, 'overnight'), nextDay)
  assert.equal(dailyProgress(result, late).sessions, 0)
  assert.equal(dailyProgress(result, nextDay).sessions, 1)
})

test('conclusão reconhecida só no dia seguinte conserva a data real do prazo', () => {
  const yesterday = new Date(2026, 9, 21, 18).getTime()
  const today = new Date(2026, 9, 22, 10).getTime()
  const result = finishIfDue(startPomodoro(createPomodoro(), yesterday, 'offline'), today)
  assert.equal(dailyProgress(result, yesterday).sessions, 1)
  assert.equal(dailyProgress(result, today).sessions, 0)
})

test('ajustes rejeitam limites inválidos e não alteram foco em andamento', () => {
  for (const patch of [{ focusMinutes: 0 }, { focusMinutes: 121 }, { breakMinutes: -1 },
    { breakMinutes: 61 }, { dailyGoal: 0 }, { dailyGoal: 21 }, { dailyGoal: 1.5 }, { focusMinutes: '25' }]) {
    const state = createPomodoro()
    assert.equal(configurePomodoro(state, { ...state.settings, ...patch }), state)
  }
  const running = startPomodoro(createPomodoro(), start, 'focus-1')
  assert.equal(configurePomodoro(running, { focusMinutes: 1, breakMinutes: 1, dailyGoal: 1 }), running)
})

test('armazenamento ausente ou corrompido retorna um timer utilizável', () => {
  for (const raw of [null, '', '{invalid', 'null', '[]', '42', JSON.stringify({ ...createPomodoro(), status: 'running' }),
    JSON.stringify({ ...createPomodoro(), remainingMs: -1 }), JSON.stringify({ ...createPomodoro(), endAt: 10 })]) {
    assert.deepEqual(readPomodoro(raw), createPomodoro())
  }
})

test('contagem arredonda para cima sem valores negativos', () => {
  assert.equal(formatCountdown(25 * minute), '25:00')
  assert.equal(formatCountdown(1001), '00:02')
  assert.equal(formatCountdown(1), '00:01')
  assert.equal(formatCountdown(-100), '00:00')
})
