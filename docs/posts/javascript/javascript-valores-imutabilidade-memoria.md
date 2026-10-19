---
title: 'Valores, referências e memória: o que muda quando você altera um objeto?'
description: 'Conecte cópia de valores, identidade de objetos, imutabilidade e garbage collection para evitar mudanças inesperadas e retenção de memória.'
date: '2026-10-16'
category: 'JavaScript'
tags:
  - Referências × valores
  - Imutabilidade
  - Garbage collection
---

Você copia um objeto, altera a cópia e o original muda junto. Para entender isso, precisamos distinguir o valor guardado por uma variável da identidade do objeto ao qual ela dá acesso.

Imagine duas variáveis que permitem acessar o mesmo cadastro. Alterar o nome por uma delas pode aparecer na outra porque ambas se referem ao mesmo objeto. Uma **referência** permite alcançar esse objeto; uma cópia pode criar outro objeto ou reaproveitar partes dele. Vamos observar essas diferenças antes de discutir memória e imutabilidade.

## Primitivos e objetos

Primitivos incluem strings, números, booleanos, `undefined`, `null`, `bigint` e símbolos. São valores imutáveis. Objetos, arrays e funções têm identidade e podem ser compartilhados.

```js
let quantidade = 2
let outraQuantidade = quantidade
outraQuantidade = 5

console.log(quantidade)

const usuario = { nome: 'Caio' }
const outroUsuario = usuario
outroUsuario.nome = 'Ana'

console.log(usuario.nome)
console.log(usuario === outroUsuario)
```

As saídas são `2`, `Ana` e `true`. No primeiro caso, reatribuir `outraQuantidade` não modifica `quantidade`. No segundo, as duas variáveis dão acesso ao mesmo objeto.

## JavaScript passa argumentos por valor

A expressão “objeto é passado por referência” costuma causar confusão. Ao passar um objeto, o valor passado permite acessar a mesma identidade; reatribuir o parâmetro não reatribui a variável de quem chamou.

```js
function atualizar(usuario) {
  usuario.nome = 'Ana'
  usuario = { nome: 'Bia' }
  return usuario
}

const original = { nome: 'Caio' }
const resultado = atualizar(original)

console.log(original.nome)
console.log(resultado.nome)
```

As saídas são `Ana` e `Bia`. A mutação afeta o objeto compartilhado. A reatribuição muda apenas o parâmetro local; o objeto novo chega ao chamador pelo `return`.

## const protege o vínculo, não o objeto

```js
const preferencias = { tema: 'escuro' }
preferencias.tema = 'claro'
```

Isso é válido. O que não pode é fazer `preferencias = outroObjeto`. Por isso, `const` e imutabilidade de dados são conceitos diferentes.

## Spread faz uma cópia rasa

```js
const original = {
  nome: 'Caio',
  endereco: { cidade: 'Recife' },
}

const copia = { ...original }
copia.endereco.cidade = 'Natal'

console.log(original.endereco.cidade)
```

A saída é `Natal`. O objeto externo é novo, mas `endereco` continua compartilhado. Para atualizar sem modificar a estrutura anterior, copie cada nível do caminho alterado:

```js
const usuario = {
  nome: 'Caio',
  endereco: { cidade: 'Recife' },
}

const atualizado = {
  ...usuario,
  endereco: {
    ...usuario.endereco,
    cidade: 'Natal',
  },
}

console.log(usuario.endereco.cidade)
console.log(atualizado.endereco.cidade)
```

Agora as saídas são `Recife` e `Natal`. Partes que não mudaram podem continuar compartilhadas. Essa abordagem ajuda a comparar estados anteriores e novos por identidade, desde que todos respeitem a convenção de não mutá-los.

## E arrays?

`push`, `splice`, `sort` e `reverse` alteram o próprio array. Você pode usar `map`, `filter`, [spread](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax) ou métodos como `toSorted` para produzir outro array.

```js
const produtos = [{ id: 1, preco: 10 }, { id: 2, preco: 20 }]

const atualizados = produtos.map(produto =>
  produto.id === 2 ? { ...produto, preco: 25 } : produto,
)

console.log(produtos[1].preco)
console.log(atualizados[1].preco)
```

As saídas são `20` e `25`. O primeiro produto foi compartilhado; o segundo foi substituído por um objeto novo. Criar um array novo não clona automaticamente seus itens.

## Object.freeze e structuredClone

[`Object.freeze`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze) impede alterações nas propriedades próprias imediatas do objeto, mas é raso: objetos internos não são congelados automaticamente. Em modo estrito, tentar alterar uma propriedade congelada pode lançar `TypeError`.

[`structuredClone`](https://developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone) cria uma cópia profunda dos valores suportados, como objetos comuns, arrays, `Map` e `Date`. Não é um clonador universal: funções e nós [DOM](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model) não são clonáveis, e protótipos de classes personalizadas não são preservados como em uma instância original.

Também evite tratar `JSON.parse(JSON.stringify(valor))` como uma solução genérica: essa transformação perde tipos e informações, falha com ciclos e não aceita `bigint` diretamente.

## Deep copy na prática: quando o objeto interno precisa ser independente

```js
const original = {
  nome: 'Caio',
  endereco: { cidade: 'Recife' },
}

const copia = structuredClone(original)
copia.endereco.cidade = 'Natal'

console.log(original.endereco.cidade)
console.log(copia.endereco.cidade)
console.log(original.endereco === copia.endereco)
```

As saídas são `Recife`, `Natal` e `false`. Diferentemente do spread raso, o endereço também foi copiado e pode ser alterado de forma independente.

Isso pode ser útil para um rascunho de edição isolado. Já em uma atualização pequena de estado, copiar apenas os níveis alterados costuma preservar melhor o compartilhamento e evitar trabalho desnecessário. Deep copy não é automaticamente superior: escolha conforme a independência que o caso exige e os tipos de dados envolvidos.

## Garbage collection: o que pode ser liberado?

JavaScript gerencia memória automaticamente. Um modelo útil é a **alcançabilidade**: enquanto um objeto puder ser alcançado a partir de referências vivas, ele pode continuar necessário.

```js
let usuario = { nome: 'Caio' }
const usuariosAtivos = [usuario]

usuario = null
console.log(usuariosAtivos[0].nome)
```

O objeto continua acessível pelo array. Definir uma variável como `null` não destrói o objeto nem força a coleta. Quando o objeto deixa de ser alcançável, ele pode ser coletado; o momento exato depende do motor.

Ciclos isolados também podem ser coletados por coletores modernos. O problema não é simplesmente dois objetos apontarem um para o outro, mas continuarem alcançáveis quando já não são necessários.

## Da alcançabilidade ao diagnóstico

[Garbage collection](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Memory_management) não substitui a decisão de quando encerrar uma atividade. Para aplicar esse conceito a uma tela que abre e fecha, siga o [caso de memory leak com listener, limpeza e heap snapshots](./performance-memory-leaks.md). Esse guia concentra a implementação e o procedimento de diagnóstico; aqui, a base é entender por que uma referência ainda mantém um objeto vivo.

## Erros comuns

- Confundir cópia rasa com cópia profunda.
- Alterar objetos recebidos de outras partes da aplicação sem um contrato claro.
- Esperar que `const` ou tipos `readonly` do TypeScript congelem objetos durante a execução.
- Manter listas, caches ou listeners globais crescendo indefinidamente.
- Depender da coleta de lixo para executar uma limpeza em um momento específico.

## Continue estudando

- [Gerenciamento de memória — MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Memory_management)
- [Object.freeze — MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze)
- Veja também: [closures e retenção de contexto](./javascript-escopo-hoisting-closures.md).
