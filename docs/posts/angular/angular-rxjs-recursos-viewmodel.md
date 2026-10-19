---
title: "View models no Angular: reunir dados da tela e encerrar assinaturas"
description: "Combine fontes de dados para uma tela e entenda quando compartilhar consultas, limpar assinaturas e liberar recursos."
date: '2026-10-16'
category: 'Angular'
tags:
  - RxJS
  - Memory leaks
  - View model
---

Um **view model** reúne os dados já preparados para uma tela, como o nome do cliente e a quantidade de pagamentos. Uma **assinatura** acompanha os valores de um fluxo; enquanto ativa, pode manter trabalho e recursos em uso. Antes deste guia, vale praticar [Observables e operadores](./angular-rxjs-operadores.md) com uma fonte de dados por vez.

O problema de milhares de streams ativos não é resolvido apenas trocando `subscribe` por outro nome. Cada recurso precisa de um dono, um limite e uma condição de encerramento. Uma assinatura de [HTTP](https://www.rfc-editor.org/rfc/rfc9110.html) que conclui é diferente de um [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API), timer ou listener que pode durar horas.

## Combine conforme o contrato das fontes

[`combineLatest`](https://rxjs.dev/api/index/function/combineLatest) combina os últimos valores e emite novamente quando uma fonte muda, mas precisa que todas emitam ao menos uma vez. Um filtro sem valor inicial pode deixar a tela silenciosa. `startWith` só é correto quando existe um valor inicial válido para o produto.

[`forkJoin`](https://rxjs.dev/api/index/function/forkJoin) espera a conclusão das fontes e entrega seus últimos valores uma vez. É adequado a leituras HTTP finitas, não a um stream de localização que nunca completa. Se uma fonte falha, trate a política: falhar o conjunto ou representar indisponibilidade parcial. Não transforme qualquer erro em dados vazios sem informar o usuário.

Combinar saldo e pagamentos no cliente não garante que os dados representem o mesmo instante confirmado do sistema, como numa visão transacional. Para obter consistência entre serviços, negocie versão, marca de tempo (*timestamp*) ou uma resposta agregada do servidor.

## Uma assinatura de template

Trecho para o template de um componente que importa [`AsyncPipe`](https://angular.dev/api/common/AsyncPipe) e expõe `viewModel$`:

```html
@if (viewModel$ | async; as viewModel) {
  <h2>{{ viewModel.customerName }}</h2>
  <p>{{ viewModel.paymentCount }} pagamentos</p>
}
```

O `AsyncPipe` acompanha a referência da fonte e limpa sua assinatura quando a view é destruída. Repetir `httpRequest$ | async` em vários lugares pode disparar várias assinaturas e requisições. Uma variável de template reduz esse risco; compartilhar a própria fonte dos dados entre consumidores é outra decisão, não consequência automática de colocar `$` no nome.

Para um efeito imperativo necessário, capture [`DestroyRef`](https://angular.dev/api/core/DestroyRef) no componente e delimite explicitamente a assinatura:

```ts
import { DestroyRef, Injectable, inject } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { interval } from 'rxjs'

@Injectable()
export class RefreshModel {
  private readonly destroyRef = inject(DestroyRef)

  start(): void {
    interval(30_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refresh())
  }

  private refresh(): void {
    console.log('Atualizar dados')
  }
}
```

Registre `RefreshModel` nos [providers](https://angular.dev/guide/di/dependency-injection-providers) da tela e injete-o nela; assim, o recurso acompanha o escopo dessa tela. Chamar `start` duas vezes cria dois timers: limpeza na destruição não evita duplicação durante a vida do componente. Prefira uma única inicialização ou controle idempotência.

## Compartilhar não é uma política completa de cache

`shareReplay({ bufferSize: 1, refCount: true })` compartilha a fonte e reapresenta no máximo o último valor aos novos consumidores. `refCount` acompanha a quantidade de consumidores e pode desconectar uma fonte ativa quando não resta nenhum. Isso não define um prazo de validade (TTL, *Time to Live*) nem garante apagar um resultado HTTP já concluído. Caches por chave precisam de tamanho máximo, invalidação e isolamento de usuário.

Um serviço root mantém recursos por muito mais tempo que uma tela. [`takeUntilDestroyed`](https://angular.dev/api/core/rxjs-interop/takeUntilDestroyed) no root não encerra um stream quando a página some. Escopos de providers e limpeza de listeners, observers, workers e geolocalização também contam.

## Verifique, não presuma

Abra e feche a funcionalidade dez vezes. O número de conexões e timers deve voltar ao patamar inicial. Capture um **heap snapshot**, um registro dos objetos em memória, para investigar o que continua retido; o roteiro completo está em [memory leaks](./performance-memory-leaks.md).

Referências: [interop com RxJS](https://angular.dev/ecosystem/rxjs-interop) e [takeUntilDestroyed](https://angular.dev/api/core/rxjs-interop/takeUntilDestroyed).
