import type { SupabaseClient } from '@supabase/supabase-js'

// Public frontend credentials. Access to data must be controlled by RLS.
const projectUrl = 'https://jwnjaaxjsaserwtypphn.supabase.co'
const publishableKey = 'sb_publishable_Ti6E661xzcGqH_FC9TM_BA_0hdxvvl7'

let client: Promise<SupabaseClient> | undefined

export function getSupabase(base: string): Promise<SupabaseClient> {
  if (typeof window === 'undefined') throw new Error('Authentication requires a browser.')
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(projectUrl, publishableKey, {
      auth: {
        flowType: 'implicit',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: `front-end-notes:${base}:auth`,
      },
    }),
  ).catch((error: unknown) => {
    client = undefined
    throw error
  })
  return client
}
