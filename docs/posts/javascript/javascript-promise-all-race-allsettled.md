---
title: 'Promise.all, race e allSettled: como combinar operações assíncronas'
description: 'Escolha entre depender de todos os resultados, aceitar falhas parciais ou usar a primeira operação a terminar, com exemplos executáveis.'
date: '2026-10-16'
category: 'JavaScript'
tags:
  - Promises
  - Promise.all
  - Promise.race
  - Promise.allSettled
---

Uma tela pode precisar de perfil, notificações e relatórios. Essas operações podem começar juntas, mas o que deve acontecer quando uma falha? A escolha do combinador depende dessa regra.

Se [Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) ainda são novidade, comece pelo [guia de execução assíncrona](./javascript-event-loop-promises-async-await.md).

Imagine carregar dados de perfil e pedidos ao mesmo tempo. Uma **Promise** representa o resultado futuro de cada operação. As funções deste guia definem como acompanhar várias delas: esperar todas, reagir à primeira conclusão ou reunir sucessos e falhas. Se essa representação ainda for nova, comece por [Promises e execução assíncrona](./javascript-event-loop-promises-async-await.md).

## Prepare uma simulação sem depender de uma API

Execute cada exemplo deste artigo separadamente, depois de definir esta função:

```js
function simularOperacao(nome, atraso, falhar = false) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (falhar) {
        reject(new Error(`Falha em ${nome}`))
        return
      }

      resolve(`${nome} disponível`)
    }, atraso)
  })
}
```

A chamada cria uma Promise e agenda um timer. O atraso serve apenas para simular operações com durações diferentes; não representa uma requisição real nem uma garantia de tempo exato.

## Promise.all: todos os resultados são necessários

```js
async function carregarPagina() {
  try {
    const resultados = await Promise.all([
      simularOperacao('perfil', 30),
      simularOperacao('permissões', 10),
    ])

    console.log(resultados)
  } catch (erro) {
    console.error(erro.message)
  }
}

carregarPagina()
```

A saída é `['perfil disponível', 'permissões disponível']`. A ordem dos valores acompanha a ordem de entrada, mesmo que permissões termine antes.

**A Promise resultante só é cumprida se todas forem cumpridas.** Se uma rejeitar, ela rejeita assim que essa rejeição for processada; não espera as demais terminarem para comunicar a falha. Isso torna mais precisa a frase “espera todas”: ela descreve o caminho de sucesso, não o de erro.

Use quando o resultado conjunto só faz sentido com todos os dados. A rejeição não cancela as outras operações nem desfaz efeitos que já aconteceram.

## Promise.allSettled: cada resultado pode ser tratado separadamente

```js
async function carregarDashboard() {
  const resultados = await Promise.allSettled([
    simularOperacao('usuários', 10),
    simularOperacao('notificações', 20, true),
    simularOperacao('relatórios', 15),
  ])

  for (const resultado of resultados) {
    if (resultado.status === 'fulfilled') {
      console.log(resultado.value)
    } else {
      console.log(resultado.reason.message)
    }
  }
}

carregarDashboard()
```

Após todas terminarem, a saída segue a ordem de entrada: usuários disponível, falha em notificações, relatórios disponível.

Cada item descreve sucesso com `status` e `value`, ou falha com `status` e `reason`. Uma rejeição individual não rejeita o conjunto. Isso permite exibir os blocos que funcionaram e um estado de erro apenas onde necessário.

Se alguma operação nunca terminar, o conjunto também continuará pendente. Além disso, ao aguardar `allSettled`, você espera o grupo inteiro: para atualizar cada bloco assim que ficar pronto, trate também as operações individualmente.

## Promise.race: a primeira conclusão decide

```js
async function disputarResultado() {
  try {
    const resultado = await Promise.race([
      simularOperacao('servidor principal', 30),
      simularOperacao('servidor alternativo', 10, true),
    ])

    console.log(resultado)
  } catch (erro) {
    console.log(erro.message)
  }
}

disputarResultado()
```

A saída é `Falha em servidor alternativo`. `race` considera a primeira conclusão, **seja sucesso ou rejeição**. Não espera pelo primeiro sucesso. Se essa for a regra desejada, conheça `Promise.any`, que só rejeita quando todas as entradas rejeitam.

Uma disputa entre operação e timer pode limitar o tempo de espera do consumidor, mas não cancela o trabalho que perdeu. Para uma requisição `fetch`, um [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) pode sinalizar o cancelamento da própria requisição.

## Concorrência não começa dentro do combinador

No exemplo de `all`, as chamadas a `simularOperacao` acontecem ao montar o array. O combinador recebe os resultados dessas chamadas.

```js
const resultados = await Promise.all([
  Promise.resolve('primeiro'),
  Promise.resolve('segundo'),
])

console.log(resultados)
```

Este trecho usa `await` no topo de um módulo ES ou em um console que o suporte. Passar funções, como `[buscarPerfil, buscarPermissoes]`, não faz `all` chamá-las. Você precisa invocá-las.

Evite iniciar milhares de requisições com `Promise.all(lista.map(buscar))` sem avaliar limites. Os combinadores não fornecem controle de concorrência por conta própria.

## Como decidir?

| Necessidade | Escolha |
| --- | --- |
| Só continuar com todos os valores | `Promise.all` |
| Receber sucesso ou erro de cada operação | `Promise.allSettled` |
| Usar a primeira conclusão, inclusive falha | `Promise.race` |
| Usar o primeiro sucesso | `Promise.any` |

Para as três primeiras funções, um detalhe de borda: `all([])` e `allSettled([])` produzem uma Promise cumprida com array vazio; `race([])` permanece pendente. As funções que recebem os resultados continuam sendo executadas de forma assíncrona.

## Erros comuns

- Dizer que `all` sempre espera todas terminarem, inclusive após uma falha.
- Usar `race` esperando ignorar rejeições rápidas.
- Confundir falha do conjunto com cancelamento das operações restantes.
- Esquecer que `fetch` precisa de verificação de `response.ok` para tratar [HTTP](https://www.rfc-editor.org/rfc/rfc9110.html) 404 ou 500 como erro da aplicação.

## Continue estudando

- [Promise.all — MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all)
- [Promise.allSettled — MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled)
- [Promise.race — MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/race)
