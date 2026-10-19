---
title: "ControlValueAccessor: conectar um campo próprio ao formulário Angular"
description: "Aprenda como um campo personalizado recebe valores, informa edições e acompanha os estados de um formulário."
date: '2026-10-16'
category: 'Angular'
tags:
  - Forms
  - CVA
  - Acessibilidade
---

Imagine um campo de telefone próprio, composto por seleção de país e número. Para o formulário pai, ele ainda precisa funcionar como um campo: receber valor, informar edições e poder ser desabilitado. Essa integração é o trabalho do **CVA**, abreviação de `ControlValueAccessor`. Este guia pressupõe os conceitos de [FormControl e validação](./angular-formularios-validacao.md).

[`ControlValueAccessor`](https://angular.dev/api/forms/ControlValueAccessor) é a ponte entre um controle de interface e as APIs tradicionais de formulários Angular. Ele não substitui validadores, as funções que verificam as regras dos campos, nem exige criar um componente para cada input. Use-o quando um controle reutilizável realmente precisa participar de `formControl` ou `ngModel`.

## As quatro responsabilidades

`writeValue` recebe uma atualização do modelo. `registerOnChange` fornece o callback para informar edições feitas pelo usuário. `registerOnTouched` registra como avisar que o controle foi tocado, normalmente quando perde foco. `setDisabledState` aplica o estado de desabilitação à interface.

Um erro comum é chamar `onChange` dentro de `writeValue`: a leitura do modelo vira outra escrita, produzindo notificações duplicadas ou ciclos.

## Controle completo com input nativo

```ts
import { Component, forwardRef, input, signal } from '@angular/core'
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms'

@Component({
  selector: 'app-text-field',
  standalone: true,
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => TextField),
    multi: true,
  }],
  template: `
    <label [for]="controlId()">{{ label() }}</label>
    <input [id]="controlId()" [value]="value()" [disabled]="disabled()"
      (input)="updateValue($event)" (blur)="notifyTouched()">
  `,
})
export class TextField implements ControlValueAccessor {
  readonly controlId = input.required<string>()
  readonly label = input.required<string>()
  protected readonly value = signal('')
  protected readonly disabled = signal(false)
  private notifyChange: (value: string) => void = () => {}
  protected notifyTouched: () => void = () => {}

  writeValue(value: unknown): void {
    this.value.set(typeof value === 'string' ? value : '')
  }

  registerOnChange(callback: (value: string) => void): void {
    this.notifyChange = callback
  }

  registerOnTouched(callback: () => void): void {
    this.notifyTouched = callback
  }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled)
  }

  protected updateValue(event: Event): void {
    if (!(event.target instanceof HTMLInputElement)) return
    this.value.set(event.target.value)
    this.notifyChange(event.target.value)
  }
}
```

O consumidor importa `TextField` e `ReactiveFormsModule`, cria um `FormControl` e usa `<app-text-field controlId="customer-name" label="Nome" [formControl]="name" />`. Cada instância precisa de um ID único. `useExisting` reutiliza o componente, em vez de criar outro objeto para o provider; `multi` participa da coleção de accessors.

O exemplo mantém o comportamento nativo de teclado. [Signals](https://angular.dev/guide/signals) usados no template notificam atualizações, inclusive de disabled. Num controle formado por vários elementos, `touched` indica que houve a interação considerada como toque pelo formulário. Essa indicação pode depender de o foco sair do conjunto, em vez de cada perda de foco interna (*blur*). Erros, descrição e estado inválido precisam ser encaminhados ao elemento efetivamente editável na versão de produção.

## O que verificar

- `setValue` atualiza o input sem provocar outra emissão de edição.
- Digitar atualiza o controle pai; blur marca touched.
- `disable()` impede edição e `enable()` a restaura.
- `reset()` limpa o valor conforme o contrato escolhido.
- O leitor de tela anuncia o rótulo e não encontra IDs duplicados.

Este é um exemplo de CVA para Reactive Forms/template-driven, não uma implementação da API específica de custom controls de [Signal Forms](https://angular.dev/guide/forms/signals/overview).

Referências: [ControlValueAccessor](https://angular.dev/api/forms/ControlValueAccessor) e [formulários acessíveis](./acessibilidade-formularios-erros-aria-live.md).
