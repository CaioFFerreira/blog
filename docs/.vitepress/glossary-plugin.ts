import type { MarkdownRenderer } from 'vitepress'
import { glossary, normalizeTerm } from './theme/glossary'

export function glossaryPlugin(md: MarkdownRenderer): void {
  md.core.ruler.after('inline', 'contextual-definitions', state => {
    const frontmatter = state.env.frontmatter ?? {}
    const custom: Record<string, string> = {}
    if (frontmatter.glossary && typeof frontmatter.glossary === 'object' && !Array.isArray(frontmatter.glossary)) {
      for (const [term, definition] of Object.entries(frontmatter.glossary)) {
        if (term.trim() && typeof definition === 'string' && definition.trim()) custom[term] = definition
      }
    }
    const entries = new Map<string, { term: string; definition: string }>()
    const articlePath = state.env.relativePath ?? state.env.path ?? ''
    const isAngular = /(?:^|\/)posts\/angular\//.test(articlePath)
      || frontmatter.category === 'Angular'
    const contextual: Record<string, string> = {}
    if (isAngular) {
      contextual.worker = 'Neste contexto de interface Angular, um Web Worker executa JavaScript fora do fluxo principal da página e se comunica por mensagens, sem acessar o DOM diretamente.'
      contextual.schema = 'Na configuração de formulários, descreve a estrutura dos campos e as regras de validação aplicadas aos seus valores.'
    }
    if (/angular-injecao-dependencias/.test(articlePath)) {
      contextual.token = 'Na injeção de dependências do Angular, token é a chave usada para pedir uma dependência ao injector. Aqui ele não é uma credencial de login.'
    }
    if (/devops-(?:cloud-dns-cdn|linux-nginx)|system-design-portal-escala/.test(articlePath)) {
      contextual.origem = 'Neste desenho de hospedagem, é o servidor ou armazenamento que fornece o conteúdo por trás da CDN. A resposta pública pode passar por cache antes de chegar ao visitante.'
    }
    if (/arquitetura-design-system-composicao/.test(articlePath)) {
      contextual.token = 'Num Design System, um token dá nome a uma decisão de design, como uma cor ou espaçamento, para poder reutilizá-la de forma consistente.'
    }
    if (/backend-filas-workers-logs|system-design-documentos-notificacoes/.test(articlePath)) {
      contextual.worker = 'Processo que consome mensagens da fila e executa o trabalho solicitado, como gerar um documento. Precisa tratar falhas e possíveis entregas repetidas.'
    }
    if (/typescript\//.test(articlePath)) {
      contextual.contrato = 'Descrição dos dados e operações esperados pelo sistema de tipos, como campos obrigatórios e tipos de parâmetros. Isso não valida sozinho dados recebidos durante a execução.'
    }
    for (const [term, definition] of Object.entries({ ...glossary, ...contextual, ...custom })) {
      entries.set(normalizeTerm(term), { term, definition })
    }
    const escape = (value: string) => md.utils.escapeHtml(value).replace(/\n/g, '&#10;')
    const escapePattern = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const terms = [...entries.values()].map(entry => entry.term).sort((a, b) => b.length - a.length)
    const pattern = new RegExp(`(?<![\\p{L}\\p{N}_])(?:${terms.map(escapePattern).join('|')})(?![\\p{L}\\p{N}_])`, 'giu')
    const seen = new Set<string>()
    for (let i = 0; i < state.tokens.length; i++) {
      const parent = state.tokens[i]!
      // Keep headings, code, images and existing links unchanged.
      if (parent.type !== 'inline' || state.tokens[i - 1]?.type !== 'paragraph_open' || !parent.children) continue
      let linkDepth = 0
      let htmlDepth = 0
      parent.children = parent.children.flatMap(token => {
        if (token.type === 'link_open') linkDepth++
        if (token.type === 'link_close') linkDepth--
        if (token.type === 'html_inline') {
          if (/^<\/[\w:-]+\s*>$/.test(token.content)) htmlDepth = Math.max(0, htmlDepth - 1)
          else if (/^<[a-z][\w:-]*\b[^>]*>$/i.test(token.content)
            && !/\/\s*>$/.test(token.content)
            && !/^<(?:br|hr|img|input|wbr|source)\b/i.test(token.content)) htmlDepth++
        }
        if (token.type !== 'text' || linkDepth || htmlDepth || seen.size >= 8) return [token]
        const result = []
        let offset = 0
        for (const match of token.content.matchAll(pattern)) {
          const key = normalizeTerm(match[0])
          if (seen.has(key) || seen.size >= 8) continue
          const entry = entries.get(key)
          if (!entry) continue
          if (match.index > offset) {
            const before = new state.Token('text', '', 0)
            before.content = token.content.slice(offset, match.index)
            result.push(before)
          }
          const definition = new state.Token('html_inline', '', 0)
          definition.content = `<TermDefinition term="${escape(match[0])}" definition="${escape(entry.definition)}" />`
          result.push(definition)
          seen.add(key)
          offset = match.index + match[0].length
        }
        if (offset < token.content.length) {
          const after = new state.Token('text', '', 0)
          after.content = token.content.slice(offset)
          result.push(after)
        }
        return result.length ? result : [token]
      })
    }
  })
}
