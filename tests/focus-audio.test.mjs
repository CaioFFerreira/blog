import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createFocusAudio } from '../docs/.vitepress/theme/focus-audio.ts'

function media(url) {
  const audio = new EventTarget()
  Object.assign(audio, { src: url, paused: true, volume: .5, currentTime: 0, loaded: false })
  audio.play = async () => { audio.paused = false; audio.dispatchEvent(new Event('playing')) }
  audio.pause = () => { audio.paused = true; audio.dispatchEvent(new Event('pause')) }
  audio.removeAttribute = name => { if (name === 'src') audio.src = '' }
  audio.load = () => { audio.loaded = true }
  return audio
}

test('nenhum arquivo carrega antes da primeira reprodução', () => {
  let created = 0
  const player = createFocusAudio('/music.m4a', url => { created++; return media(url) })
  player.dispose()
  assert.equal(created, 0)
})

test('reproduz o arquivo configurado, com volume integral e loop', async () => {
  const audio = media('/base/music.m4a')
  const player = createFocusAudio('/base/music.m4a', url => { assert.equal(url, audio.src); return audio })
  const states = []
  player.onStateChange(value => states.push(value))
  await player.play()
  assert.equal(audio.volume, 1)
  assert.equal(audio.loop, true)
  assert.equal(audio.preload, 'none')
  assert.equal(states.at(-1), true)
  player.dispose()
})

test('pausar e continuar preservam a posição sem recriar o áudio', async () => {
  const audio = media('/music.m4a')
  let created = 0
  const player = createFocusAudio(audio.src, () => { created++; return audio })
  await player.play()
  audio.currentTime = 123
  player.pause()
  assert.equal(audio.paused, true)
  await player.play()
  assert.equal(audio.paused, false)
  assert.equal(audio.currentTime, 123)
  assert.equal(created, 1)
  player.dispose()
})

test('desmontar pausa, libera o arquivo e remove listeners', async () => {
  const audio = media('/music.m4a')
  const player = createFocusAudio(audio.src, () => audio)
  let notifications = 0
  player.onStateChange(() => notifications++)
  await player.play()
  player.dispose()
  const previous = notifications
  audio.dispatchEvent(new Event('playing'))
  assert.equal(notifications, previous)
  assert.equal(audio.paused, true)
  assert.equal(audio.src, '')
  assert.equal(audio.loaded, true)
})

test('falha de reprodução permite nova tentativa e erro de mídia atualiza o estado', async () => {
  const audio = media('/music.m4a')
  const play = audio.play
  audio.play = async () => { throw new Error('blocked') }
  const player = createFocusAudio(audio.src, () => audio)
  const states = []
  let errors = 0
  player.onStateChange(value => states.push(value))
  player.onError(() => errors++)
  await assert.rejects(player.play(), /blocked/)
  assert.equal(states.at(-1), false)
  audio.play = play
  await player.play()
  audio.dispatchEvent(new Event('error'))
  assert.equal(states.at(-1), false)
  assert.equal(errors, 1)
  player.dispose()
})

test('desmontagem durante play pendente não notifica reprodução tardia', async () => {
  const audio = media('/music.m4a')
  let resolve
  audio.play = () => new Promise(done => { resolve = done })
  const player = createFocusAudio(audio.src, () => audio)
  let notifications = 0
  player.onStateChange(() => notifications++)
  const pending = player.play()
  player.dispose()
  resolve()
  await pending
  assert.equal(notifications, 0)
  assert.equal(audio.paused, true)
  await assert.rejects(player.play(), /encerrado/)
})
