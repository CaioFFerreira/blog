---
title: "RxJS no Angular: acompanhar eventos e escolher como tratar novas ações"
description: "Entenda fluxos de valores, assinaturas e operadores com uma busca que precisa mostrar o resultado do termo mais recente."
date: '2026-10-16'
category: 'Angular'
tags:
  - RxJS
  - Observables
  - Concorrência
---

Uma busca recebe vários textos enquanto a pessoa digita: “c”, “ca”, “casa”. Podemos tratar essa sequência como um **fluxo**, ou *stream*. **Operadores** são funções que transformam ou combinam o fluxo. Uma **assinatura**, criada por `subscribe`, conecta um consumidor a ele para receber valores, erros ou a conclusão.

[RxJS](https://rxjs.dev/guide/overview) representa sequências de valores no tempo com [Observables](https://rxjs.dev/guide/observable). Uma [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) resolve ou rejeita uma vez; um Observable pode emitir zero, um ou muitos valores e terminar ou permanecer ativo. Muitos Observables são lazy, como os de [`HttpClient`](https://angular.dev/guide/http/making-requests), mas nem todo stream inicia sua origem na assinatura: eventos compartilhados podem acontecer independentemente de um consumidor.

Cancelar uma assinatura encerra sua participação e executa a limpeza prevista pela fonte, chamada *teardown*. Com [HTTP](https://www.rfc-editor.org/rfc/rfc9110.html), isso pode abortar a requisição no cliente; não desfaz uma operação que o servidor já recebeu.

## Transformar não é assinar dentro de uma assinatura

`map` transforma cada valor do fluxo. `tap` permite executar uma ação auxiliar, como registrar uma informação para diagnóstico, sem substituir o valor emitido. [`debounceTime`](https://rxjs.dev/api/operators/debounceTime) aguarda uma pausa; [`distinctUntilChanged`](https://rxjs.dev/api/operators/distinctUntilChanged) elimina repetições consecutivas pela comparação configurada. Objetos exigem cuidado: igualdade padrão não compara todos os campos.

Este trecho entra em um componente com `HttpClient` configurado por `provideHttpClient`. `search` é um controle de busca e `results$` pode ser consumido com [`AsyncPipe`](https://angular.dev/api/common/AsyncPipe):

```ts
import { HttpClient } from '@angular/common/http'
import { Injectable, inject } from '@angular/core'
import { FormControl } from '@angular/forms'
import { catchError, debounceTime, distinctUntilChanged, map, of, switchMap } from 'rxjs'

@Injectable()
export class ArticleSearchModel {
  private readonly http = inject(HttpClient)
  readonly search = new FormControl('', { nonNullable: true })
  readonly results$ = this.search.valueChanges.pipe(
    map(value => value.trim()),
    debounceTime(300),
    distinctUntilChanged(),
    switchMap(query => query.length < 2
      ? of({ status: 'idle' as const, items: [] })
      : this.http.get<readonly { id: string; title: string }[]>('/api/articles', {
          params: { query },
        }).pipe(
          map(items => ({ status: 'success' as const, items })),
          catchError(() => of({ status: 'error' as const, items: [] })),
        )),
  )
}
```

Registre `ArticleSearchModel` nos [`providers`](https://angular.dev/guide/di/dependency-injection-providers) do componente de busca e obtenha a instância com `inject(ArticleSearchModel)`. Esse escopo dá a cada busca seu próprio controle. Não instancie a classe com `new` fora do contexto de injeção. O template deve diferenciar erro de lista vazia. O [`catchError`](https://rxjs.dev/api/operators/catchError) interno mantém futuras buscas vivas após uma falha; colocado fora, pode encerrar a sequência inteira depois do fallback. Não há busca inicial até o controle emitir.

## O que fazer quando outra ação chega antes de a anterior terminar?

| Operador | Comportamento | Uso típico |
| --- | --- | --- |
| [`switchMap`](https://rxjs.dev/api/operators/switchMap) | Abandona a assinatura anterior | Buscar o termo mais recente |
| [`mergeMap`](https://rxjs.dev/api/operators/mergeMap) | Mantém operações concorrentes | Leituras independentes, com concorrência limitada |
| [`concatMap`](https://rxjs.dev/api/operators/concatMap) | Enfileira em ordem | Gravações que devem preservar sequência |
| [`exhaustMap`](https://rxjs.dev/api/operators/exhaustMap) | Ignora novos disparos enquanto o atual está ativo | Evitar submissões simultâneas |

Nenhum desses operadores garante idempotência no backend. `concatMap` pode acumular uma fila enorme; `mergeMap` sem limite pode saturar a API. Escolha explicitamente o que acontece com eventos excedentes.

## Subject e BehaviorSubject

Um [`Subject`](https://rxjs.dev/guide/subject) distribui emissões a assinantes atuais, sem exigir um valor inicial nem repetir o último valor para quem chega depois (*replay*). Um [`BehaviorSubject`](https://rxjs.dev/api/index/class/BehaviorSubject) exige um valor inicial e o entrega ao novo assinante. Exponha a leitura com `asObservable()` e mantenha `next` encapsulado para preservar as regras de atualização. Um histórico ilimitado em um replay é uma possível retenção de memória.

## Exercício

Simule uma resposta lenta para “ang” e rápida para “angular”. O resultado antigo não deve substituir o novo. Depois troque por `mergeMap` e observe por que a política mudou. Continue em [view models e limpeza](./angular-rxjs-recursos-viewmodel.md).

Referências: [RxJS e Angular](https://angular.dev/guide/http/making-requests) e [higher-order Observables](https://rxjs.dev/guide/higher-order-observables).
