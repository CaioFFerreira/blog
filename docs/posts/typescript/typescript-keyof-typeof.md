---
title: "keyof e typeof: criar tipos a partir dos dados que já existem"
description: "Aprenda a obter tipos, chaves e valores de uma configuração sem repetir manualmente os mesmos nomes."
date: '2026-10-16'
category: 'TypeScript'
tags:
  - keyof
  - typeof
  - Indexed access types
---

Imagine um objeto com as configurações `claro` e `escuro`. Em vez de repetir esses nomes manualmente em um tipo, podemos derivá-los do objeto. **`typeof` no espaço de tipos** obtém o tipo de um valor; **`keyof`** obtém suas chaves permitidas. Vale conhecer [objetos e inferência](./typescript-inferencia-interfaces-types.md) antes de combinar as duas operações.

Quando uma configuração já existe, repetir manualmente seus nomes em outro tipo cria duas fontes de verdade. [`typeof`](https://www.typescriptlang.org/docs/handbook/2/typeof-types.html) no espaço de tipos e [`keyof`](https://www.typescriptlang.org/docs/handbook/2/keyof-types.html) permitem derivar relações estáticas a partir dessa configuração.

## typeof tem um uso de execução e outro de tipagem

```ts
const settings = { theme: 'dark', pageSize: 20 }
type Settings = typeof settings

console.log(typeof settings)
```

No `console.log`, JavaScript produz `'object'`. Já `type Settings = typeof settings` consulta a forma estática do valor e não gera uma inspeção durante a execução.

O tipo inferido de `theme` nesse objeto é `string`, não obrigatoriamente o literal `'dark'`. Para decisões sobre preservação de literais, veja o [guia de inferência](./typescript-inferencia-interfaces-types.md).

## keyof produz as chaves permitidas pelo tipo

```ts
type SettingKey = keyof Settings

function describeKey(key: SettingKey): string {
  return `Configuração: ${key}`
}

console.log(describeKey('pageSize'))
```

`SettingKey` é `'theme' | 'pageSize'`. A saída é `Configuração: pageSize`. Passar `'language'` não atende a esse contrato.

Tipos com index signatures podem representar conjuntos de chaves mais amplos. Chaves podem ser strings, números ou símbolos conforme o tipo; não trate todo `keyof` como uma lista finita de strings.

## Indexed access relaciona uma chave ao valor

```ts
function getValue<ObjectType, Key extends keyof ObjectType>(
  object: ObjectType,
  key: Key,
): ObjectType[Key] {
  return object[key]
}

const pageSize = getValue(settings, 'pageSize')
const theme = getValue(settings, 'theme')

console.log(pageSize.toFixed(0))
console.log(theme.toUpperCase())
```

As saídas são `20` e `DARK`. O retorno depende da chave inferida: uma chave literal específica preserva o tipo daquele campo. Se a chave for uma [union](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#union-types) de várias opções, o retorno também pode ser uma union dos respectivos valores.

O getter não valida dados externos nem garante que uma propriedade opcional existe. Se o campo permite ausência, o tipo do retorno precisa refletir isso.

## Derive uma union dos valores de uma configuração

```ts
const routes = {
  home: '/',
  articles: '/articles',
} as const

type RouteName = keyof typeof routes
type RoutePath = (typeof routes)[RouteName]

const articlePath: RoutePath = routes.articles
console.log(articlePath)
```

`RouteName` contém os nomes; `RoutePath` contém `'/' | '/articles'`. A saída é `/articles`. O exemplo modela rotas fictícias e não altera as URLs do blog.

Use isso quando os valores realmente são a fonte do contrato. Se o formato vem de uma API independente, derivar tudo de um exemplo local pode criar uma garantia enganosa.

## Por que Object.keys não equivale às chaves do tipo?

Objetos durante a execução podem conter propriedades além das declaradas no tipo estático. `Object.keys` também retorna apenas chaves próprias, enumeráveis e de string, enquanto `keyof` pode representar outras possibilidades.

Um cast global para fingir equivalência apaga essa diferença. Para uma operação que conhece suas chaves, declare uma lista explícita e confira-a com o contrato; para dados desconhecidos, valide as chaves recebidas.

## Exercício

Adicione `language` a `settings` e observe a atualização de `SettingKey`. Depois marque uma propriedade como opcional em um contrato e confira o retorno de `getValue`. A meta é entender qual informação foi preservada, não apenas fazer o código compilar.

## Referências

- [keyof — TypeScript](https://www.typescriptlang.org/docs/handbook/2/keyof-types.html)
- [typeof em tipos — TypeScript](https://www.typescriptlang.org/docs/handbook/2/typeof-types.html)
- [Mapped types](./typescript-utility-mapped-types.md)
