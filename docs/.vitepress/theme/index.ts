import type { Theme } from 'vitepress'
import Layout from './Layout.vue'
import './style.css'
import './actions.css'
import TermDefinition from './components/TermDefinition.vue'
import { getSupabase } from './supabase'
import { hasAuthCallback } from './auth-errors'

export default {
  Layout,
  async enhanceApp({ app, siteData }) {
    app.component('TermDefinition', TermDefinition)
    if (typeof window !== 'undefined' && hasAuthCallback(new URL(window.location.href))) {
      // Process and persist the callback before VitePress starts routing.
      // useAuth checks the cached initialize result and displays any failure.
      try {
        const client = await getSupabase(siteData.value.base)
        await client.auth.initialize()
      } catch { /* The mounted auth view will surface the connection error. */ }
    }
  },
} satisfies Theme
