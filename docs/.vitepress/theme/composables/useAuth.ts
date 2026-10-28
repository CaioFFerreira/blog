import type { User } from '@supabase/supabase-js'
import { withBase } from 'vitepress'
import { computed, onMounted, readonly, ref } from 'vue'
import { getSupabase } from '../supabase'
import { authErrorMessage } from '../auth-errors'

// Initialized only in the browser; shared by the header and protected views.
const user = ref<User | null>(null)
const ready = ref(false)
const busy = ref(false)
const errorMessage = ref('')
const accountName = computed<string>(() => {
  const name: unknown = user.value?.user_metadata.full_name
  return typeof name === 'string' && name.trim() ? name : user.value?.email || 'Minha conta'
})
let initialization: Promise<void> | undefined
const attemptKey = 'front-end-notes:login-attempt'

function clearAttempt(): void {
  try { sessionStorage.removeItem(attemptKey) } catch { /* Optional diagnostic only. */ }
}

async function initialize() {
  try {
    const client = await getSupabase(withBase('/'))
    // getSession alone can hide an OAuth callback failure and return null.
    const { error: initializationError } = await client.auth.initialize()
    if (initializationError) throw initializationError
    // One subscription for the app lifetime. Never call Auth APIs in this callback.
    client.auth.onAuthStateChange((_event, session) => {
      user.value = session?.user ?? null
    })
    const { data, error } = await client.auth.getSession()
    if (error) throw error
    user.value = data.session?.user ?? null
    let attemptedRecently = false
    try {
      const started = Number(sessionStorage.getItem(attemptKey))
      attemptedRecently = started > 0 && Date.now() - started >= 0 && Date.now() - started < 600_000
    } catch { /* Authentication does not depend on session storage. */ }
    if (!user.value && attemptedRecently) {
      const returnUrl = new URL(withBase('/livros.html'), window.location.origin).href
      errorMessage.value = `O login voltou sem uma sessão ativa. No Supabase, confira se ${returnUrl} está autorizado em Authentication → URL Configuration → Redirect URLs e tente entrar novamente.`
    }
    clearAttempt()
  } catch (error) {
    user.value = null
    errorMessage.value = authErrorMessage(error)
    clearAttempt()
  } finally {
    ready.value = true
  }
}

async function signIn(destination = '/') {
  if (busy.value) return
  busy.value = true
  errorMessage.value = ''
  try {
    const client = await getSupabase(withBase('/'))
    // Use an internal allowlist; never accept an arbitrary OAuth return URL.
    const returnPath = destination === '/livros.html' ? destination : '/'
    try { sessionStorage.setItem(attemptKey, String(Date.now())) } catch { /* Optional diagnostic only. */ }
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: new URL(withBase(returnPath), window.location.origin).href },
    })
    if (error) throw error
  } catch (error) {
    clearAttempt()
    errorMessage.value = authErrorMessage(error)
  } finally {
    busy.value = false
  }
}

async function signOut() {
  if (busy.value) return
  busy.value = true
  errorMessage.value = ''
  try {
    const client = await getSupabase(withBase('/'))
    const { error } = await client.auth.signOut({ scope: 'local' })
    if (error) throw error
    user.value = null
  } catch {
    errorMessage.value = 'Não foi possível sair. Tente novamente.'
  } finally {
    busy.value = false
  }
}

export function useAuth() {
  onMounted(() => { initialization ??= initialize() })
  return {
    user: readonly(user), ready: readonly(ready), busy: readonly(busy),
    errorMessage: readonly(errorMessage), accountName, signIn, signOut,
  }
}
