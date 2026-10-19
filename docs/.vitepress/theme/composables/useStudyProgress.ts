import { computed, onMounted, onUnmounted, ref, toValue, type MaybeRefOrGetter } from 'vue'
import { useData } from 'vitepress'

const progressChanged = 'front-end-notes:study-progress'

function readProgress(key: string): string[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(key) ?? '[]')
    return Array.isArray(saved) ? saved.filter((url): url is string => typeof url === 'string') : []
  } catch {
    return []
  }
}

export function useStudyProgress(url: MaybeRefOrGetter<string>) {
  const { site } = useData()
  const storageKey = `front-end-notes:studied:${site.value.base}`
  const studiedPosts = ref<string[]>([])

  function syncProgress() {
    studiedPosts.value = readProgress(storageKey)
  }

  function handleStorage(event: StorageEvent) {
    if (event.key === storageKey || event.key === null) syncProgress()
  }

  onMounted(() => {
    syncProgress()
    window.addEventListener(progressChanged, syncProgress)
    window.addEventListener('storage', handleStorage)
  })

  onUnmounted(() => {
    window.removeEventListener(progressChanged, syncProgress)
    window.removeEventListener('storage', handleStorage)
  })

  const studied = computed(() => studiedPosts.value.includes(toValue(url)))

  function setStudied(checked: boolean) {
    const postUrl = toValue(url)
    const next = new Set(studiedPosts.value)
    if (checked) next.add(postUrl)
    else next.delete(postUrl)
    studiedPosts.value = [...next]

    try {
      localStorage.setItem(storageKey, JSON.stringify(studiedPosts.value))
      window.dispatchEvent(new Event(progressChanged))
    } catch {
      return
    }
  }

  return { studied, setStudied }
}
