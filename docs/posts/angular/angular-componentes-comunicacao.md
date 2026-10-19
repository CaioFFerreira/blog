---
title: 'Angular: componentes, standalone e comunicação clara'
description: 'Entenda a estrutura de uma aplicação Angular e distribua responsabilidades sem transformar componentes em serviços globais.'
date: '2026-10-16'
category: 'Angular'
tags:
  - Componentes
  - Standalone
  - Arquitetura
---

Pense numa página de produtos: ela pode conter um componente de busca e vários componentes de card. O **template** descreve o HTML exibido, a **classe** guarda dados e operações, e os **metadados** dizem ao Angular como usar o componente. “Pai” e “filho” indicam quem inclui quem nessa composição.

Uma aplicação Angular começa por um componente principal, chamado raiz, e compõe uma árvore de componentes. Cada componente reúne uma classe, um template e metadados. Serviços oferecem operações e estado compartilhado; diretivas adicionam comportamento; pipes transformam valores de apresentação. Router, formulários e injeção de dependências completam esse conjunto.

O template lê o estado e registra eventos. Quando uma atualização é notificada ao Angular, a detecção de mudanças sincroniza as views necessárias. Não é preciso manipular o [DOM](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model) manualmente para trocar o texto de um botão.

## Um contrato pequeno entre pai e filho

Em um projeto Angular moderno, este componente [standalone](https://angular.dev/guide/components/importing) pode ser importado diretamente por outro componente:

```ts
import { Component, input, output } from '@angular/core'

@Component({
  selector: 'app-study-card',
  standalone: true,
  template: `
    <article>
      <h2>{{ title() }}</h2>
      <button type="button" (click)="studyRequested.emit()">
        Marcar como estudado
      </button>
    </article>
  `,
})
export class StudyCard {
  readonly title = input.required<string>()
  readonly studyRequested = output<void>()
}
```

O pai importa `StudyCard` em `imports`, fornece `[title]` e reage a `(studyRequested)`. O filho comunica intenção, não decide como persistir o estudo. As APIs tradicionais `@Input` e `@Output` também aparecem em projetos existentes; não precisam ser substituídas apenas por estética. [Outputs](https://angular.dev/guide/components/outputs) de componentes não se propagam automaticamente pelos elementos ancestrais (*bubbling*) como certos eventos nativos do DOM.

## Smart e presentational são responsabilidades

Um componente de página pode carregar os artigos, lidar com falhas e chamar a persistência: é o papel de container ou smart component. Um card recebe dados e emite ações: é o papel de apresentação. Não crie uma dupla de arquivos para todo elemento; se a separação não melhora teste, composição ou entendimento, ela pode ser dispensável.

Para irmãos próximos, o pai coordena. Para uma funcionalidade com muitos níveis, uma **facade** — uma interface que concentra operações de uma área — ou um serviço limitado à funcionalidade pode evitar o repasse de eventos por cinco componentes intermediários. Um barramento global para qualquer evento esconde dependências e dificulta descobrir quem altera o estado.

## Organização que acompanha o produto

Prefira `features/payments/` com página, componentes e acesso a dados próximos, em vez de pastas globais com centenas de services e components. Só promova para `shared` algo realmente reutilizável e sem regras de um domínio específico. Os critérios estão em [funcionalidades e fronteiras de domínio](./arquitetura-features-domain-boundaries.md).

Standalone significa declarar dependências de template em `imports`, não eliminar arquitetura ou serviços. Em aplicações com NgModules, migre gradualmente e mantenha as fronteiras funcionais; veja [build e migração](./angular-build-migracao.md).

## Exercício

Crie uma página com dois cards. Marcar um deve atualizar apenas o item correspondente, sem fazer o card conhecer [HTTP](https://www.rfc-editor.org/rfc/rfc9110.html), autenticação ou armazenamento. Se o componente precisar de dez serviços, reveja suas responsabilidades antes de adicionar outro.

Referência: [componentes Angular](https://angular.dev/guide/components).
