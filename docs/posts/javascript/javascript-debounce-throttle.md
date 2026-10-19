---
title: 'Debounce e throttle: controlar eventos sem perder o comportamento'
description: 'Saiba quando esperar uma pausa e quando limitar a frequência, com implementações explicadas e cuidados com timers e requisições.'
date: '2026-10-16'
category: 'JavaScript'
tags:
  - Debounce
  - Throttle
  - Web APIs
  - Closures
---

Digitar, rolar a página e redimensionar a janela pode disparar muitos eventos em pouco tempo. Se cada evento iniciar uma tarefa custosa, a interface faz mais trabalho do que precisa.

[Debounce](https://developer.mozilla.org/en-US/docs/Glossary/Debounce) e [throttle](https://developer.mozilla.org/en-US/docs/Glossary/Throttle) controlam **quando uma função é chamada**. Eles não tornam uma chamada individual mais barata e não cancelam automaticamente operações já iniciadas.

Imagine uma busca que chama o servidor a cada tecla digitada. **Debounce** espera um intervalo sem novas chamadas para executar; **throttle** limita a frequência de execução. O primeiro ajuda a esperar uma pausa na digitação; o segundo pode limitar atualizações durante uma rolagem. Antes dos exemplos, ajuda entender [funções que preservam variáveis, as closures](./javascript-escopo-hoisting-closures.md).

## Qual é a diferença?

| Técnica | Regra deste artigo | Exemplo de uso |
| --- | --- | --- |
| Debounce | Executar após um período sem novas chamadas | Buscar depois que a pessoa pausa a digitação |
| Throttle | Executar no máximo uma vez por intervalo | Amostrar atualizações durante uma sequência de eventos |

Existem variantes. Vamos implementar debounce na borda final (**trailing**) e throttle na borda inicial (**leading**), sem chamada final automática.

## Debounce: cada chamada reinicia a espera

```js
function debounce(callback, atraso) {
  let timerId

  function executar(...argumentos) {
    clearTimeout(timerId)

    timerId = setTimeout(() => {
      timerId = undefined
      callback.apply(this, argumentos)
    }, atraso)
  }

  executar.cancel = () => {
    clearTimeout(timerId)
    timerId = undefined
  }

  return executar
}
```

A [closure](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures) mantém `timerId` entre as chamadas. Cada execução cancela o timer anterior e cria outro. A arrow do timer captura o [`this`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this) da chamada a `executar`; `apply` o repassa ao callback junto dos argumentos mais recentes.

Com atraso de 300 ms, imagine chamadas em 0, 100 e 200 ms. A execução fica elegível por volta de 500 ms, 300 ms após a última chamada. Timers podem atrasar mais conforme o navegador estiver ocupado.

Se as chamadas nunca pararem, esse debounce pode adiar o callback indefinidamente. Bibliotecas podem oferecer `maxWait` para limitar essa espera.

## Exemplo de busca com limpeza

Depois de definir `debounce`, execute este trecho em uma página que tenha um input `id="busca"`:

```js
const campo = document.querySelector('#busca')

if (!(campo instanceof HTMLInputElement)) {
  throw new Error('Adicione um input com id="busca" à página.')
}

const executarBusca = debounce(termo => {
  console.log('Buscar por:', termo)
}, 300)

const controller = new AbortController()

campo.addEventListener('input', () => {
  executarBusca(campo.value.trim())
}, { signal: controller.signal })

function encerrarBusca() {
  controller.abort()
  executarBusca.cancel()
}
```

O listener lê o valor imediatamente e passa uma string ao debounce. Ao sair da tela, chame `encerrarBusca` para remover o listener e cancelar a execução pendente. O exemplo imprime o termo; você pode integrar a busca real no callback.

## Throttle: limitar chamadas durante uma sequência

```js
function throttle(callback, intervalo) {
  let ultimaExecucao = -Infinity

  return function executar(...argumentos) {
    const agora = performance.now()

    if (agora - ultimaExecucao < intervalo) {
      return
    }

    ultimaExecucao = agora
    callback.apply(this, argumentos)
  }
}
```

A primeira chamada executa imediatamente. As seguintes são ignoradas enquanto não tiver passado o intervalo. `performance.now()` fornece uma medida monotônica de tempo adequada para calcular essa duração.

Com intervalo de 200 ms e chamadas nos instantes 0, 50, 100 e 250 ms, essa versão executa nas chamadas de 0 e 250 ms. Ela não cria um timer para executar exatamente em 200 ms.

**A última chamada pode ser descartada.** Se você precisa garantir o último valor de uma sequência, use uma implementação com borda final ou outra estratégia apropriada.

## Aplicando throttle a um evento

Depois de definir `throttle`, este exemplo registra a posição de rolagem no máximo uma vez a cada 200 ms enquanto houver eventos:

```js
const registrarPosicao = throttle(() => {
  console.log(window.scrollY)
}, 200)

const controller = new AbortController()

window.addEventListener('scroll', registrarPosicao, {
  passive: true,
  signal: controller.signal,
})

function encerrarObservacao() {
  controller.abort()
}
```

Chame `encerrarObservacao` ao encerrar a tela. Para atualizações visuais, avalie [`requestAnimationFrame`](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) para coordenar o trabalho com os frames; ele não equivale a limitar a frequência para um intervalo fixo. Dependendo do objetivo, [`IntersectionObserver`](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver) ou [`ResizeObserver`](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver) podem evitar a observação manual de eventos.

## Busca assíncrona: debounce não resolve respostas fora de ordem

Imagine que a busca por “java” começa e depois começa a busca por “javascript”. Se a primeira resposta chegar por último, ela pode substituir o resultado mais recente.

Para evitar isso, você pode cancelar a requisição anterior com [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) e tratar `AbortError`, além de conferir se o resultado ainda corresponde à busca atual antes de atualizar a tela. Debounce reduz o número de inícios; controle de concorrência decide quais resultados ainda são válidos.

Se o callback for `async`, trate suas falhas dentro dele ou encaminhe-as explicitamente. Estas funções utilitárias não devolvem uma [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) para cada execução adiada.

## Erros comuns

- Criar um novo debounce dentro de cada evento: cada instância teria seu próprio timer e não cancelaria as anteriores.
- Usar throttle sem chamada final em uma atualização que exige o último valor.
- Deixar um timer pendente depois de desmontar a tela.
- Aplicar debounce a feedback que deveria ser imediato, como mostrar o texto digitado no input.
- Esperar que debounce impeça todos os problemas de concorrência de uma busca remota.

## Continue estudando

- [Debounce — MDN](https://developer.mozilla.org/en-US/docs/Glossary/Debounce)
- [Throttle — MDN](https://developer.mozilla.org/en-US/docs/Glossary/Throttle)
- [Escopo e closures](./javascript-escopo-hoisting-closures.md)
- [Event Loop, timers e Promises](./javascript-event-loop-promises-async-await.md)
