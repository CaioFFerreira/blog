import type { Theme } from 'vitepress'
import Layout from './Layout.vue'
import './style.css'
import TermDefinition from './components/TermDefinition.vue'

export default {
  Layout,
  enhanceApp({ app }) {
    app.component('TermDefinition', TermDefinition)
  },
} satisfies Theme
