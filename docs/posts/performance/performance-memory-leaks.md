---
title: "Memory leaks: por que uma tela fechada ainda pode ocupar memória?"
description: "Entenda referências que mantêm objetos vivos e use registros de memória para investigar recursos que não foram liberados."
date: '2026-10-16'
category: 'Performance'
tags:
  - Memory leaks
  - Heap snapshot
  - Garbage collection
  - Chrome DevTools
---

Imagine abrir e fechar um painel várias vezes: cada abertura cria um observador, mas fechar não o remove. Dados daquele painel podem continuar em uso sem necessidade. O **garbage collector**, ou coletor de lixo, libera memória de objetos que deixaram de ser alcançáveis. Um **vazamento** aparece quando referências os mantêm vivos além do necessário.

Um vazamento acontece quando dados que não são mais úteis continuam retidos por referências vivas. O garbage collector não sabe que a pessoa fechou uma tela: ele observa alcançabilidade, não intenção de produto.

O [guia de valores e memória](./javascript-valores-imutabilidade-memoria.md) explica a base. Aqui, o foco é reproduzir e encontrar a referência que mantém um recurso vivo.

## Nem todo crescimento de memória é um vazamento

Um gráfico que sobe e depois cai pode refletir alocações temporárias e coleta. Um cache limitado pode crescer até estabilizar. Uma base maior carregada de propósito também ocupa memória legitimamente.

Por outro lado, memória que cresce após abrir e fechar a mesma tela repetidamente merece investigação. Compare o mesmo estado funcional depois de cada ciclo; não compare uma tela vazia com outra que tem mais dados.

## Um exemplo de ciclo de vida incompleto

```js
function observarJanela(elemento) {
  function atualizarLargura() {
    elemento.textContent = `${window.innerWidth}px`
  }

  window.addEventListener('resize', atualizarLargura)
  atualizarLargura()
}
```

Se a tela remover `elemento` do [DOM](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model) e não remover o listener, `window` continua mantendo a função, que mantém acesso ao elemento. A closure não é o erro: falta encerrar a observação quando ela deixa de ser útil.

Uma versão com limpeza explícita:

```js
function observarJanela(elemento) {
  const controller = new AbortController()

  function atualizarLargura() {
    elemento.textContent = `${window.innerWidth}px`
  }

  window.addEventListener('resize', atualizarLargura, {
    signal: controller.signal,
  })
  atualizarLargura()

  return () => controller.abort()
}
```

O chamador precisa guardar e chamar a função retornada ao desmontar a tela. Só retornar uma limpeza sem conectá-la ao ciclo de vida não resolve o problema.

O mesmo princípio vale para intervalos, observers, assinaturas, workers e caches. Uma requisição que termina sozinha não é automaticamente um vazamento; investigue o que permanece retido e por quanto tempo.

## Um roteiro com o painel Memory

No Chrome, use um cenário controlado e um build representativo:

1. Abra a rota e execute um ciclo inicial para aquecer caches e inicializações.
2. Volte ao estado de referência e capture um **[heap snapshot](https://developer.chrome.com/docs/devtools/memory-problems/heap-snapshots)**, um registro dos objetos que ocupam a memória naquele momento.
3. Abra e feche a funcionalidade várias vezes, sempre retornando ao mesmo estado.
4. Capture outro snapshot e compare objetos que continuam crescendo.
5. Inspecione os caminhos de retenção até descobrir quem mantém esses objetos vivos.

Uma coleta forçada disponível nas ferramentas pode ajudar a comparar estados, mas não reproduz o agendamento normal do coletor em produção. Não use frequência de coleta forçada como “correção”.

Snapshots podem ser caros. Para descobrir onde ocorrem alocações ao longo do fluxo, ferramentas que registram a criação de objetos ao longo do tempo (*allocation profiling*) ajudam a complementar a comparação.

## Shallow size, retained size e detached nodes

**Shallow size** representa o tamanho do próprio objeto. **Retained size** estima a memória que poderia ser liberada se aquele objeto deixasse de ser alcançável, junto dos outros objetos que dependem exclusivamente dele para continuar acessíveis. Um objeto pequeno pode prender uma estrutura grande.

Um **nó detached** é um elemento que saiu da árvore do documento, mas ainda existe em memória. Isso pode ser legítimo, por exemplo durante uma transição ou reutilização planejada. A evidência relevante é sua retenção desnecessária e persistente após o fluxo terminar.

Não conclua apenas pelo nome do construtor. Siga os **retainers**, as referências que mantêm o objeto acessível: um array global, um listener em `window`, uma entrada de cache ou um registro de ferramenta pode ser o dono real.

## A própria investigação pode reter objetos

Guardar objetos em variáveis globais do console, inspecioná-los ou registrá-los pode afetar sua vida útil durante o diagnóstico. Repita o fluxo em uma sessão limpa e evite manter referências artificiais aos objetos suspeitos.

Fechar a aba e reabri-la pode esconder o sintoma, mas não demonstra que o fluxo foi corrigido.

## Valide a correção no mesmo ciclo

Depois de ligar a limpeza ao dono do recurso, repita abrir e fechar com o mesmo número de ciclos. Verifique se as estruturas suspeitas deixam de se acumular e se listeners, timers ou workers encerrados não quebram a próxima abertura.

Não prometa memória exatamente constante: ambiente de execução, caches e coleta variam. Procure estabilização compatível com a funcionalidade e ausência do padrão de retenção identificado.

## Referências

- [Corrigir problemas de memória — Chrome DevTools](https://developer.chrome.com/docs/devtools/memory-problems)
- [Closures e estado encapsulado](./javascript-escopo-hoisting-closures.md)
- [Cache com limite de entradas](./performance-cache-memoization.md)
