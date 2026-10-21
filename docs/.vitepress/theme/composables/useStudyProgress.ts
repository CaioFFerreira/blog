import { computed, onMounted, onUnmounted, ref, toValue, type MaybeRefOrGetter } from 'vue'
import { useData } from 'vitepress'
import { readApprovals } from '../quiz'

const progressChanged = 'front-end-notes:quiz-progress'
const unsavedApprovals = new Map<string, Record<string, string>>()

export function useStudyProgress(url: MaybeRefOrGetter<string>, version: MaybeRefOrGetter<string>) {
  const { site } = useData()
  const storageKey = `front-end-notes:quiz-passed:v1:${site.value.base}`
  const approvals = ref<Record<string, string>>({})
  const storageAvailable = ref(true)

  function readSaved() {
    try {
      return { ...readApprovals(localStorage.getItem(storageKey)), ...unsavedApprovals.get(storageKey) }
    } catch {
      storageAvailable.value = false
      return { ...approvals.value, ...unsavedApprovals.get(storageKey) }
    }
  }

  function syncProgress() {
    approvals.value = readSaved()
  }

  function handleProgress(event: Event) {
    const detail = (event as CustomEvent<{ key: string; approvals: Record<string, string> }>).detail
    if (detail?.key === storageKey) approvals.value = detail.approvals
  }

  function handleStorage(event: StorageEvent) {
    if (event.key === storageKey || event.key === null) {
      unsavedApprovals.delete(storageKey)
      syncProgress()
    }
  }

  onMounted(() => {
    syncProgress()
    window.addEventListener(progressChanged, handleProgress)
    window.addEventListener('storage', handleStorage)
  })

  onUnmounted(() => {
    window.removeEventListener(progressChanged, handleProgress)
    window.removeEventListener('storage', handleStorage)
  })

  const studied = computed(() => approvals.value[toValue(url)] === toValue(version))

  function markPassed() {
    approvals.value = { ...readSaved(), [toValue(url)]: toValue(version) }
    try {
      localStorage.setItem(storageKey, JSON.stringify(approvals.value))
      unsavedApprovals.delete(storageKey)
      storageAvailable.value = true
    } catch {
      storageAvailable.value = false
      unsavedApprovals.set(storageKey, approvals.value)
    }
    window.dispatchEvent(new CustomEvent(progressChanged, { detail: { key: storageKey, approvals: approvals.value } }))
  }

  return { studied, markPassed, storageAvailable }
}
