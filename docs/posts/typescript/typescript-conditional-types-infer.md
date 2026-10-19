---
title: "Conditional types e infer: escolher e extrair tipos no TypeScript"
description: "Entenda como condições transformam tipos e como infer extrai informações, com pré-requisitos e exemplos de cada resultado."
date: '2026-10-16'
category: 'TypeScript'
tags:
  - Conditional types
  - infer
  - Distribuição
---

Pense numa função que recebe uma Promise: talvez você queira representar o tipo do valor que ela entregará. **Tipos condicionais** permitem escolher tipos conforme uma condição de compatibilidade; `infer` ajuda a extrair uma parte deles. Este é um assunto avançado: comece por [generics](./typescript-generics.md) e [unions](./typescript-unions-intersections.md) se essas relações ainda forem novas.

[Conditional types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html) escolhem um tipo a partir de uma relação de compatibilidade. Eles são avaliados pelo sistema de tipos, não por um `if` que executa no navegador.

O [acesso a tipos por propriedade](./typescript-keyof-typeof.md) também aparece nos exemplos. Avance por uma transformação de cada vez; a complexidade só vale a pena quando evita duplicação sem esconder o contrato.

## Uma decisão baseada na estrutura

```ts
type MessageOf<Value> = Value extends { message: unknown }
  ? Value['message']
  : never

type ApiMessage = MessageOf<{ message: string; requestId: string }>
type MissingMessage = MessageOf<{ code: number }>
```

`ApiMessage` resulta em `string`; `MissingMessage`, em [`never`](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#the-never-type). O primeiro ramo pode acessar `message` porque a condição demonstrou que essa propriedade faz parte da estrutura.

Aqui, `extends` pergunta sobre compatibilidade de tipos; não está declarando herança de classe. Uma propriedade opcional `message?` não satisfaz automaticamente a exigência de uma propriedade obrigatória.

## infer extrai uma parte do tipo reconhecido

```ts
type ItemOf<Value> = Value extends readonly (infer Item)[] ? Item : never

type ArticleItem = ItemOf<readonly { id: string; title: string }[]>
type NumberItem = ItemOf<number[]>
type NotAnArray = ItemOf<string>
```

Os resultados são o objeto de artigo, `number` e `never`, respectivamente. `infer Item` introduz uma variável de tipo naquele padrão; ele não lê os itens de um array real.

O uso de [`readonly`](https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype) permite reconhecer também arrays e tuplas readonly. Para uma tupla com tipos diferentes, o item pode resultar numa [union](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#union-types) dos elementos.

## Derive o resultado de um contrato assíncrono

```ts
async function loadSummary() {
  return { total: 3, title: 'Meus artigos' }
}

type SummaryResult = Awaited<ReturnType<typeof loadSummary>>

const summaryResult: SummaryResult = { total: 3, title: 'Meus artigos' }
console.log(summaryResult.total)
```

A saída é `3`. `ReturnType` extrai o retorno; `Awaited` representa a resolução do valor aguardável. Usar os utilitários existentes é mais legível que reimplementar todos os casos de [Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) e thenables.

O tipo derivado acompanha essa função. Se o contrato externo da API é independente, valide os dados recebidos em vez de assumir que a [inferência](https://www.typescriptlang.org/docs/handbook/type-inference.html) do corpo local o comprova.

## Distribuição sobre unions

Quando o lado esquerdo da condição é um parâmetro de tipo isolado, a condição pode ser distribuída pelos membros de uma union:

```ts
type AsArray<Value> = Value extends unknown ? Value[] : never
type MixedArrays = AsArray<string | number>

type AsSingleArray<Value> = [Value] extends [unknown] ? Value[] : never
type SingleMixedArray = AsSingleArray<string | number>
```

`MixedArrays` é `string[] | number[]`. `SingleMixedArray` é `(string | number)[]`, pois as tuplas na condição impedem essa distribuição.

O primeiro contrato permite um array de strings ou um de números; o segundo permite misturar ambos no mesmo array. Trocar entre os dois pode alterar o significado de uma API sem mudar uma única linha de execução.

## never também participa dessa regra

```ts
type IsNever<Value> = [Value] extends [never] ? true : false
type EmptyCase = IsNever<never>
type TextCase = IsNever<string>
```

Os resultados são `true` e `false`. A forma com tupla evita a distribuição que faz um conditional sobre um parâmetro `never` produzir um resultado vazio em vez da classificação esperada.

## Quando parar de sofisticar?

Um tipo de centenas de operações que dificulta mensagens de erro pode custar mais que uma [interface](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#interfaces) explícita. Considere tempo do compilador, legibilidade no editor e capacidade de outra pessoa alterar o contrato.

Transformações recursivas precisam de limites e semântica para funções, arrays, datas e unions. Não trate `DeepReadonly` ou um gerador de caminhos como se a primeira versão curta cobrisse todos os valores da linguagem.

## Exercício verificável

Crie uma tupla readonly com string e número e observe `ItemOf`. Compare atribuir `['a', 1]` aos dois tipos de array do exemplo. Depois introduza uma alternativa inválida e confira se o compilador rejeita exatamente o caso esperado.

Esses testes devem conferir o tipo resultante, não apenas executar o JavaScript: muitas transformações deste artigo não existem depois da compilação.

## Referência

- [Conditional types, infer e distribuição — TypeScript](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html)
