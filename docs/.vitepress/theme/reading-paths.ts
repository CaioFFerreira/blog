import { data as posts } from './posts.data'
import type { Post } from './types'

const definitions = [
  { category: 'JavaScript', goal: 'Entenda os dados, as funções e as interações de uma página.', order: 'valores-imutabilidade-memoria escopo-hoisting-closures es6-destructuring-spread-rest dom-elementos-eventos event-loop-promises-async-await promise-all-race-allsettled debounce-throttle localstorage-sessionstorage-cookies modulos-es this-prototype-chain', prefix: 'javascript' },
  { category: 'Acessibilidade', goal: 'Faça a interface funcionar com teclado e comunicar suas ações.', order: 'html-semantico-aria-nomes teclado-foco formularios-erros-aria-live modais-dialog tabelas wcag-contraste testes-screen-readers-axe', prefix: 'acessibilidade' },
  { category: 'TypeScript', goal: 'Descreva os dados e reconheça erros antes da execução.', order: 'inferencia-interfaces-types unions-intersections narrowing-type-guards generics keyof-typeof utility-mapped-types conditional-types-infer', prefix: 'typescript' },
  { category: 'Angular', goal: 'Monte componentes e evolua até formulários, estado e integrações.', order: 'componentes-comunicacao injecao-dependencias diretivas-pipes-lifecycle signals-estado formularios-validacao control-value-accessor http-interceptors rxjs-operadores rxjs-recursos-viewmodel rotas-guards-resolvers change-detection-performance renderizacao-hydration telemetria-workers testes-acessibilidade build-migracao', prefix: 'angular' },
  { category: 'Navegador', goal: 'Acompanhe carregamento, comunicação, armazenamento e segurança.', order: 'url-renderizacao same-origin-cors http-preload-prefetch indexeddb service-workers websocket-sse xss-csp csrf-clickjacking-tokens', prefix: 'navegador' },
  { category: 'Boas práticas', goal: 'Pratique mudanças pequenas que tornam o código mais claro.', order: 'menos-responsabilidades-mais-clareza', prefix: '' },
  { category: 'Testes', goal: 'Escolha o que verificar e avance de regras pequenas a jornadas completas.', order: 'estrategia-risco unitarios-vitest-jest mocks-contratos-assincronismo integracao-testing-library e2e-playwright-cypress manutencao-cobertura-ci', prefix: 'testes' },
  { category: 'Backend', goal: 'Siga uma requisição e entenda dados, acesso e trabalho em segundo plano.', order: 'requisicao-rest-gateway sql-indices transacoes-concorrencia identidade-jwt-oauth-oidc redis-cache graphql-resolvers filas-workers-logs', prefix: 'backend' },
  { category: 'Performance', goal: 'Investigue a lentidão antes de escolher o que otimizar.', order: 'devtools-network-waterfall core-web-vitals imagens-lazy-loading bundle-code-splitting-tree-shaking long-tasks cache-memoization virtualizacao-renderizacao memory-leaks', prefix: 'performance' },
  { category: 'Arquitetura Front-end', goal: 'Organize responsabilidades, estado e código compartilhado.', order: 'features-domain-boundaries dependency-inversion-solid state-management design-system-composicao monorepos micro-frontends evolucao-overengineering', prefix: 'arquitetura' },
  { category: 'System Design', goal: 'Junte as peças para planejar um portal e tratar suas falhas.', order: 'portal-escala autenticacao-seguranca bff-contratos-api cache-estado-performance erros-retry-pagamentos documentos-notificacoes disponibilidade-observabilidade', prefix: 'system-design' },
  { category: 'DevOps', goal: 'Leve uma alteração do histórico Git até uma publicação verificável.', order: 'git-colaboracao env-secrets ci-cd-actions-gitlab linux-nginx docker-registry cloud-dns-cdn release-rollback-observabilidade', prefix: 'devops' },
  { category: 'Decisões técnicas', goal: 'Compare alternativas usando o contexto e os limites do produto.', order: 'escopo-custo-crescimento front-backend-dados ssr-csr-estatico query-estado-global produtos-compartilhamento migracao-legado', prefix: 'decisao' },
]

export const startPost = posts.find(post => post.url === '/posts/por-onde-comecar.html')

interface ReadingPath {
  category: string
  goal: string
  posts: Post[]
}

// New topics and posts also join the paths without changes to this list.
const categories = [...new Set([...definitions.map(path => path.category), ...posts.map(post => post.category)])]
export const readingPaths: ReadingPath[] = categories.map(category => {
  const definition = definitions.find(path => path.category === category)
  const urls = definition?.order.split(' ').map(slug => `/posts/${definition.prefix ? `${definition.prefix}-` : ''}${slug}.html`) ?? []
  const members = posts.filter(post => post.category === category && post.url !== startPost?.url)
  const ranked = urls.flatMap(url => members.filter(post => post.url === url))
  const remaining = members.filter(post => !urls.includes(post.url))
    .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title, 'pt-BR'))
  return { category, goal: definition?.goal ?? 'Explore os artigos deste tópico.', posts: [...ranked, ...remaining] }
}).filter(path => path.posts.length > 0)

export const readingSequence = [...(startPost ? [startPost] : []), ...readingPaths.flatMap(path => path.posts)]
