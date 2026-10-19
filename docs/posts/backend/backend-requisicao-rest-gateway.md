---
title: 'Por dentro de uma API REST: gateway, aplicação e persistência'
description: 'Acompanhe uma requisição no servidor, separe transporte de regra de negócio e entenda métodos HTTP, validação e autorização além do fetch.'
date: '2026-10-16'
category: 'Backend'
tags:
  - REST
  - API Gateway
  - Backend
---

Quando você clica em “Salvar”, o **front-end** é a interface com a qual interage; o **backend** recebe o pedido e aplica as regras no servidor. A **requisição** leva a operação e seus dados, e a **resposta** informa o resultado. Vamos seguir esse percurso para entender quem faz cada parte do trabalho.

Entender backend ajuda a discutir por que uma API tem determinado contrato, onde uma falha pode ocorrer e quais garantias a interface pode assumir. O objetivo desta série é acompanhar o trabalho do servidor, não escolher um framework por popularidade.

## O caminho não é uma fila obrigatória de componentes

```text
Frontend → Gateway ou entrada HTTP → Autenticação
                                          │
                                          ▼
                              Autorização e caso de uso
                                          │
                          ┌───────────────┼──────────────┐
                          ▼               ▼              ▼
                       Database       Cache opcional    Fila opcional
```

O gateway pode aplicar roteamento e limites de tráfego. A aplicação valida dados, decide acesso e executa a regra. Cache pode ser consultado antes do banco em algumas leituras, mas não faz parte obrigatória de toda operação. Gravações críticas podem dispensá-lo.

Autenticação pode acontecer em mais de uma fronteira. Um gateway validar o token não prova que a pessoa pode acessar o documento indicado na URL; a autorização por recurso continua necessária.

## REST não significa apenas responder JSON

REST é um estilo arquitetural que inclui recursos, representações e restrições como interface uniforme e interações stateless. Uma API [HTTP](https://www.rfc-editor.org/rfc/rfc9110.html) pragmática pode usar parte dessas ideias sem cumprir todas as restrições do estilo.

Uma requisição ilustrativa:

```http
GET /api/documents/doc_123 HTTP/1.1
Host: api.example.com
Accept: application/json
```

O servidor identifica o recurso, verifica acesso e responde com uma representação ou um erro apropriado. `Accept` informa formatos aceitos; `Content-Type` descreve o formato do corpo efetivamente enviado, quando houver.

Os nomes e endpoints desta série são fictícios. Contratos de erro e paginação já estão no [guia de BFF e APIs](./system-design-bff-contratos-api.md); aqui vamos localizar quem cumpre essas decisões.

## Métodos comunicam expectativas

| Método | Expectativa principal | Cuidado |
| --- | --- | --- |
| GET | Ler, sem solicitar mudança de estado de negócio | Não realizar exclusão ou cobrança |
| POST | Processar conforme o recurso | Não é idempotente por definição |
| PUT | Criar ou substituir o estado do recurso alvo | Idempotência não significa resposta sempre igual |
| PATCH | Aplicar alteração parcial definida pelo formato | Não é automaticamente idempotente |
| DELETE | Solicitar remoção conforme a semântica do recurso | Repetição pode devolver outro status sem perder idempotência |

Uma operação idempotente tem o mesmo efeito pretendido ao repetir a mesma requisição. Isso não significa que logs ou respostas sejam idênticos. A [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html) define a semântica HTTP; a política de retry precisa considerar também o contrato da operação.

## O trabalho interno de uma escrita

Ao receber um cadastro, a borda HTTP interpreta o conteúdo da mensagem e valida formato e limites. O caso de uso verifica regras, como unicidade ou transição permitida. A persistência executa consultas e restrições no banco.

Não dependa apenas de uma checagem prévia “esse e-mail existe?”. Duas requisições podem passar ao mesmo tempo. Se unicidade é uma garantia necessária, ela precisa de uma restrição apropriada na persistência, além de um erro tratável.

Separar controller, caso de uso e adaptador pode ajudar quando há responsabilidades distintas. Não são três arquivos obrigatórios para cada endpoint pequeno. O [guia de inversão de dependência](./arquitetura-dependency-inversion-solid.md) explica a separação de contratos.

## O que stateless não quer dizer?

Não significa que o produto não tem dados nem sessão. Significa, no contexto da restrição REST, que a interação traz o contexto necessário em vez de depender de uma sequência de conversa oculta mantida pelo servidor para interpretar a requisição.

Aplicações com sessão de login continuam existindo e podem ser escolhas válidas. Evite chamar toda API autenticada de estritamente RESTful sem discutir as restrições realmente adotadas.

## Perguntas úteis para trabalhar com o backend

Qual camada autoriza o recurso? Qual operação é atômica? Qual restrição evita duplicação? O erro significa rejeição ou resultado desconhecido? O endpoint pode ser repetido? Qual prazo limita as dependências?

Essas perguntas permitem negociar uma interface correta, em vez de apenas pedir mais um campo no JSON.

## Caminho da série

1. [GraphQL e resolvers](./backend-graphql-resolvers.md)
2. [JWT, OAuth, OIDC e refresh tokens](./backend-identidade-jwt-oauth-oidc.md)
3. [SQL e índices](./backend-sql-indices.md)
4. [Transações e concorrência](./backend-transacoes-concorrencia.md)
5. [Redis](./backend-redis-cache.md)
6. [Filas, workers e logs](./backend-filas-workers-logs.md)
