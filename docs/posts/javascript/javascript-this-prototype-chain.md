---
title: 'this e prototype chain: chamada e busca de propriedades'
description: 'Diferencie o contexto de uma chamada da herança entre objetos, com exemplos de métodos, bind, arrow functions e classes.'
date: '2026-10-16'
category: 'JavaScript'
tags:
  - this
  - Prototype chain
  - Objetos
---

[`this`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this) e a cadeia de protótipos aparecem juntos no trabalho com objetos, mas respondem a perguntas diferentes: **qual é o contexto desta chamada?** E **onde JavaScript encontra uma propriedade?**

`this` é uma palavra do JavaScript usada para acessar o contexto de certas chamadas de função. Um **protótipo** é um objeto consultado quando uma propriedade não é encontrada diretamente no objeto atual. Esses mecanismos se encontram em métodos, mas respondem a perguntas diferentes: “qual é o contexto da chamada?” e “onde procurar esta propriedade?”.

## this em uma função comum depende da chamada

```js
const pessoa = {
  nome: 'Caio',
  apresentar() {
    return `Olá, sou ${this.nome}`
  },
}

console.log(pessoa.apresentar())
```

Em `pessoa.apresentar()`, a chamada usa `pessoa` como receptor. Por isso, `this.nome` acessa o nome desse objeto.

Agora extraia o método:

```js
'use strict'

const pessoa = {
  nome: 'Caio',
  apresentar() {
    return this.nome
  },
}

const apresentar = pessoa.apresentar
apresentar()
```

Essa chamada lança `TypeError`: em modo estrito, uma chamada simples tem `this` igual a `undefined`. O método não fica automaticamente preso ao objeto no qual foi definido. [Módulos ES](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) já executam em modo estrito.

## call, apply e bind

Você pode fornecer explicitamente o contexto de uma função comum:

```js
function saudar(saudacao) {
  return `${saudacao}, ${this.nome}`
}

const pessoa = { nome: 'Caio' }

console.log(saudar.call(pessoa, 'Olá'))
console.log(saudar.apply(pessoa, ['Bom dia']))

const saudarCaio = saudar.bind(pessoa)
console.log(saudarCaio('Oi'))
```

`call` chama com argumentos separados; `apply` recebe uma lista de argumentos; [`bind`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind) cria uma nova função com contexto vinculado para chamadas normais futuras.

## Arrow functions capturam o this externo

Uma arrow function não cria seu próprio `this`. Ela usa o contexto léxico do lugar onde foi criada.

```js
const pessoa = {
  nome: 'Caio',
  criarApresentacao() {
    return () => `Olá, sou ${this.nome}`
  },
}

const apresentar = pessoa.criarApresentacao()
console.log(apresentar())
```

Ao chamar `criarApresentacao` como método, seu `this` é `pessoa`. A arrow retornada mantém esse acesso mesmo quando é chamada separadamente.

Já escrever `apresentar: () => this.nome` diretamente em um objeto literal não captura o objeto como `this`: o literal não cria um novo contexto de `this`. `call`, `apply` e `bind` também não substituem o `this` léxico de uma arrow.

## Prototype chain: procurar uma propriedade que não está no objeto

```js
const comportamento = {
  apresentar() {
    return `Olá, sou ${this.nome}`
  },
}

const pessoa = Object.create(comportamento)
pessoa.nome = 'Caio'

console.log(Object.hasOwn(pessoa, 'apresentar'))
console.log(pessoa.apresentar())
```

A primeira saída é `false`: o método não é uma propriedade própria de `pessoa`. A segunda é `Olá, sou Caio`.

Ao acessar `pessoa.apresentar`, JavaScript procura primeiro em `pessoa`, depois em seu protótipo, e continua pela cadeia até encontrar a propriedade ou chegar a `null`.

Mesmo encontrado no protótipo, o método é chamado com `pessoa` como receptor. Assim, **o lugar onde o método foi encontrado não determina sozinho o `this` da chamada**.

## Sombreamento de propriedades

```js
const padrao = { tema: 'escuro' }
const preferencias = Object.create(padrao)

preferencias.tema = 'claro'
console.log(preferencias.tema)
console.log(padrao.tema)
```

Para essa propriedade comum de dados, a atribuição cria uma propriedade própria em `preferencias`. Ela esconde a propriedade herdada sem mudar `padrao.tema`. As saídas são `claro` e `escuro`.

## Classes também usam protótipos

```js
class Pessoa {
  constructor(nome) {
    this.nome = nome
  }

  apresentar() {
    return this.nome
  }
}

const pessoa = new Pessoa('Caio')

console.log(Object.getPrototypeOf(pessoa) === Pessoa.prototype)
console.log(Object.hasOwn(pessoa, 'nome'))
console.log(Object.hasOwn(pessoa, 'apresentar'))
```

As saídas são `true`, `true`, `false`. `nome` é criado na instância; o método é compartilhado via `Pessoa.prototype`. A sintaxe de classes organiza esse modelo e acrescenta regras próprias, como a execução estrita dos métodos.

Não confunda `Pessoa.prototype`, uma propriedade da função construtora, com o protótipo interno de qualquer objeto. Para inspecionar este último, prefira `Object.getPrototypeOf`.

## Arrow ou função comum: o que muda além de this?

Uma função comum pode ter seu próprio `arguments`. Arrow functions não criam esse objeto; para receber vários argumentos com clareza, use parâmetros [rest](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/rest_parameters).

```js
function contarArgumentos() {
  return arguments.length
}

const contarComRest = (...valores) => valores.length

console.log(contarArgumentos('DOM', 'Promises'))
console.log(contarComRest('DOM', 'Promises'))
```

As duas saídas são `2`. A diferença é o mecanismo usado, não o resultado dessa operação.

Outra distinção: arrows não podem ser chamadas com `new` e não têm uma propriedade própria `prototype` para construção de instâncias. Funções comuns declaradas com `function` podem atuar como construtoras; métodos, funções `async` e generators têm outras restrições, então nem toda função que não é arrow é construtora.

Escolha pelo comportamento: arrows são úteis em callbacks que devem preservar o `this` externo; métodos com sintaxe comum recebem o contexto conforme a chamada. A forma mais curta não é automaticamente a mais adequada.

## Erros comuns

- Passar um método diretamente como callback e perder seu contexto. Use `bind` ou uma função que faça a chamada correta.
- Usar arrow em um método que precisa receber `this` conforme o objeto chamador.
- Alterar `Object.prototype` para adicionar utilitários, afetando objetos de toda a aplicação.
- Confundir a cadeia de escopos, que resolve nomes de variáveis, com a cadeia de protótipos, que resolve propriedades.

## Continue estudando

- [this — MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this)
- [Herança e cadeia de protótipos — MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Inheritance_and_the_prototype_chain)
- Veja também: [escopo e closures](./javascript-escopo-hoisting-closures.md).
