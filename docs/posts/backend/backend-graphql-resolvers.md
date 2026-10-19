---
title: "GraphQL e resolvers: da consulta da tela aos dados do servidor"
description: "Entenda schema, campos e resolvers, além do custo das consultas, dos erros parciais e dos limites de acesso."
date: '2026-10-16'
category: 'Backend'
tags:
  - GraphQL
  - Resolvers
  - Contratos
---

Pense numa tela que precisa apenas do nome de um cliente e dos títulos de seus pedidos. Em GraphQL, a consulta descreve esses campos. O **schema** define quais dados e operações existem, e os **resolvers** são as funções que obtêm seus valores. Para acompanhar, ajuda conhecer o [caminho de uma requisição ao servidor](./backend-requisicao-rest-gateway.md).

[GraphQL](https://graphql.org/learn/) oferece uma linguagem de consulta e um modelo de execução baseado em schema. O cliente escolhe campos permitidos, mas o servidor ainda decide como obtê-los, quem pode acessá-los e quanto trabalho aceitar.

Ele não substitui banco, regra de negócio nem autorização. REST e GraphQL são alternativas para certos contratos de API, não respostas universais para qualquer produto.

## Um schema de leitura

```graphql
type Customer {
  id: ID!
  displayName: String!
  documents: [Document!]!
}

type Document {
  id: ID!
  title: String!
}

type Query {
  customer(id: ID!): Customer
}
```

Nesse schema didático, `customer` pode ser nulo. `documents` não pode ser nulo nem conter itens nulos, mas pode ser uma lista vazia. O símbolo `!` faz parte do contrato de nulabilidade, não prova de que a implementação nunca falhará.

Uma consulta compatível:

```graphql
query CustomerDocuments($id: ID!) {
  customer(id: $id) {
    displayName
    documents {
      id
      title
    }
  }
}
```

As variáveis são enviadas separadamente, por exemplo `{ "id": "customer_1" }`. Os nomes são fictícios; este blog não oferece um endpoint GraphQL. O [guia oficial](https://graphql.org/learn/) apresenta schema, operações e execução.

## O resolver conecta um campo aos dados

Um resolver pode receber o objeto pai, argumentos, contexto e informações da execução. O contexto costuma transportar identidade já verificada e dependências adequadas à requisição.

No campo `customer`, o servidor verifica acesso ao cliente. Para `documents`, precisa respeitar também o acesso aos documentos; permissão para ver um nome não implica permissão para todos os seus dados.

Centralize regras no domínio responsável para não depender apenas do caminho de consulta escolhido. O mesmo documento pode ser alcançado por campos diferentes. A [orientação de autorização do GraphQL](https://graphql.org/learn/authorization/) discute essa separação.

## N+1: uma chamada pública pode esconder muitas consultas

Uma lista de 50 clientes pode disparar uma consulta inicial e mais uma para documentos de cada cliente. O navegador vê uma operação GraphQL; o banco recebe 51 consultas.

Batching e carregadores por chave podem agrupar consultas e reutilizar resultados durante a requisição. O escopo importa: um cache compartilhado entre usuários sem autorização adequada pode vazar dados. Se usar um loader por requisição, ele ainda precisa cumprir o contrato de ordem e correspondência das chaves.

Selecionar menos campos não garante automaticamente menos custo. Um campo pequeno pode chamar uma dependência cara. Observe latência por resolver e consultas executadas.

## Limites precisam existir no servidor

Paginação, limites de tamanho, profundidade e custo ajudam a evitar operações excessivas. Uma query válida no schema ainda pode ser inadequada operacionalmente. Regras de timeout e cancelamento também precisam ser coerentes com as dependências.

Desativar uma ferramenta de exploração ou esconder documentação não substitui autorização e controle de custo. O [guia de performance do GraphQL](https://graphql.org/learn/performance/) apresenta estratégias relevantes.

## Erros podem coexistir com dados

Uma execução pode devolver dados parciais e erros, conforme a falha e a nulabilidade. Uma falha num campo não anulável pode propagar até um ancestral anulável. Não conclua sucesso completo apenas porque a resposta [HTTP](https://www.rfc-editor.org/rfc/rfc9110.html) chegou com 200.

O cliente precisa tratar erro de transporte, erro de requisição e resultado parcial conforme o contrato. Não apresente uma falha de acesso como lista vazia só para evitar uma mensagem de erro.

## Escritas e assinaturas de eventos também precisam de contratos

Mutation representa operações de alteração, mas não cria uma transação de banco para todos os resolvers nem garante idempotência. Subscription descreve atualizações; o transporte e sua recuperação precisam ser definidos.

Para operar [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) ou [SSE](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events), siga o [guia de conexões no navegador](./navegador-websocket-sse.md). A decisão de entrega e reconciliação fica no [caso de notificações](./system-design-documentos-notificacoes.md).

## Exercício de revisão

Pergunte quantas consultas uma operação dispara, onde cada campo é autorizado, como limita listas e o que acontece se um campo falhar. Compare o mesmo fluxo com um endpoint REST adequado antes de decidir pela ferramenta.
