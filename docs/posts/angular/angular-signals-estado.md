---
title: 'Signals, RxJS e NgRx: escolher o estado sem duplicá-lo'
description: 'Use signals para estado e derivação síncrona, RxJS para fluxos temporais e uma store quando a coordenação realmente justificar.'
date: '2026-10-16'
category: 'Angular'
tags:
  - Signals
  - Estado
  - NgRx
---

Imagine uma cesta com quantidade, preço e total. Quantidade e preço são dados de entrada; o total pode ser calculado a partir deles. Um **signal** guarda um valor e permite ao Angular acompanhar suas leituras e mudanças. Um valor **derivado** nasce de outros valores, em vez de precisar ser atualizado manualmente em cada ação.

[Signals](https://angular.dev/guide/signals) representam valores reativos lidos sincronicamente. [RxJS](https://rxjs.dev/guide/overview) modela sequências e políticas temporais. Um não elimina o outro: o preço total de uma cesta é uma derivação de estado; cancelar buscas antigas é uma decisão sobre um fluxo.

## Guarde as entradas e calcule os valores derivados

```ts
import { computed, signal } from '@angular/core'

type StudyArticle = { id: string; studied: boolean }

const articles = signal<readonly StudyArticle[]>([
  { id: 'angular-di', studied: false },
])

const studiedCount = computed(() => articles().filter(article => article.studied).length)

function markStudied(articleId: string): void {
  articles.update(current => current.map(article => article.id === articleId
    ? { ...article, studied: true }
    : article))
}

markStudied('angular-di')
console.log(studiedCount())
```

O resultado é `1`. [`computed`](https://angular.dev/guide/signals#computed-signals) calcula sob demanda e memoriza a derivação até que dependências relevantes mudem. Não precisa de uma segunda variável mutável para a contagem. Alterar diretamente o array existente, em vez de fornecer um novo valor ao signal, não equivale a notificar uma nova referência.

[`effect`](https://angular.dev/guide/signals/effect) serve para sincronizar com um sistema externo, não para manter dois signals com a mesma informação. Copiar `articles` para outro signal por efeito cria duas fontes de verdade e pode causar ciclos. Para efeitos em Angular, respeite o contexto de injeção e registre limpeza de recursos dos recursos criados. Persistência também exige tratamento de erro e não deve acessar [`localStorage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) durante SSR.

## A ponte tem custo e tempo de vida

[`toSignal`](https://angular.dev/ecosystem/rxjs-interop) permite ler um [Observable](https://rxjs.dev/guide/observable) como signal e normalmente assina imediatamente. Crie a ponte uma vez no contexto apropriado, não a cada execução do template. Defina um valor inicial ou trate a ausência antes da primeira emissão. `requireSync` só cabe quando a fonte realmente garante emissão síncrona, como um [BehaviorSubject](https://rxjs.dev/api/index/class/BehaviorSubject) adequado.

`toObservable` faz a ponte oposta, mas não deve ser interpretado como um histórico de toda mutação síncrona intermediária. Se o requisito é processar cada evento, modele eventos em vez de inferi-los a partir do último estado.

## Quando uma store ajuda?

Para estado local, um signal no componente é suficiente. Para uma funcionalidade compartilhada, um serviço com API pequena pode resolver. [NgRx](https://ngrx.io/guide/store) Store ou [SignalStore](https://ngrx.io/guide/signals/signal-store) passam a fazer sentido quando há coordenação importante, convenções de equipe, transições de estado e ferramentas que compensam o custo operacional. SignalStore e Store baseada em ações são abordagens diferentes; avalie a necessidade em vez de tratar “NgRx” como um único desenho.

Não replique automaticamente o cache [HTTP](https://www.rfc-editor.org/rfc/rfc9110.html) inteiro numa store global. Diferencie estado remoto, filtros de URL e estado de curta duração da interface, como discutido em [state management](./arquitetura-state-management.md) e [query versus estado global](./decisao-query-estado-global.md).

## Exercício

Acrescente `totalCount` e `remainingCount` com `computed`. Depois implemente uma busca remota com RxJS. A regra é conseguir explicar por que cada informação existe e quem pode alterá-la, sem usar um efeito para propagar estado derivado.

Referências: [signals](https://angular.dev/guide/signals), [interop](https://angular.dev/ecosystem/rxjs-interop) e [NgRx](https://ngrx.io/guide/store).
