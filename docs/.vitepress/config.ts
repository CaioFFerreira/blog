import { defineConfig } from 'vitepress'
import { glossaryPlugin } from './glossary-plugin'

export default defineConfig({
  title: 'Caio / Front-end Notes',
  description: 'Notas sobre front-end, código e o que aprendemos pelo caminho.',
  lang: 'pt-BR',
  base: process.env.BASE_PATH || '/',
  lastUpdated: true,
  markdown: {
    config: glossaryPlugin,
  },
  rewrites: {
    'posts/:theme/:slug': 'posts/:slug',
  },
  vite: {
    server: {
      watch: { usePolling: true, interval: 300 },
    },
  },
  head: [['meta', { name: 'theme-color', content: '#121814' }]],
})
