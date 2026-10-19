---
title: "Detecção de mudanças no Angular: como os dados chegam à tela"
description: "Entenda quando o Angular verifica a interface, o que OnPush e track fazem e como investigar uma atualização lenta."
date: '2026-10-16'
category: 'Angular'
tags:
  - OnPush
  - Performance
  - Zoneless
---

Imagine um contador: o número muda no código e precisa mudar na tela. Essa ligação entre um valor e o template é chamada de **binding**. O **estado** é o conjunto de dados que descreve a situação atual da interface. A detecção de mudanças é o mecanismo que ajuda a manter as duas partes coerentes.

A detecção de mudanças sincroniza os valores do template com o estado da aplicação. Não significa recriar todo o [DOM](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model) a cada evento. O custo depende do tamanho da árvore verificada, do trabalho necessário para avaliar essas ligações e das atualizações efetivas de elementos.

O **Zone.js** é uma biblioteca que acompanha operações assíncronas e pode ajudar o Angular a perceber quando verificar mudanças. Alguns projetos usam esse mecanismo. Aplicações [zoneless](https://angular.dev/guide/zoneless) dependem de notificações explícitas reconhecidas pelo Angular, como atualização de [signal](https://angular.dev/guide/signals) lido no template, listeners e `markForCheck`. Confirme a configuração da aplicação; dizer que “Angular sempre depende de Zone.js” não descreve o Angular moderno.

## OnPush não observa apenas inputs

[`OnPush`](https://angular.dev/best-practices/skipping-subtrees) permite pular subárvores sem indicação de atualização. Novos [inputs](https://angular.dev/guide/components/inputs), eventos tratados na subárvore, signals usados na view e marcações como as do [`AsyncPipe`](https://angular.dev/api/common/AsyncPipe) podem provocar verificação. Uma mutação profunda no mesmo objeto não equivale a fornecer uma nova referência ao filho.

```ts
import { ChangeDetectionStrategy, Component, signal } from '@angular/core'

@Component({
  selector: 'app-article-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" (click)="reverse()">Inverter ordem</button>
    <ul>
      @for (article of articles(); track article.id) {
        <li>{{ article.title }}</li>
      }
    </ul>
  `,
})
export class ArticleList {
  protected readonly articles = signal([
    { id: 'di', title: 'Injeção de dependências' },
    { id: 'forms', title: 'Formulários' },
  ])

  protected reverse(): void {
    this.articles.update(current => [...current].reverse())
  }
}
```

`track article.id` mantém a identidade lógica quando a posição muda. Nas aplicações que usam `*ngFor`, `trackBy` expressa a mesma preocupação. Um índice não é um identificador seguro quando há inserção, remoção ou reordenação. IDs duplicados também violam o contrato.

## Identidade não reduz a quantidade de elementos

Identificar cada item com `track` ajuda a reutilizar as partes da interface já criadas para ele. Não transforma cinquenta mil linhas em poucas linhas: para isso, avalie paginação ou virtualização. Tampouco elimina um cálculo caro chamado no template. Derive resultados com [`computed`](https://angular.dev/guide/signals#computed-signals) ou uma estratégia adequada, em vez de ordenar uma lista enorme a cada leitura.

Priorize a investigação: compare uma interação representativa antes e depois com Angular DevTools e o painel Performance. Se o gargalo é rede, `OnPush` não encurta a resposta da API; se é JavaScript inicial, avalie lazy loading e bundle; se é uma long task, divida ou mova o trabalho.

## Exercício

Inclua um input em cada linha e inverta a ordem. A identidade deve acompanhar o artigo, não a posição. Meça duração de atualização e quantidade de elementos antes de propor memoização ou virtualização. Consulte [renderização e virtualização](./performance-virtualizacao-renderizacao.md) para os mecanismos da plataforma.

Referências: [subárvores e OnPush](https://angular.dev/best-practices/skipping-subtrees), [zoneless](https://angular.dev/guide/zoneless) e [control flow](https://angular.dev/guide/templates/control-flow).
