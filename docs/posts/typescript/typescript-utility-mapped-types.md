---
title: "Utility e mapped types: transformar contratos sem copiar interfaces"
description: "Aprenda a selecionar, tornar opcionais e transformar propriedades, distinguindo tipos de alterações em objetos reais."
date: '2026-10-16'
category: 'TypeScript'
tags:
  - Utility types
  - Mapped types
  - Contratos
---

Imagine um cadastro completo e uma tela que só pode editar nome e telefone. Os **utility types** são transformações prontas de tipos; os **mapped types** permitem descrever transformações por propriedade. Isso reduz repetição no contrato TypeScript, mas não remove campos de objetos durante a execução. Antes dos exemplos, ajuda conhecer [interfaces](./typescript-inferencia-interfaces-types.md) e [`keyof`](./typescript-keyof-typeof.md).

Copiar uma [interface](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#interfaces) só para tornar duas propriedades opcionais cria manutenção duplicada. TypeScript oferece utilitários para expressar transformações comuns, mas o nome escolhido ainda precisa representar a regra do domínio.

## Comece por um contrato com responsabilidades claras

```ts
interface CustomerRecord {
  id: string
  name: string
  email: string
  address: { city: string }
}

type CustomerSummary = Pick<CustomerRecord, 'id' | 'name'>
type CustomerDraft = Omit<CustomerRecord, 'id'>
type CustomerPatch = Partial<Pick<CustomerRecord, 'name' | 'email'>>
type CustomerView = Readonly<CustomerRecord>
```

[`Pick`](https://www.typescriptlang.org/docs/handbook/utility-types.html#picktype-keys) seleciona campos, [`Omit`](https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys) remove nomes do contrato, [`Partial`](https://www.typescriptlang.org/docs/handbook/utility-types.html#partialtype) torna propriedades opcionais e [`Readonly`](https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype) impede atribuições diretas por aquela visão de tipo.

O patch seleciona explicitamente campos editáveis antes de torná-los opcionais. `Partial<CustomerRecord>` seria mais permissivo, incluindo `id` e outras propriedades que talvez não possam ser alteradas.

Esses utilitários descrevem tipos. `Omit` não remove `id` de um objeto durante a execução, e nenhum deles transforma uma resposta em um conteúdo da mensagem seguro para publicação. Construa o objeto de saída com os campos permitidos quando isso fizer parte da regra.

## Transformações usuais são rasas

```ts
const customer: CustomerView = {
  id: '1',
  name: 'Caio',
  email: 'caio@example.com',
  address: { city: 'Recife' },
}

customer.address.city = 'Natal'
console.log(customer.address.city)
```

A saída é `Natal`. O `Readonly` do objeto externo não torna o objeto interno readonly. Também não congela nada em JavaScript. `Partial` não torna automaticamente todas as propriedades internas opcionais.

Um patch com `address` parcial exige um contrato e uma política de merge próprios. Não substitua atualização de domínio por uma transformação recursiva sem definir a semântica.

## Record descreve um conjunto de chaves

```ts
type ThemeName = 'light' | 'dark'
const themeLabels: Record<ThemeName, string> = {
  light: 'Claro',
  dark: 'Escuro',
}

console.log(themeLabels.dark)
```

A saída é `Escuro`. A [union](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#union-types) finita exige as duas chaves. Já `Record<string, string>` não prova que toda chave arbitrária existe durante a execução. A opção `noUncheckedIndexedAccess` ajuda a representar ausência ao acessar índices não comprovados; ela não está implicitamente habilitada por toda configuração `strict`.

## Mapped types expressam a transformação

Depois de conhecer [keyof e indexed access](./typescript-keyof-typeof.md), podemos escrever um tipo de erros por campo:

```ts
type FieldErrors<Model> = {
  [Field in keyof Model]?: string[]
}

const errors: FieldErrors<CustomerDraft> = {
  email: ['Informe um endereço válido.'],
}
```

Cada chave do modelo pode receber uma lista de mensagens. Isso não valida o formulário e não modela caminhos internos como `address.city`; esse requisito precisaria de outro contrato.

Modificadores também podem ser removidos:

```ts
type EditableRequired<Model> = {
  -readonly [Field in keyof Model]-?: Model[Field]
}

type SavedOptions = EditableRequired<{
  readonly title?: string
}>

const savedOptions: SavedOptions = { title: 'Configuração' }
savedOptions.title = 'Atualizada'
```

O resultado exige a propriedade e retira readonly na superfície. A alteração do tipo não executa preenchimento de campos ausentes em objetos reais.

## Outros utilitários que vale reconhecer

`Required` torna propriedades obrigatórias; `NonNullable` remove `null` e `undefined` de uma union; `Extract` e `Exclude` selecionam alternativas; `Parameters`, `ReturnType` e `Awaited` derivam informações de funções e [Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise).

Prefira os utilitários prontos quando expressam a intenção. O próximo guia explica [conditional types e infer](./typescript-conditional-types-infer.md), mecanismo usado em várias dessas relações.

## Como validar

Tente omitir uma chave do [`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type), acrescentar um campo não editável ao patch literal e reatribuir uma propriedade readonly. Depois observe quais mudanças continuam possíveis em objetos aninhados e no JavaScript gerado.

- [Utility types — TypeScript](https://www.typescriptlang.org/docs/handbook/utility-types.html)
- [Mapped types — TypeScript](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html)
