---
title: 'JavaScript assíncrono: da Call Stack ao async/await'
description: 'Entenda a ordem de execução conectando Event Loop, Web APIs, microtasks, tasks e Promises em exemplos passo a passo.'
date: '2026-10-16'
category: 'JavaScript'
tags:
  - Event Loop
  - Call Stack
  - Microtasks
  - Promises
  - async/await
  - Web APIs
---

Você agenda um timer com zero milissegundos, resolve uma [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) e imprime uma mensagem. Qual aparece primeiro? A resposta depende de **onde cada trabalho é executado e quando ele pode continuar**.

Vamos considerar o [Event Loop do navegador](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model). Node.js possui [fases e mecanismos próprios](https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick); não aplique todos os detalhes do navegador a ele.

**Síncrono** é o trabalho executado na sequência atual; **assíncrono** permite lidar com uma conclusão posterior, como a resposta de uma busca. Uma **Promise** representa o resultado futuro de uma operação, e um **callback** é uma função passada para ser chamada por outra parte do código. Vamos acompanhar a ordem das mensagens para entender o mecanismo.

## 1. Call Stack: o que está executando agora

A [pilha de chamadas (Call Stack)](https://developer.mozilla.org/en-US/docs/Glossary/Call_stack) registra as funções em execução. Uma chamada entra no topo; quando termina, sai. Por isso, a última função a entrar é a primeira a sair.

```js
function mostrarMensagem() {
  console.log('Olá!')
}

function iniciar() {
  mostrarMensagem()
}

iniciar()
```

`iniciar` entra na pilha e chama `mostrarMensagem`. Esta chama `console.log`. As chamadas terminam na ordem inversa, até a execução desse trecho acabar.

No fluxo principal de execução, um trecho longo de código síncrono impede que outros callbacks desse thread executem. Também pode atrasar a resposta a cliques e a atualização visual da página.

## 2. Web APIs: o navegador participa do trabalho

JavaScript é a linguagem. O navegador oferece APIs como [DOM](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model), eventos, timers, `fetch`, armazenamento e [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API).

Essas APIs não são todas assíncronas: `document.querySelector`, por exemplo, retorna de forma síncrona. Já `fetch` inicia uma operação de rede e devolve uma Promise.

```js
console.log('Antes')
setTimeout(() => console.log('Timer'), 0)
console.log('Depois')
```

O resultado é `Antes`, `Depois`, `Timer`. O timer não interrompe a execução atual. Seu atraso indica um tempo mínimo de espera para que o callback possa ser agendado, e não uma garantia de execução naquele instante.

## 3. Event Loop: como o trabalho ganha sua vez

O navegador coordena tarefas, checkpoints de [microtasks](https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide) e oportunidades de renderização. Para os exemplos deste artigo, pense nesta sequência:

1. O trecho síncrono atual termina.
2. No checkpoint, as microtasks pendentes são processadas, incluindo outras microtasks criadas por elas.
3. O navegador pode atualizar a renderização quando houver uma oportunidade.
4. Outra tarefa pode começar.

Essa sequência é uma simplificação didática. Existem diferentes fontes e filas de tarefas; não há uma única fila universal que determine a ordem de todos os eventos possíveis.

## 4. Microtasks × macrotasks

**Task** é o termo usado pela plataforma web; “macrotask” é um nome comum em explicações. Callbacks de timers são executados como tasks. Reações de Promises, como `.then`, e callbacks de `queueMicrotask` entram na fila de microtasks.

```js
console.log('1: início')

setTimeout(() => console.log('5: timer'), 0)

Promise.resolve().then(() => {
  console.log('3: Promise')
})

queueMicrotask(() => console.log('4: microtask'))

console.log('2: fim')
```

Execute no navegador. A saída segue os números:

- `1` e `2` pertencem ao trabalho síncrono.
- `3` e `4` são microtasks, enfileiradas nessa ordem.
- `5` vem depois, quando a tarefa do timer puder executar.

Criar microtasks sem parar pode impedir o navegador de avançar para outras tarefas e para a renderização. `queueMicrotask` não é uma solução para trabalho pesado.

## 5. Promises: representar um resultado futuro

Uma Promise pode estar pendente, cumprida com um valor ou rejeitada com um motivo. Depois de cumprida ou rejeitada, seu estado não muda.

Um detalhe importante: **o executor passado a `new Promise` executa imediatamente**. As funções registradas com `.then` executam depois, como microtasks.

```js
console.log('A')

const resultado = new Promise(resolve => {
  console.log('B')
  resolve('D')
})

resultado.then(valor => console.log(valor))
console.log('C')
```

A saída é `A`, `B`, `C`, `D`. Criar uma Promise não transfere automaticamente código síncrono para outro thread.

Cada `.then` devolve uma nova Promise. Retornar um valor alimenta o próximo passo; lançar um erro rejeita a Promise resultante. Retorne as operações assíncronas da cadeia para que erros e conclusão sejam acompanhados corretamente.

## 6. async/await: outra forma de escrever a sequência

Uma função `async` sempre retorna uma Promise. `await` suspende a continuação daquela função até que o valor aguardado esteja disponível; ele não bloqueia o thread inteiro. Mesmo ao aguardar uma Promise já cumprida, a continuação acontece de forma assíncrona.

```js
async function demonstrar() {
  console.log('Dentro: antes')
  await Promise.resolve()
  console.log('Dentro: depois')
}

demonstrar()
console.log('Fora')
```

A saída é `Dentro: antes`, `Fora`, `Dentro: depois`. A chamada começa de forma síncrona, encontra o `await` e permite que o código externo continue.

## 7. Um exemplo real com fetch e tratamento de erro

```js
async function buscarUsuario(id, signal) {
  const resposta = await fetch(`/api/usuarios/${encodeURIComponent(id)}`, {
    signal,
  })

  if (!resposta.ok) {
    throw new Error(`Não foi possível buscar o usuário: HTTP ${resposta.status}`)
  }

  return resposta.json()
}

async function carregarPerfil() {
  try {
    const usuario = await buscarUsuario('42')
    console.log(usuario)
  } catch (erro) {
    console.error('Falha ao carregar o perfil:', erro)
  }
}
```

O exemplo pressupõe uma API em `/api/usuarios/42`; este blog estático não fornece esse endpoint. `fetch` não rejeita automaticamente em respostas [HTTP](https://www.rfc-editor.org/rfc/rfc9110.html) como 404 ou 500, por isso verificamos `ok`. A leitura do corpo com `.json()` também é assíncrona e pode falhar.

O parâmetro `signal` permite integrar [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) quando for necessário cancelar a operação.

## 8. Sequencial ou concorrente?

Se uma operação depende do resultado de outra, a espera é sequencial. Operações independentes podem começar antes da espera conjunta. A escolha muda tanto o tempo de conclusão quanto a política de falha.

O próximo passo é o [guia de combinadores de Promises](./javascript-promise-all-race-allsettled.md), que concentra os exemplos e as diferenças entre `all`, `race` e `allSettled`.

## Erros comuns

- Achar que `setTimeout(..., 0)` executa imediatamente.
- Confundir uma operação assíncrona com execução de JavaScript em paralelo.
- Usar `forEach(async () => ...)` esperando que o `forEach` aguarde as Promises. Use `for...of` com `await` para sequência ou `Promise.all` com `map` para aguardar operações concorrentes. Essa combinação não limita quantas operações começam: para listas grandes, controle a concorrência separadamente.
- Esquecer de tratar rejeições no ponto que inicia uma operação.
- Colocar um cálculo pesado em uma função `async` e esperar que ele deixe de bloquear o thread. Para processamento independente, Web Workers podem ser apropriados.

## Continue estudando

- [Microtasks e ambiente de execução — MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide/In_depth)
- [Usando Promises — MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises)
- [Web APIs — MDN](https://developer.mozilla.org/en-US/docs/Web/API)
- Próximo: [escopo, hoisting e closures](./javascript-escopo-hoisting-closures.md).
