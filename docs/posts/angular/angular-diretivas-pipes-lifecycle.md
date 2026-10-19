---
title: "Diretivas, pipes e ciclo de vida: o papel de cada peça no Angular"
description: "Separe comportamento, apresentação e etapas de criação dos componentes, com exemplos de foco e limpeza de recursos."
date: '2026-10-16'
category: 'Angular'
tags:
  - Lifecycle
  - Diretivas
  - Pipes
---

Aqui, **view** é a parte da interface criada pelo componente, e **ciclo de vida** é o percurso entre sua criação e sua destruição. Os **hooks** são métodos que o Angular chama em etapas desse percurso. Um pipe pode formatar uma data; uma diretiva pode acrescentar um comportamento a um elemento.

Um componente define uma view. Uma diretiva acrescenta comportamento a um elemento existente. Um pipe transforma um valor para apresentação. Confundir esses papéis costuma produzir componentes enormes ou operações caras em cada verificação do template.

## Hooks seguem etapas, não uma lista para decorar

Na inicialização, o primeiro [`ngOnChanges`](https://angular.dev/guide/components/lifecycle#ngonchanges), quando há [inputs](https://angular.dev/guide/components/inputs) alterados, ocorre antes de [`ngOnInit`](https://angular.dev/guide/components/lifecycle#ngoninit). Use o primeiro para reagir às mudanças de inputs e o segundo para inicialização que depende dos valores iniciais. O constructor é adequado para injeção e configuração local, não para assumir que os inputs já chegaram.

`ngDoCheck` permite verificações personalizadas e pode executar frequentemente. `ngAfterContentInit` acompanha a inicialização do conteúdo projetado, isto é, fornecido por quem usa o componente; [`ngAfterViewInit`](https://angular.dev/guide/components/lifecycle#ngafterviewinit), a view do componente. As versões `ngAfterContentChecked` e `ngAfterViewChecked` acompanham verificações posteriores. Não coloque requisições ou cálculos caros nesses hooks frequentes.

[`ngOnDestroy`](https://angular.dev/guide/components/lifecycle#ngondestroy) libera recursos. `DestroyRef.onDestroy` permite registrar essa limpeza perto da criação do recurso. Para código que depende do [DOM](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model) renderizado, avalie [`afterNextRender`](https://angular.dev/api/core/afterNextRender): callbacks de render não são um substituto para inicialização de estado e não executam durante SSR.

## Consultar uma view não é um canal de dados

[`viewChild`](https://angular.dev/guide/components/queries) e [`@ViewChild`](https://angular.dev/api/core/ViewChild) localizam elementos ou componentes da própria view. Conteúdo fornecido por projeção é outra relação, atendida pelas consultas de conteúdo. Prefira inputs e [outputs](https://angular.dev/guide/components/outputs) para comunicação; reserve consultas para operações imperativas, como foco.

```ts
import { Component, ElementRef, viewChild } from '@angular/core'

@Component({
  selector: 'app-search',
  standalone: true,
  template: `
    <label for="article-search">Buscar artigo</label>
    <input id="article-search" #searchInput type="search">
    <button type="button" (click)="focusSearch()">Ir para busca</button>
  `,
})
export class Search {
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput')

  focusSearch(): void {
    this.searchInput()?.nativeElement.focus()
  }
}
```

A consulta pode não encontrar um elemento condicional. Por isso o acesso é opcional. O foco só muda após uma ação explícita, não em cada atualização.

## Diretivas e eventos do host

Uma diretiva de **tooltip**, a pequena dica associada a um elemento, precisa responder tanto ao foco quanto ao ponteiro, permitir fechamento por Escape e associar a descrição com [`aria-describedby`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-describedby). Uma diretiva que escuta apenas `mouseenter` não atende quem usa teclado. [`@HostListener`](https://angular.dev/api/core/HostListener) registra eventos do elemento ao qual a diretiva está ligada, chamado *host*; a propriedade `host` do decorator também permite declarar bindings e listeners. Escolha uma convenção consistente e não duplique o mesmo listener nas duas formas.

## Pure e impure pipes

Pipes são puros por padrão: Angular reavalia quando o valor primitivo ou a referência de entrada muda. Alterar um item dentro do mesmo array não garante nova execução. Atualize imutavelmente ou derive o resultado no estado.

Um pipe impuro pode executar repetidamente durante a detecção de mudanças. Ele não é uma correção gratuita para mutações; filtrar milhares de itens dessa maneira pode travar a interface. O [`AsyncPipe`](https://angular.dev/api/common/AsyncPipe) é um caso especializado: acompanha emissões e gerencia a assinatura, não uma recomendação para transformar qualquer operação em pipe impuro.

## Verificação prática

Adicione e remova condicionalmente a busca. Confirme que o botão não lança erro sem o input. Depois compare um pipe puro recebendo o mesmo array mutado e um novo array: explique por que os resultados diferem.

Referências: [ciclo de vida](https://angular.dev/guide/components/lifecycle), [consultas de componentes](https://angular.dev/guide/components/queries) e [pipes](https://angular.dev/guide/templates/pipes).
