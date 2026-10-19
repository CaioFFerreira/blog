---
title: 'Injeção de dependências: escopo, resolução e tempo de vida'
description: 'Entenda quando um serviço é compartilhado, quando uma tela recebe sua própria instância e como controlar a resolução do injector.'
date: '2026-10-16'
category: 'Angular'
glossary:
  token: 'Neste artigo, token é a chave que identifica o serviço ou valor solicitado ao sistema de injeção do Angular. Não é uma credencial de login.'
tags:
  - DI
  - Serviços
  - Escopo
---

Se uma tela precisa buscar clientes, ela pode pedir um serviço de clientes ao Angular, em vez de criá-lo com `new` em vários lugares. Essa é a ideia da **injeção de dependências**, também chamada **DI**. Uma **instância** é um objeto concreto criado a partir de uma classe; o lugar do registro influencia quem compartilha esse objeto.

Injeção de dependências permite pedir uma capacidade sem construir diretamente sua implementação. Em Angular, um **token** é a chave que identifica a dependência, e um **provider** é o registro que descreve como obtê-la. Esse token de injeção não é uma credencial de login. O [injector](https://angular.dev/guide/di/hierarchical-dependency-injection) resolve esse pedido e mantém instâncias conforme seu escopo. A motivação arquitetural está em [inversão de dependências](./arquitetura-dependency-inversion-solid.md); aqui o foco é o mecanismo do framework.

## Root não significa uma instância por componente

Um serviço com `providedIn: 'root'` é normalmente compartilhado na aplicação. É uma boa opção para um cliente [HTTP](https://www.rfc-editor.org/rfc/rfc9110.html) sem estado de tela. Não é automaticamente adequado para filtros temporários de cada painel.

```ts
import { Component, Injectable, inject, signal } from '@angular/core'

@Injectable()
export class FilterState {
  readonly search = signal('')
}

@Component({
  selector: 'app-filter-panel',
  standalone: true,
  providers: [FilterState],
  template: `<p>Busca atual: {{ filters.search() }}</p>`,
})
export class FilterPanel {
  protected readonly filters = inject(FilterState)
}
```

Cada instância do painel tem seu próprio `FilterState`, compartilhável com seus descendentes conforme as regras de resolução. Destruir o painel destrói seu injector e permite a limpeza dos [providers](https://angular.dev/guide/di/dependency-injection-providers) daquele escopo. Isso não cancela magicamente timers externos sem limpeza de recursos.

Evite registrar novamente um serviço root em `providers` por hábito: isso pode criar outra instância e fazer duas telas aparentarem perder sincronização. Providers de rota também permitem delimitar serviços a uma área, mas não assuma que navegação ou uma estratégia de reutilização sempre produzirá o ciclo de vida que imaginou; valide a configuração.

## De onde vem a dependência?

As opções de `inject` refinam a busca:

- `self`: procura somente no injector atual.
- `skipSelf`: começa no nível pai.
- `optional`: retorna `null` se não encontrar, em vez de lançar erro.
- `host`: limita a busca na hierarquia de elementos à fronteira de host correspondente.

`host` não significa procurar qualquer ancestral com o mesmo nome de componente. As hierarquias de elementos e de ambiente têm regras próprias; use essas opções para um contrato intencional, não para fazer um erro de provider desaparecer.

`inject` precisa de contexto de injeção, como a criação de uma classe pelo Angular ou uma factory. Não o chame arbitrariamente dentro de um callback de clique; capture a dependência num campo e use esse campo no callback.

## Visibilidade também comunica intenção

Use `private` para detalhes internos e `protected` para membros usados apenas pelo template e pela classe. Uma API pública deve ser intencional. O modificador TypeScript `private` não cria sigilo de dados durante a execução e não protege tokens contra [XSS](https://owasp.org/www-community/attacks/xss/); campos JavaScript `#private` têm outro mecanismo. Visibilidade de código não substitui autorização no servidor.

## Exercício

Renderize dois painéis e altere o filtro de um. Eles devem permanecer independentes. Mova o provider para um ancestral comum e explique por que o estado passa a ser compartilhado. Esse teste revela escopo melhor que decorar a palavra singleton.

Referência: [injectors hierárquicos](https://angular.dev/guide/di/hierarchical-dependency-injection).
