---
title: 'Inferência, interfaces e type aliases: contratos sem anotações desnecessárias'
description: 'Entenda o que o compilador consegue deduzir, quando anotar uma fronteira e como escolher entre interface e type sem confundir tipos com validação.'
date: '2026-10-16'
category: 'TypeScript'
tags:
  - Inferência
  - Interfaces × types
  - Contratos
---

**Tipo** descreve os valores esperados, como um texto ou um objeto com nome e idade. **Inferência** é o compilador deduzir esse tipo a partir do código. Uma **interface** ou um **type** permite dar nome a um contrato. Para acompanhar, ajuda reconhecer variáveis, funções e objetos de JavaScript; vamos distinguir checagem durante o desenvolvimento de validação durante a execução.

TypeScript analisa relações entre valores antes da execução. Ele ajuda a detectar uso incompatível, mas seus tipos normalmente são apagados na geração de JavaScript: escrever uma [interface](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#interfaces) não cria um validador para a resposta de uma API.

Os exemplos desta série pressupõem `strict: true`. Recursos avançados só ajudam quando tornam um contrato mais compreensível; não é necessário anotar cada variável.

## Inferência começa nos valores e no contexto

```ts
const titulo = 'Estudando TypeScript'
let modo = 'escuro'
const tamanhos = [12, 16, 20]
const descricoes = tamanhos.map(tamanho => `${tamanho}px`)
```

O compilador infere o literal de `titulo`, mas `modo` é `string`, pois pode receber outra string. `tamanhos` é `number[]`, e o parâmetro de `map` recebe contexto suficiente para ser um número. `descricoes` é `string[]`.

Um `const` que guarda um objeto não torna suas propriedades constantes. Elas podem ser ampliadas para tipos mais gerais conforme o contexto de [inferência](https://www.typescriptlang.org/docs/handbook/type-inference.html).

```ts
const configuracao = { tema: 'escuro' }
const configuracaoLiteral = { tema: 'escuro' } as const
```

No primeiro objeto, `tema` é `string`; no segundo, é o literal [readonly](https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype) `'escuro'`. `as const` não chama `Object.freeze` nem impede alterações nas propriedades durante a execução. Para o efeito real de mutações, veja o [guia de valores e imutabilidade](./javascript-valores-imutabilidade-memoria.md).

## Anote fronteiras que precisam de um contrato estável

```ts
interface Profile {
  id: string
  displayName: string
  bio?: string
}

function profileTitle(profile: Profile): string {
  return profile.displayName.trim() || 'Sem nome'
}

const profile: Profile = { id: '1', displayName: 'Caio' }
console.log(profileTitle(profile))
```

A saída é `Caio`. O parâmetro comunica a exigência da função; o retorno explícito protege sua fronteira caso a implementação mude. Em uma função local pequena, inferir o retorno também pode ser suficiente.

`bio?` permite ausência, e sua leitura pode resultar em `undefined`. Não significa que qualquer valor, incluindo `null`, seja válido. A opção `exactOptionalPropertyTypes` pode tornar mais precisa a diferença entre ausência e atribuição explícita de `undefined`; ela precisa estar habilitada para essa verificação adicional.

## interface e type se sobrepõem, mas não são idênticos

Interfaces são apropriadas para descrever formas de objetos e extensões entre elas. Type aliases podem nomear também [unions](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#union-types), tuplas, primitivas e transformações de tipos.

```ts
interface Identified {
  id: string
}

interface NamedProfile extends Identified {
  displayName: string
}

type Theme = 'claro' | 'escuro'
type Coordinates = readonly [number, number]
type ProfileSnapshot = Readonly<NamedProfile>
```

Declarações de uma mesma interface podem participar de declaration merging quando compatíveis. Um [type alias](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-aliases) não pode ser reaberto da mesma maneira. Use essa possibilidade conscientemente em APIs extensíveis, em vez de depender de fusões acidentais de nomes.

Para objetos comuns, ambos atendem a muitos dos mesmos casos. Consistência e intenção são mais úteis que uma regra de que um deles é sempre superior. A [documentação de tipos cotidianos](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html) apresenta essas diferenças.

## satisfies confere compatibilidade sem substituir o tipo pelo contrato

```ts
const preferencias = {
  tema: 'escuro',
  tamanho: 16,
} satisfies { tema: Theme; tamanho: number }
```

O operador verifica se o valor atende ao contrato e preserva o tipo inferido resultante da expressão e do contexto. Ele não é um cast para ignorar um erro, nem garante que todo literal será preservado em qualquer situação.

Se precisar de uma coleção vazia que receberá perfis, escreva `const perfis: Profile[] = []`. Uma entrada vazia pode não fornecer a informação pretendida para inferência; explicitá-la aqui melhora o contrato.

## Tipagem estrutural tem limites importantes

Valores podem ser compatíveis por sua estrutura, sem terem sido criados por uma classe específica. Verificações de propriedades extras em literais ajudam a encontrar erros, mas não transformam todos os objetos em registros exatos sem campos adicionais.

Ao receber JSON, mantenha a entrada como `unknown` e valide antes de usá-la. `as Profile` não verifica propriedades. Esse procedimento está no [guia de narrowing e type guards](./typescript-narrowing-type-guards.md).

## Continue estudando

- [Inferência — TypeScript](https://www.typescriptlang.org/docs/handbook/type-inference.html)
- [Unions e intersections](./typescript-unions-intersections.md)
- [Generics com inferência de argumentos](./typescript-generics.md)
