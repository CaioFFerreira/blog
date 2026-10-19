---
title: 'JavaScript moderno: destructuring, spread, rest e acessos opcionais'
description: 'Leia e transforme objetos e arrays com clareza, distinguindo extrair, espalhar e reunir valores sem esconder regras importantes.'
date: '2026-10-16'
category: 'JavaScript'
tags:
  - ES6+
  - Destructuring
  - Spread
  - Rest
  - Optional chaining
---

“ES6+” é uma forma informal de agrupar recursos introduzidos no ES2015 e em versões posteriores. Isso inclui `let`, `const`, arrow functions e módulos, mas também recursos mais recentes como [optional chaining](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining).

O objetivo dessas ferramentas é tornar a intenção legível. Vamos trabalhar com os recursos de transformação e acesso a dados; funções e módulos já têm artigos próprios.

**ES6**, também chamado ECMAScript 2015, é uma edição da linguagem que introduziu parte dessas sintaxes. **Destructuring** extrai valores de objetos e arrays; **spread** espalha valores; **rest** reúne os valores restantes. Os três ajudam a escrever operações comuns com menos repetição, mas é importante entender o que cada trecho faz antes de encurtá-lo.

## Destructuring: extrair com nomes claros

```js
const usuario = { id: 42, nome: 'Caio', perfil: 'editor' }
const { id, nome: nomeExibido, idioma = 'pt-BR' } = usuario

console.log(id)
console.log(nomeExibido)
console.log(idioma)
```

As saídas são `42`, `Caio` e `pt-BR`. `nome: nomeExibido` renomeia o vínculo local; não altera a propriedade original.

Um valor padrão é aplicado quando a propriedade vale `undefined` ou não existe. Ele não substitui `null`, `false`, zero ou string vazia.

```js
const { nome = 'Visitante' } = { nome: null }
console.log(nome)
```

A saída é `null`. Se `null` também representa ausência no seu domínio, use uma regra explícita, como `??`.

[Destructuring](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring) não clona objetos internos. Extrair `endereco` de um usuário mantém acesso ao mesmo objeto de endereço.

## Arrays: a posição determina o vínculo

```js
const linguagens = ['JavaScript', 'TypeScript', 'Python']
const [primeira, , terceira] = linguagens

console.log(primeira)
console.log(terceira)
```

As saídas são `JavaScript` e `Python`. A posição vazia pula o segundo item. Use isso quando as posições tiverem significado claro; para registros de domínio com muitos campos, objetos nomeados costumam ser mais fáceis de ler.

## Rest: reunir o que sobrou

Em arrays, [rest](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/rest_parameters) reúne os elementos restantes em uma nova coleção:

```js
const usuarios = ['Caio', 'Ana', 'Bia']
const [primeiro, ...restantes] = usuarios

console.log(primeiro)
console.log(restantes)
```

As saídas são `Caio` e `['Ana', 'Bia']`. O elemento rest precisa ser o último no padrão. Ele cria um array com os elementos restantes, sem clonar profundamente os itens.

Em parâmetros, rest reúne argumentos:

```js
function somar(...valores) {
  return valores.reduce((total, valor) => total + valor, 0)
}

console.log(somar(10, 20, 5))
```

A saída é `35`. O contrato deste exemplo espera números; rest não converte nem valida os argumentos.

Em objetos, `const { senha, ...publico } = usuario` pode separar uma propriedade, mas não substitui uma política de exposição de dados: novos campos sensíveis poderiam acabar em `publico`. Para uma resposta pública, prefira escolher explicitamente os campos permitidos.

## Spread: espalhar valores em outra estrutura

```js
const padrao = { tema: 'escuro', tamanho: 14 }
const preferencias = { ...padrao, tema: 'claro' }
const assuntos = ['DOM', 'Promises']
const novosAssuntos = [...assuntos, 'Módulos']

console.log(preferencias)
console.log(novosAssuntos)
```

O tema final é `claro`: em propriedades com o mesmo nome, a última definição prevalece. O array novo contém [`DOM`](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model), [`Promises`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) e `Módulos`; o original não foi alterado.

Apesar da mesma escrita `...`, a direção muda: **rest reúne; [spread](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax) espalha**. Nos dois casos, objetos internos podem continuar compartilhados. Veja o [guia sobre cópias e referências](./javascript-valores-imutabilidade-memoria.md) antes de usar spread para alterar estruturas aninhadas.

## Optional chaining: acessar quando uma parte pode faltar

```js
const usuario = { nome: 'Caio', endereco: null }
const cidade = usuario.endereco?.cidade

console.log(cidade)
```

A saída é `undefined`. `?.` interrompe esse acesso quando o valor à esquerda é `null` ou `undefined`.

Ele não ignora qualquer erro: uma variável não declarada ainda gera `ReferenceError`. Uma chamada `objeto.metodo?.()` também pode lançar `TypeError` se o valor existir e não for uma função.

Coloque a proteção onde a ausência é permitida pelo contrato. Aplicar `?.` em toda expressão pode esconder um dado obrigatório que deveria ter sido validado.

## Nullish coalescing: um padrão sem perder zero ou false

```js
const configuracao = { volume: 0, notificacoes: false }

console.log(configuracao.volume || 50)
console.log(configuracao.volume ?? 50)
console.log(configuracao.notificacoes ?? true)
```

As saídas são `50`, `0` e `false`. `||` usa o valor alternativo para qualquer valor falsy; `??` só o usa para `null` ou `undefined`.

Você pode combinar os recursos: `usuario.endereco?.cidade ?? 'Não informada'` dá um padrão quando o endereço ou a cidade não estiverem disponíveis.

## Parâmetros com opções

```js
function criarResumo({ titulo, limite = 80 } = {}) {
  const texto = titulo ?? 'Sem título'
  return texto.slice(0, limite)
}

console.log(criarResumo({ titulo: 'Estudando JavaScript', limite: 9 }))
console.log(criarResumo())
```

As saídas são `Estudando` e `Sem título`. O `= {}` protege a chamada sem argumento ou com `undefined`; ele não protege `criarResumo(null)`. Este exemplo espera um título string quando informado e um limite numérico válido.

## Como esses recursos se conectam?

- Use `const` por padrão e `let` quando precisar reatribuir; veja [escopo e hoisting](./javascript-escopo-hoisting-closures.md).
- Escolha arrow ou função comum conforme o contexto de chamada; veja [this e protótipos](./javascript-this-prototype-chain.md).
- Separe responsabilidades com [módulos ES](./javascript-modulos-es.md).
- Organize sequências assíncronas com [async/await](./javascript-event-loop-promises-async-await.md).

## Continue estudando

- [Destructuring — MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring)
- [Spread — MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax)
- [Optional chaining — MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining)
- [Nullish coalescing — MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing)
