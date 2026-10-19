---
title: 'Formulários Angular: modelagem, validação e campos dinâmicos'
description: 'Compare Reactive Forms, template-driven e Signal Forms e organize validações cruzadas sem dezenas de assinaturas.'
date: '2026-10-16'
category: 'Angular'
tags:
  - Forms
  - Validação
  - Signal Forms
---

Num cadastro, cada campo tem um valor e também uma situação: vazio, inválido, já editado ou pronto para envio. O Angular representa essas informações em controles. Neste guia, **validação** é conferir se os dados atendem a uma regra, como preencher o e-mail ou repetir a mesma senha; isso é diferente de efetivar o cadastro.

Um formulário é um modelo de interação: valores, validade, edição, submissão e erros. Escolher uma API não elimina a necessidade de decidir quando mostrar mensagens e quais regras pertencem ao servidor.

## Qual abordagem usar?

[Template-driven](https://angular.dev/guide/forms/template-driven-forms), com `FormsModule` e `ngModel`, funciona bem em formulários simples e próximos do template. [Reactive Forms](https://angular.dev/guide/forms/reactive-forms) explicita a árvore de controles em TypeScript e facilita composição, tipagem e validações complexas. [Signal Forms](https://angular.dev/guide/forms/signals/overview) usa um modelo reativo baseado em [signals](https://angular.dev/guide/signals) e schemas, que descrevem a estrutura e as regras de validação; suas APIs vêm de `@angular/forms/signals` e requerem uma versão compatível do Angular.

Na documentação consultada em outubro de 2026, Signal Forms é apresentada para aplicações novas baseadas em signals, enquanto Reactive Forms continua sendo uma escolha válida para aplicações existentes. Não migre cinquenta campos apenas para adotar a API mais nova. Confira a documentação correspondente à versão instalada, especialmente em projetos anteriores ao Angular 21.

## Uma regra entre campos pertence ao grupo

Trecho de modelo Reactive Forms para um componente que importe `ReactiveFormsModule`:

```ts
import { FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms'

export const passwordsMatch: ValidatorFn = control => {
  const password = control.get('password')?.value
  const confirmation = control.get('confirmation')?.value
  return password === confirmation ? null : { passwordMismatch: true }
}

export function createAccountForm() {
  return new FormGroup({
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(12)],
    }),
    confirmation: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  }, { validators: passwordsMatch })
}
```

O grupo recebe `passwordMismatch` quando os valores diferem. Campos vazios continuam inválidos por `required`, mesmo quando coincidem. Exiba a divergência após interação ou tentativa de submissão e associe a mensagem aos campos com [`aria-describedby`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-describedby). O erro de grupo não aparece automaticamente em `confirmation.errors`.

Cada componente chama `createAccountForm()` para obter uma instância própria. Assim, valores e estados de edição não são compartilhados acidentalmente entre telas.

## Cinquenta campos não exigem cinquenta assinaturas

Divida por grupos coerentes e aplique validadores no menor grupo que contém os dados necessários. Um validador deve calcular erros, não iniciar requisições, alterar outros controles ou executar `setErrors` recursivamente. Validações assíncronas precisam retornar [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) ou [Observable](https://rxjs.dev/guide/observable) com conclusão e tratar a política para indisponibilidade do serviço.

`updateOn: 'blur'` reduz frequência, mas altera quando a interface recebe feedback. Pode ser apropriado para uma consulta remota de disponibilidade, não necessariamente para todos os campos. O backend deve validar novamente os dados, inclusive regras já verificadas no navegador.

## Dinâmico sem virar um framework interno

Configuração de campos pode definir chave, tipo, rótulo e validadores permitidos. Use uma união discriminada e um registro fechado de renderizadores, não `eval` ou templates arbitrários vindos do servidor. Para listas, use [`FormArray`](https://angular.dev/api/forms/FormArray); para chaves abertas homogêneas, avalie [`FormRecord`](https://angular.dev/api/forms/FormRecord).

Não reconstrua todo o form a cada mudança da configuração: isso pode perder foco, valores e os estados `dirty` (valor alterado pela pessoa) e `touched` (controle marcado como tocado, normalmente após perder o foco). Atualize apenas os controles afetados e preserve a identidade dos demais. Só construa um motor genérico quando houver variação real e recorrente.

## Exercício

Teste senhas iguais, diferentes e vazias. Depois acrescente um campo dinâmico sem apagar o que já foi digitado. Para controles próprios, continue em [ControlValueAccessor](./angular-control-value-accessor.md).

Referências: [Reactive Forms](https://angular.dev/guide/forms/reactive-forms), [formulários dinâmicos](https://angular.dev/guide/forms/dynamic-forms) e [Signal Forms](https://angular.dev/guide/forms/signals/overview).
