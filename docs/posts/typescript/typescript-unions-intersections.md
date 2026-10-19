---
title: 'Unions, intersections e estados discriminados: modelar possibilidades válidas'
description: 'Diferencie alternativas de combinações de contratos e use discriminantes e never para evitar estados impossíveis e verificar exaustividade.'
date: '2026-10-16'
category: 'TypeScript'
tags:
  - Unions/intersections
  - Discriminated unions
  - never
---

Imagine uma busca que pode estar carregando, ter falhado ou ter encontrado dados. Esses são estados alternativos e podem ser representados com uma **union**, usando `|`. Já uma **intersection**, usando `&`, exige atender a requisitos combinados, como ter identificação e data de criação. Os exemplos mostram como essa modelagem evita assumir dados que ainda não existem.

Uma [union](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#union-types) descreve alternativas: um valor pode pertencer a um tipo ou a outro. Uma [intersection](https://www.typescriptlang.org/docs/handbook/2/objects.html#intersection-types) exige que ele satisfaça todos os contratos combinados. Essa diferença importa mais que decorar os símbolos `|` e `&`.

## Union: só assuma o que é válido para as possibilidades restantes

```ts
function describeValue(value: string | number): string {
  if (typeof value === 'number') return value.toFixed(2)
  return value.toUpperCase()
}

console.log(describeValue(12))
console.log(describeValue('pronto'))
```

As saídas são `12.00` e `PRONTO`. Antes da verificação, não seria seguro chamar `toUpperCase` diretamente porque o valor também pode ser um número. A checagem reduz as possibilidades no ramo correspondente.

Uma union estrutural de objetos não é automaticamente um XOR exato que proíbe qualquer combinação de propriedades. Se as alternativas representam estados exclusivos, um discriminante explícito costuma expressar melhor a regra.

## Intersection: atender a todos os contratos

```ts
type IdentifiedDocument = { id: string }
type TitledDocument = { title: string }
type DocumentSummary = IdentifiedDocument & TitledDocument

const summary: DocumentSummary = { id: 'doc_1', title: 'Extrato' }
console.log(summary.title)
```

A saída é `Extrato`. O tipo exige `id` e `title`. Isso não faz merge de objetos no JavaScript; descreve o resultado esperado de um valor.

Interseção também não é a sobrescrita do spread. Em `type Conflict = { id: string } & { id: number }`, a propriedade precisa atender aos dois requisitos incompatíveis e resulta em [`never`](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#the-never-type). Não use `&` esperando que o segundo contrato substitua o primeiro.

## Uma discriminated union liga o dado ao estado certo

Imagine um upload. Guardar `isUploading`, `isComplete`, `error` e `fileId` independentemente permite combinações sem sentido. Uma modelagem possível:

```ts
type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; progress: number }
  | { status: 'complete'; fileId: string }
  | { status: 'failed'; message: string }

function unreachable(value: never): never {
  throw new Error('Estado de upload não tratado')
}

function uploadMessage(state: UploadState): string {
  switch (state.status) {
    case 'idle': return 'Escolha um arquivo'
    case 'uploading': return `Enviando: ${state.progress}%`
    case 'complete': return `Arquivo disponível: ${state.fileId}`
    case 'failed': return state.message
    default: return unreachable(state)
  }
}

console.log(uploadMessage({ status: 'complete', fileId: 'file_1' }))
```

A saída é `Arquivo disponível: file_1`. Após testar `status`, o compilador conhece os campos daquele membro. `fileId` só é obrigatório na alternativa `complete`, não em todo estado.

## never ajuda a detectar uma alternativa esquecida

No `default`, todos os estados conhecidos foram eliminados. Se acrescentar um estado `cancelled` sem tratar seu caso, `state` deixa de ser `never` naquele ponto, e a chamada de `unreachable` deixa de compilar.

Esse é um teste de exaustividade estática. A função ainda lança durante a execução se um valor externo inválido atravessar a fronteira. Tipos não verificam sozinhos mensagens de rede.

## O modelo não valida todas as regras do domínio

`progress: number` ainda admite números fora de 0 a 100. A union não impede que a aplicação faça uma transição indevida de `idle` para `complete`; ela descreve estados, não implementa a máquina de transições.

Validação e funções responsáveis por transições complementam o contrato. A decisão de quem possui o estado está no [guia de state management](./arquitetura-state-management.md); aqui, o foco é expressar suas alternativas corretamente.

## Exercício

Adicione `cancelled`, observe a falha de compilação e implemente a mensagem correspondente. Depois tente construir um estado `complete` sem `fileId` e explique o erro antes de corrigi-lo.

Para uma aplicação em que falha de rede deixa o resultado de uma operação incerto, veja os [estados de pagamento e reconciliação](./system-design-erros-retry-pagamentos.md). É uma aplicação do mecanismo, não outro tipo de union.

## Referência

- [Discriminated unions e exaustividade — TypeScript](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions)
