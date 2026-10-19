---
title: "Narrowing e type guards: descobrir com qual tipo você está trabalhando"
description: "Use verificações para reduzir as possibilidades de um valor e entenda os limites dessa conclusão, especialmente com dados externos."
date: '2026-10-16'
category: 'TypeScript'
tags:
  - Type narrowing
  - Type guards
  - unknown
---

Se um valor pode ser texto ou número, não podemos usar qualquer operação sem descobrir qual caso temos. **Narrowing** significa reduzir as possibilidades conhecidas pelo compilador após uma verificação, como `typeof valor === "string"`. Um **type guard** ajuda nessa identificação. Comece por [unions](./typescript-unions-intersections.md) para entender como representar essas alternativas.

[Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html) é o refinamento que o compilador faz a partir do fluxo de controle. Type guards são verificações que ajudam a demonstrar qual possibilidade vale naquele trecho. Essa relação é especialmente útil na entrada de dados externos.

## Checagens comuns e suas armadilhas

[`typeof`](https://www.typescriptlang.org/docs/handbook/2/typeof-types.html) distingue primitivas, mas `typeof null` é `'object'`. Arrays também são objetos; use `Array.isArray` quando a coleção fizer parte do contrato. `instanceof` pode ajudar com instâncias e APIs [DOM](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model), mas JSON comum não vira uma instância da sua classe automaticamente.

Não confunda presença com truthiness. `if (value)` elimina também zero, string vazia e `false`, que podem ser dados válidos. Prefira comparar explicitamente `null` ou `undefined` quando esse for o problema.

```ts
function describeLimit(limit: number | undefined): string {
  if (limit === undefined) return 'Sem limite definido'
  return `Limite: ${limit}`
}

console.log(describeLimit(0))
```

A saída é `Limite: 0`. O ramo preserva zero em vez de tratá-lo como ausência.

## Um predicado para uma entrada unknown

```ts
interface ArticleInput {
  id: string
  title: string
}

function isArticleInput(value: unknown): value is ArticleInput {
  return typeof value === 'object'
    && value !== null
    && 'id' in value
    && typeof value.id === 'string'
    && 'title' in value
    && typeof value.title === 'string'
}

function readArticleTitle(value: unknown): string {
  if (!isArticleInput(value)) throw new Error('Artigo inválido')
  return value.title
}

console.log(readArticleTitle({ id: '1', title: 'Narrowing' }))
```

A saída é `Narrowing`. O retorno `value is ArticleInput` comunica uma garantia ao compilador; as checagens no corpo precisam cumprir essa garantia.

O predicado valida o mínimo desse contrato, não exige que sejam as únicas propriedades nem verifica título não vazio. Ele usa `in`, que considera também propriedades herdadas. Se sua fronteira exige um registro de dados com propriedades próprias, acrescente essa validação ao contrato.

## O compilador confia no predicado que você escreveu

Uma função declarada como `value is ArticleInput` que sempre retorna `true` pode compilar e mentir. Predicados são uma responsabilidade de implementação, não uma prova automática de que todos os campos foram conferidos.

Teste valores válidos, `null`, arrays, propriedades ausentes e tipos incorretos. Para schemas extensos, uma biblioteca de validação pode reduzir manutenção, desde que você avalie seu custo e política de erros.

## Guards também ajudam em coleções

Depois das declarações anteriores:

```ts
const entradas: unknown[] = [
  { id: '1', title: 'TypeScript' },
  { id: 2, title: 'Inválido' },
  null,
]

const artigos = entradas.filter(isArticleInput)
console.log(artigos.map(artigo => artigo.title))
```

A saída é `['TypeScript']`, e `artigos` é inferido como `ArticleInput[]`. Descartar entradas inválidas é a regra escolhida para esse exemplo; em uma API real, talvez seja necessário rejeitar o conteúdo da mensagem inteiro ou registrar uma falha de contrato.

## Assertion function: interromper se a condição não for atendida

```ts
function assertArticleInput(value: unknown): asserts value is ArticleInput {
  if (!isArticleInput(value)) throw new Error('Artigo inválido')
}

function uppercaseTitle(value: unknown): string {
  assertArticleInput(value)
  return value.title.toUpperCase()
}
```

Se a função retorna normalmente, o restante do fluxo pode usar o tipo refinado. Diferentemente de `as ArticleInput`, ela executa uma verificação real. O operador `!` de non-null assertion também não cria checagem de execução.

## Refinamento é local ao que foi demonstrado

Uma alteração posterior pode invalidar uma suposição. Evite reatribuições desnecessárias e tenha cuidado com valores mutáveis usados em callbacks. Capturar um valor já validado e estável pode comunicar melhor o contrato que insistir em casts.

Este guia ensina o mecanismo; autorização e regras de negócio continuam sendo verificações distintas de “o JSON tem os campos esperados”.

## Continue estudando

- [Narrowing — TypeScript](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [Unions discriminadas](./typescript-unions-intersections.md)
- [Validação na integração de uma funcionalidade](./arquitetura-dependency-inversion-solid.md)
