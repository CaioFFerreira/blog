---
title: 'Long tasks: dividir trabalho para manter a interface responsiva'
description: 'Identifique bloqueios no thread principal, entenda por que async não resolve CPU e experimente pausas cooperativas entre lotes.'
date: '2026-10-16'
category: 'Performance'
tags:
  - Long tasks
  - INP
  - Main thread
  - Web Workers
---

O **fluxo principal de execução**, chamado *main thread*, executa grande parte do JavaScript da página e participa da atualização visual. Se ele fica ocupado com um cálculo demorado, o clique espera sua vez. Uma **long task** é uma tarefa longa nesse fluxo. Vamos reduzir ou dividir o trabalho e conferir se o navegador consegue responder entre as partes.

Uma tarefa longa no fluxo principal de execução pode atrasar teclado, clique e desenho da interface. Mesmo que o código “termine rápido” no computador do desenvolvimento, o custo pode ser maior em um celular modesto.

## O que significa long task?

O limite convencional da plataforma para uma [long task](https://web.dev/articles/optimize-long-tasks) é **mais de 50 ms**. Isso ajuda a identificar bloqueios, mas não define o orçamento de um frame. A 60 Hz, há cerca de 16,7 ms entre frames, e o navegador precisa acomodar mais do que seu JavaScript nesse intervalo.

Uma tarefa de 40 ms também pode causar engasgos. Use 50 ms como sinal de investigação, não como meta para todas as funções. O [guia de long tasks](https://web.dev/articles/optimize-long-tasks) explica o bloqueio e estratégias de divisão.

## A pausa precisa permitir que o navegador avance

O [guia de Event Loop e async/await](./javascript-event-loop-promises-async-await.md) explica por que uma função `async` não transfere cálculo para outro thread. Aqui, a consequência prática é escolher uma pausa que permita avançar além das microtasks: repetir `await Promise.resolve()` em um loop não garante uma oportunidade de desenho.

## Primeiro, reduza o trabalho necessário

Antes de distribuir um cálculo, verifique se ele pode ser removido, reduzido ou executado menos vezes. Filtrar 100 mil registros a cada atualização sem relação com a busca é um problema diferente de processar uma importação uma única vez.

Procure também [DOM](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model) excessivo, conversões repetidas e listeners acionando o mesmo trabalho. Dividir desperdício continua sendo desperdício.

## Um processamento em lotes com pausas

Este exemplo roda no navegador e usa `scheduler.yield()` quando disponível, com fallback por timer. Ele soma números apenas para demonstrar a coordenação, não para substituir o `reduce` em listas pequenas.

```js
async function cederAoNavegador() {
  if (globalThis.scheduler
    && typeof globalThis.scheduler.yield === 'function') {
    await globalThis.scheduler.yield()
    return
  }

  await new Promise(resolve => setTimeout(resolve, 0))
}

async function somarEmLotes(valores, tamanhoLote = 1000) {
  if (!Number.isInteger(tamanhoLote) || tamanhoLote < 1) {
    throw new Error('O tamanho do lote deve ser um inteiro positivo.')
  }

  let total = 0

  for (let inicio = 0; inicio < valores.length; inicio += tamanhoLote) {
    const fim = Math.min(inicio + tamanhoLote, valores.length)

    for (let indice = inicio; indice < fim; indice += 1) {
      total += valores[indice]
    }

    if (fim < valores.length) await cederAoNavegador()
  }

  return total
}

somarEmLotes([10, 20, 30, 40], 2).then(console.log)
```

A saída é `100`. Cada pausa oferece ao navegador a possibilidade de executar outro trabalho. Não garante um frame em cada intervalo nem reduz automaticamente o tempo total.

O tamanho ideal do lote depende do custo por item e do dispositivo. Um único item muito caro ainda pode bloquear; nenhum tamanho fixo universal garante um orçamento em milissegundos.

## Cuide da consistência durante a pausa

Ao ceder o controle, outros eventos podem alterar os dados, iniciar outra operação ou fechar a tela. Um processamento real precisa definir se usa um snapshot, se pode ser cancelado e qual resultado ainda é válido ao concluir.

Copiar toda a entrada também tem custo. Escolha o contrato de concorrência conscientemente em vez de adicionar pausas a um loop que dependia de execução indivisível.

## Quando usar um Web Worker?

Um worker pode executar processamento independente fora do fluxo principal de execução, como parsing ou agregação pesada. Ele não acessa o DOM diretamente. Troca de mensagens, cópia estruturada, transferências e coordenação também têm custos.

Use-o quando há trabalho de CPU suficiente para compensar essa infraestrutura. Enviar milhares de mensagens pequenas e redesenhar a tela a cada uma pode recriar o gargalo no fluxo principal de execução.

## Validação prática

Grave a mesma interação antes e depois. Confira duração e quantidade das tarefas, espera até o feedback e tempo total de conclusão. Uma melhoria de responsividade pode vir com conclusão um pouco mais lenta; registre esse equilíbrio entre vantagens e custos.

Teste cancelamento, navegação durante o processamento e dispositivos mais lentos. Compare a experiência real, não apenas o cronômetro do loop.

## Continue estudando

- [scheduler.yield — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Scheduler/yield)
- [Usando Web Workers — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)
- [Diagnóstico com Chrome Performance](./performance-devtools-network-waterfall.md)
