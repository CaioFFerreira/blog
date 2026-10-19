---
title: 'Cache, estado e performance em um portal autenticado'
description: 'Separe assets públicos, respostas pessoais e estado local, reduzindo carga sem misturar usuários nem apresentar dados antigos como confirmação atual.'
date: '2026-10-16'
category: 'System Design'
tags:
  - Cache
  - Estado
  - Performance
  - CDN
---

**Cache** é reutilizar uma resposta guardada; **TTL** (*Time to Live*) é um prazo de validade. Pense em duas pessoas usando o mesmo navegador em momentos diferentes: uma resposta pessoal guardada não pode reaparecer para a outra. Por isso, validade, identidade e limpeza do cache precisam ser pensadas juntas, além do ganho de velocidade.

No portal, o mesmo ícone pode ser entregue a milhões de pessoas. Uma fatura não pode ser compartilhada com outro cliente por engano. O primeiro passo de cache é classificar o conteúdo e sua sensibilidade, não aplicar um TTL igual para tudo.

## Revise o caminho de uma resposta pessoal

Os mecanismos e cabeçalhos estão no [guia de cache HTTP e memoization](./performance-cache-memoization.md). Aqui, a decisão é verificar se o isolamento continua correto ao atravessar CDN, [BFF](https://learn.microsoft.com/en-us/azure/architecture/patterns/backends-for-frontends) e navegador.

Escolha uma rota pessoal, como `/api/documents`, e registre em cada camada: ela pode armazenar? O que identifica o dono? Quando o resultado deixa de ser válido? Uma resposta marcada corretamente na origem ainda exige conferir se as regras da borda respeitam essa política.

Faça também o caminho inverso: uma rota pública de catálogo continua pública se passar a incluir recomendações individuais? Uma mudança de conteúdo da mensagem pode exigir revisar a política de toda a rota, não apenas acrescentar um campo.

## A chave precisa representar a identidade correta

Considere uma consulta de documentos da organização atual. Uma chave de cache no cliente pode incluir usuário, organização e filtros:

```ts
interface DocumentQuery {
  userId: string
  organizationId: string
  status: 'ready' | 'processing'
}

function documentQueryKey(query: DocumentQuery): string {
  return JSON.stringify([
    'documents',
    query.userId,
    query.organizationId,
    query.status,
  ])
}

console.log(documentQueryKey({
  userId: 'user_1',
  organizationId: 'org_1',
  status: 'ready',
}))
```

O array fixo evita ambiguidades simples de concatenação. O exemplo é uma chave local, não uma recomendação para publicar IDs como labels de métricas. Trocar a chave não substitui autorização do servidor e não define expiração, invalidação ou limite de memória.

No logout e na troca de identidade, limpe ou isole consultas, rascunhos e requisições em voo. Um resultado atrasado da organização anterior não deve aparecer na atual.

## Estado confirmado e estado otimista têm contratos diferentes

Marcar uma notificação como lida pode aceitar atualização otimista, seguida de reconciliação e tratamento de falha. Confirmar um pagamento não deve usar a mesma estratégia para afirmar que houve cobrança.

Um cache antigo pode ajudar a mostrar histórico, mas não servir como prova de uma nova transação. Os estados e a reconciliação dessa operação estão no [fluxo de pagamentos com resultado desconhecido](./system-design-erros-retry-pagamentos.md).

## Reduza carga antes de adicionar capacidade

Pagine listas, evite polling em abas ocultas e não refaça as mesmas consultas em cada componente. Centralize consultas que representam o mesmo dado, com deduplicação e invalidação adequadas.

Uma expiração simultânea para milhares de clientes pode produzir um pico de atualização. Estratégias como variação de TTL e consolidação de requisições podem ajudar no servidor, mas precisam respeitar a validade do dado. Não reutilize dados sensíveis fora do escopo correto para reduzir carga.

## Compare duas jornadas, não apenas dois tempos de API

Meça a primeira visita de um cliente sem cache e a reabertura de documentos por alguém com sessão ativa. No primeiro caso, identifique o que é necessário para mostrar a entrada; no segundo, verifique se há consultas e processamento repetidos apesar dos dados ainda válidos.

Use as [Core Web Vitals](./performance-core-web-vitals.md) e o [trace de rede e CPU](./performance-devtools-network-waterfall.md) como instrumentos. O resultado esperado dessa comparação é decidir quais recursos cada jornada realmente precisa, sem transformar a visita autenticada em pré-carregamento de todas as áreas do portal.

## Deploy e abas antigas

O [guia de bundles](./performance-bundle-code-splitting-tree-shaking.md) explica a compatibilidade dos chunks entre versões. No portal, acrescente uma restrição de negócio: não force reload no meio de um pagamento apenas para atualizar o front-end. Antes de retomar, consulte o resultado da operação e recupere somente o contexto permitido para aquela identidade.

## Como validar

Teste acesso frio e aquecido, troca de usuário e organização, logout, resposta atrasada, cache vencido e nova versão. Confira cabeçalhos reais e cada camada, inclusive [service worker](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) se existir.

Compare taxa de acerto, latência, carga na origem e correção dos dados. Um cache rápido que mostra a conta errada é uma falha grave, não uma otimização aceitável.

## Referência do protocolo

A [RFC 9111, HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111.html) define armazenamento, reutilização e validação de respostas [HTTP](https://www.rfc-editor.org/rfc/rfc9110.html). Use-a para conferir a política implementada por navegador, proxy e CDN; caches da aplicação exigem contratos adicionais.

## Continue estudando

- [Autenticação e isolamento](./system-design-autenticacao-seguranca.md)
- [Erros e confirmação de pagamentos](./system-design-erros-retry-pagamentos.md)
