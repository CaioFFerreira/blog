import { defineConfig } from 'vitepress'
import { glossaryPlugin } from './glossary-plugin'

const base = process.env.BASE_PATH || '/'

export default defineConfig({
  title: 'Caio / Front-end Notes',
  description: 'Notas sobre front-end, código e o que aprendemos pelo caminho.',
  lang: 'pt-BR',
  base,
  lastUpdated: true,
  markdown: {
    config(md) {
      glossaryPlugin(md)
      const tableOpen = md.renderer.rules.table_open
      const tableClose = md.renderer.rules.table_close
      md.renderer.rules.table_open = (tokens, index, options, env, renderer) =>
        '<div class="table-scroll" role="region" aria-label="Tabela com rolagem horizontal" tabindex="0">'
        + (tableOpen?.(tokens, index, options, env, renderer) ?? renderer.renderToken(tokens, index, options))
      md.renderer.rules.table_close = (tokens, index, options, env, renderer) =>
        (tableClose?.(tokens, index, options, env, renderer) ?? renderer.renderToken(tokens, index, options)) + '</div>'
    },
  },
  rewrites: {
    'posts/:theme/:slug': 'posts/:slug',
  },
  vite: {
    server: {
      watch: { usePolling: true, interval: 300 },
    },
  },
  head: [
    ['meta', { name: 'theme-color', content: '#121814' }],
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${base.replace(/\/$/, '')}/favicon.svg` }],
  ],
})
