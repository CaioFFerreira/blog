/** Carrega o MP3 somente ao reproduzir; mantém a posição ao pausar. */
export function createFocusAudio(source: string, createAudio: (url: string) => HTMLAudioElement = url => new Audio(url)) {
  let audio: HTMLAudioElement | undefined
  let disposed = false
  let listener: ((playing: boolean) => void) | undefined
  let errorListener: (() => void) | undefined

  const handlePlaying = () => listener?.(true)
  const handlePause = () => listener?.(false)
  const handleError = () => {
    listener?.(false)
    errorListener?.()
  }

  async function play() {
    if (disposed) throw new Error('Player encerrado.')
    if (!audio) {
      audio = createAudio(source)
      audio.preload = 'none'
      audio.loop = true
      audio.volume = 1
      audio.addEventListener('playing', handlePlaying)
      audio.addEventListener('pause', handlePause)
      audio.addEventListener('ended', handlePause)
      audio.addEventListener('error', handleError)
    }
    try {
      await audio.play()
      if (disposed) return
      listener?.(!audio.paused)
    } catch (error) {
      if (!disposed) listener?.(false)
      throw error
    }
  }

  function pause() {
    audio?.pause()
    listener?.(false)
  }

  function dispose() {
    disposed = true
    listener = undefined
    errorListener = undefined
    if (!audio) return
    audio.removeEventListener('playing', handlePlaying)
    audio.removeEventListener('pause', handlePause)
    audio.removeEventListener('ended', handlePause)
    audio.removeEventListener('error', handleError)
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
  }

  return {
    play, pause, dispose,
    onStateChange(callback: (playing: boolean) => void) { listener = callback },
    onError(callback: () => void) { errorListener = callback },
  }
}
