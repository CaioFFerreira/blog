---
title: 'Menos responsabilidades, mais clareza no código'
description: 'Refatore uma busca de artigos em passos pequenos, preservando o comportamento e explicitando os casos que precisam continuar funcionando.'
date: '2026-10-16'
category: 'Boas práticas'
tags:
  - TypeScript
  - Vue
  - Clean Code
---

Imagine tentar testar uma busca que só funciona quando existe um campo na tela. Ao separar a regra de filtragem da leitura desse campo, conseguimos entender e conferir cada parte com menos contexto. Para acompanhar o exemplo em TypeScript, basta reconhecer funções, objetos e o método `filter` de arrays; o foco é a organização da regra.

Uma [refatoração](https://refactoring.com/) melhora a organização sem mudar o comportamento esperado. Vamos praticar com um caso limitado: uma busca que filtra artigos pelo título ou pela categoria. O exemplo é didático; não substitui a implementação atual deste blog.

## Antes: leitura do input e decisão misturadas

Imagine um handler que lê um campo da tela e repete a preparação do termo em cada comparação:

```ts
interface Article {
  title: string
  category: string
}

function filterFromInput(articles: Article[], input: HTMLInputElement): Article[] {
  return articles.filter(article =>
    article.title.toLocaleLowerCase('pt-BR').includes(
      input.value.trim().toLocaleLowerCase('pt-BR'),
    ) || article.category.toLocaleLowerCase('pt-BR').includes(
      input.value.trim().toLocaleLowerCase('pt-BR'),
    ),
  )
}
```

A função precisa de um elemento [DOM](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model) para executar uma regra que depende apenas de texto. Além disso, a normalização do termo está espalhada pelas condições.

## Primeiro, registre o comportamento que deve permanecer

Antes de alterar, estabeleça os casos:

- Espaços nas pontas da busca são ignorados.
- Maiúsculas e minúsculas não diferenciam os resultados.
- Título ou categoria podem produzir uma correspondência.
- Busca vazia retorna todos os artigos, na ordem original.
- Acentos continuam significativos: `acao` não encontra `ação` neste contrato.

Esse último ponto evita acrescentar uma mudança de produto por acidente. Tornar a busca insensível a acentos pode ser útil, mas precisa ser uma decisão separada da refatoração.

## Depois: a busca recebe apenas os dados necessários

Mantenha o tipo `Article` e extraia a preparação do texto e a regra:

```ts
function normalizeSearch(value: string): string {
  return value.toLocaleLowerCase('pt-BR')
}

function filterArticles(articles: Article[], search: string): Article[] {
  const term = normalizeSearch(search.trim())

  return articles.filter(article =>
    normalizeSearch(article.title).includes(term)
    || normalizeSearch(article.category).includes(term),
  )
}
```

A camada de interface agora chama `filterArticles(articles, input.value)`. A regra não precisa conhecer um input, Vue ou uma API, e o termo é preparado uma vez por busca.

Não acrescentamos cache, store ou uma hierarquia de estratégias. Para esse problema, duas funções e um contrato pequeno são suficientes. A motivação é legibilidade e isolamento; qualquer ganho de performance precisa ser medido.

## Confira antes e depois com os mesmos casos

Depois das declarações anteriores:

```ts
const articles: Article[] = [
  { title: 'Ação no navegador', category: 'JavaScript' },
  { title: 'Contratos de API', category: 'System Design' },
]

console.log(filterArticles(articles, ' JAVASCRIPT ').length)
console.log(filterArticles(articles, 'api').length)
console.log(filterArticles(articles, '').length)
console.log(filterArticles(articles, 'acao').length)
```

As saídas são `1`, `1`, `2` e `0`. Verifique também que a lista de entrada não muda e que o filtro preserva a ordem dos itens encontrados. Em uma base com testes, esses casos podem proteger futuras alterações.

## Quando extrair mais alguma coisa?

Se surgir busca pelo conteúdo completo, outro idioma ou uma regra de categoria diferente, revise o contrato com exemplos reais. Para decisões maiores, siga os guias de [separação de responsabilidades e SOLID](./arquitetura-dependency-inversion-solid.md) e de [composição de componentes](./arquitetura-design-system-composicao.md).
