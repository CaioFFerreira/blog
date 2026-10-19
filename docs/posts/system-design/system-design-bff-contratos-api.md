---
title: "BFF e contratos de API: organizar a conversa entre tela e servidor"
description: "Entenda como uma camada de servidor pode reunir dados para a interface e definir respostas, erros, limites e compatibilidade."
date: '2026-10-16'
category: 'System Design'
tags:
  - BFF
  - Contratos de API
  - OpenAPI
  - Tratamento de erros
---

**BFF** significa *Backend for Frontend*: uma camada de servidor voltada às necessidades de uma interface. Imagine reunir nome, pedidos e avisos numa resposta adequada à tela. O **contrato de API** define dados, erros e comportamentos esperados dessa conversa. O objetivo é simplificar a integração sem esconder falhas nem transferir todas as regras para essa camada.

Quando uma tela precisa saber os endereços e formatos de dez serviços, ela passa a depender da organização interna do backend. Uma mudança nessa organização pode exigir mudanças na tela; essa ligação é uma forma de **acoplamento**. Um [BFF](https://learn.microsoft.com/en-us/azure/architecture/patterns/backends-for-frontends) pode adaptar e agregar dados para a experiência web, mas também vira um componente a operar, proteger e monitorar.

Não adicione essa camada quando uma API existente já atende bem ao cliente. O [padrão BFF](https://learn.microsoft.com/en-us/azure/architecture/patterns/backends-for-frontends) descreve benefícios de adaptação e custos como latência e manutenção adicional.

## Defina o papel da camada

No nosso portal, o BFF pode lidar com a sessão web, compor informações da página inicial e traduzir contratos internos em respostas adequadas ao navegador. Regras centrais de cobrança e permissão continuam na capacidade responsável, não duplicadas em cada BFF.

Um API gateway pode cuidar de roteamento e políticas de borda. Um BFF atende necessidades da interface. Um produto pode usar ambos, um deles ou uma implementação que combine responsabilidades claramente definidas.

[GraphQL](https://graphql.org/learn/) também pode oferecer seleção e composição de dados, mas não elimina automaticamente a necessidade de limites de custo, autorização e uma camada específica para a experiência.

## Evite uma agregação que derruba tudo por uma parte opcional

Uma resposta de dashboard pode distinguir conteúdo disponível de indisponibilidade parcial:

```json
{
  "profile": {
    "status": "ready",
    "data": { "displayName": "Caio" }
  },
  "notifications": {
    "status": "unavailable",
    "retryable": true
  }
}
```

O formato é um contrato didático, não um padrão universal. Ele permite renderizar o perfil sem afirmar que não há notificações. Uma lista vazia e uma consulta que falhou são estados diferentes.

Não use sucesso parcial para esconder a falha de um pré-requisito crítico. Se a sessão não é válida, não invente um perfil incompleto para continuar uma operação protegida.

## Erros precisam de semântica estável

Para uma operação rejeitada, um formato como Problem Details pode carregar a categoria do erro e um identificador de suporte:

```http
HTTP/1.1 409 Conflict
Content-Type: application/problem+json
Cache-Control: no-store
```

```json
{
  "type": "https://api.example.com/problems/document-not-ready",
  "title": "Documento ainda não disponível",
  "status": 409,
  "detail": "A geração ainda não terminou. Consulte o estado da solicitação.",
  "instance": "/document-requests/req_123",
  "requestId": "req_support_456"
}
```

Os endereços e IDs são fictícios. `requestId` é uma extensão escolhida para esse exemplo. A [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457.html) define o formato; a semântica desse problema continua sendo responsabilidade da API.

Não faça o cliente decidir comportamento comparando a frase de `detail`, que pode mudar ou ser traduzida. Use uma categoria estável. Evite expor stack traces, consultas internas ou dados de outras pessoas.

## Contrate paginação e evolução

Listas grandes precisam de limites. Com cursor, estabeleça ordenação estável, desempate, expiração e comportamento diante de novos itens. Uma resposta pode fornecer `items` e `nextCursor`; o cursor é opaco para o cliente, não autorização para acessar qualquer recurso.

Documente campos obrigatórios, nulabilidade, formatos de data, moeda e estados possíveis. Dinheiro não deve depender de cálculos imprecisos com floats no navegador; o servidor é a fonte dos valores autorizados.

Adicionar um campo costuma ser mais compatível que remover ou mudar seu significado, mas um enum novo também pode quebrar clientes que não tratam valores desconhecidos. Abas antigas podem continuar abertas após um deploy; teste compatibilidade entre versões reais.

A [especificação OpenAPI](https://spec.openapis.org/oas/latest.html) ajuda a descrever o contrato e apoiar geração e testes. Tipos gerados não validam automaticamente o JSON recebido durante a execução; valide nas bordas conforme o risco.

## Limite as chamadas internas geradas por cada requisição

Fan-out é o desdobramento de uma chamada em várias operações internas. No [padrão de agregação por gateway](https://learn.microsoft.com/en-us/azure/architecture/patterns/gateway-aggregation), esse custo precisa ser considerado mesmo quando o cliente vê apenas um endpoint. O BFF deve ter orçamento de tempo por dependência, limites de concorrência e estratégia para partes opcionais. Repetir todas as chamadas internas porque uma delas falhou pode multiplicar carga.

Um endpoint que consulta cem recursos internos precisa ser avaliado como tal, mesmo que o navegador faça apenas uma chamada. Monitore o custo e a latência por jornada, não só o número de endpoints públicos.

## Testes que protegem a integração

Teste conteúdo da mensagem inválido, campo desconhecido, falha parcial, paginação e uma versão anterior do cliente. Combine testes do contrato com um fluxo real: um mock que reproduz a suposição do front-end não comprova que a API atende ao contrato.

## Continue estudando

- [Retry e orçamento de tempo](./system-design-erros-retry-pagamentos.md)
- [Observabilidade de ponta a ponta](./system-design-disponibilidade-observabilidade.md)
