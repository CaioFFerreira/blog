---
title: 'Generics: preservar relações entre entrada e saída'
description: 'Construa funções e contratos reutilizáveis com inferência, constraints e defaults, sem trocar precisão por any ou promessas de validação inexistente.'
date: '2026-10-16'
category: 'TypeScript'
tags:
  - Generics
  - Inferência
  - Constraints
---

Imagine uma função que recebe uma lista e devolve seu primeiro item. Se a lista contém nomes, o resultado deve manter o tipo de nome; se contém produtos, deve manter o de produto. Um **generic**, ou parâmetro de tipo, representa essa relação sem escrever uma função diferente para cada caso e sem perder informação usando `any`.

Um [generic](https://www.typescriptlang.org/docs/handbook/2/generics.html) é útil quando existe uma relação que precisa ser preservada para diferentes tipos. Aceitar qualquer entrada não é suficiente: a assinatura deve comunicar o que o resultado mantém daquela entrada.

## Preserve o tipo do item

```ts
function firstItem<Item>(items: readonly Item[]): Item | undefined {
  return items[0]
}

const firstNumber = firstItem([10, 20])
const firstArticle = firstItem([{ id: '1', title: 'Generics' }])

console.log(firstNumber)
console.log(firstArticle?.title)
```

As saídas são `10` e `Generics`. O compilador infere `Item` pelos argumentos. A assinatura inclui `undefined` porque a lista pode estar vazia; não promete um elemento que a implementação não garante.

Se o retorno fosse `any`, essa relação se perderia e operações incompatíveis poderiam passar. Se fosse apenas `unknown`, o consumidor precisaria refinar outra vez um resultado cujo formato já era conhecido pela entrada.

## Constraints expressam o mínimo necessário

```ts
function findById<Item extends { id: string }>(
  items: readonly Item[],
  id: string,
): Item | undefined {
  return items.find(item => item.id === id)
}

const match = findById([{ id: '1', title: 'Artigo', studied: false }], '1')
console.log(match?.studied)
```

A saída é `false`. O contrato exige `id`, mas preserva as outras propriedades do item inferido. A constraint não copia nem transforma o objeto e não precisa conhecer todas as suas propriedades.

Não use um cast para fabricar um `Item` novo só com `{ id }`: quem chamou poderia ter usado um tipo que também exige `title` e `studied`. O retorno precisa respeitar o tipo inteiro prometido.

## Um contrato genérico para paginação

```ts
interface Page<Item> {
  items: Item[]
  nextCursor: string | null
}

interface ArticleSummary {
  id: string
  title: string
}

const page: Page<ArticleSummary> = {
  items: [{ id: '1', title: 'Tipos reutilizáveis' }],
  nextCursor: null,
}
```

`Page` descreve a estrutura comum; cada consumidor escolhe o tipo do conteúdo. O generic não implementa paginação, consistência de cursor nem validação da API.

Uma função `fetchJson<Result>()` que apenas faz cast do JSON para `Result` pode parecer segura, mas deixa o chamador escolher um tipo sem prova. Para dados externos, receba um validador ou valide na fronteira, como mostra o [guia de type guards](./typescript-narrowing-type-guards.md).

## Inferência e parâmetros explícitos

Prefira [inferência](https://www.typescriptlang.org/docs/handbook/type-inference.html) quando os argumentos fornecem informação suficiente. Especificar `firstItem<string>([])` faz sentido para deixar explícito um tipo que a entrada vazia não comunica.

Defaults podem simplificar contratos com uma escolha comum:

```ts
type OperationResult<Value, Failure = Error> =
  | { ok: true; value: Value }
  | { ok: false; error: Failure }

const success: OperationResult<number> = { ok: true, value: 10 }
```

Aqui, omitir `Failure` escolhe `Error`, mas não obriga funções que usam esse tipo a capturar exceções. O resultado é um contrato a ser cumprido pela implementação.

## Evite parâmetros sem relação útil

Se um parâmetro de tipo não conecta entrada, saída ou propriedades do contrato, pergunte se ele precisa existir. Um utilitário muito genérico pode exigir casts e tornar uma função simples mais difícil de manter.

Generics não criam automaticamente variantes de execução para cada tipo, como especializações compiladas em certas outras linguagens. Eles ajudam a verificar o mesmo JavaScript gerado.

## Exercício

Experimente `firstItem([])`, busque um ID ausente e tente passar itens cujo `id` é número para `findById`. Explique por que a constraint rejeita esse último caso e por que os dois primeiros precisam permitir ausência no retorno.

## Continue estudando

- [Generics — TypeScript](https://www.typescriptlang.org/docs/handbook/2/generics.html)
- [Relacionar chaves e valores com keyof](./typescript-keyof-typeof.md)
- [Conditional types e infer](./typescript-conditional-types-infer.md)
