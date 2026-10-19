---
title: 'Testes Angular: contratos de HTTP, componentes e acessibilidade'
description: 'Use TestBed para verificar comportamentos relevantes e complete a automação com teclado, foco e tecnologia assistiva.'
date: '2026-10-16'
category: 'Angular'
tags:
  - TestBed
  - HTTP testing
  - Acessibilidade
---

Um teste deve responder a uma pergunta concreta: “ao salvar, a tela envia os dados corretos e informa o resultado?”. O **TestBed** prepara as peças Angular necessárias para esse teste. Um **provider** define como uma dependência será obtida. Se esses conceitos ainda forem novos, leia [injeção de dependências](./angular-injecao-dependencias.md) antes dos exemplos.

No Angular, [`TestBed`](https://angular.dev/guide/testing/utility-apis) configura um ambiente com componentes e [providers](https://angular.dev/guide/di/dependency-injection-providers). Ele permite substituir fronteiras sem reinventar o sistema de DI. A estratégia de [testes por risco](./testes-estrategia-risco.md) continua valendo: priorize permissão, perda de dados, erros e interações, não a existência de cada classe.

Na documentação atual, novos projetos Angular CLI usam [Vitest](https://vitest.dev/guide/); aplicações existentes podem continuar com Karma/Jasmine ou outra configuração. Use o runner configurado no projeto. Este blog não instala Angular ou esses runners apenas para publicar exemplos.

## Um teste de contrato HTTP

Exemplo para um projeto Angular com Vitest. Os providers devem manter esta ordem: o backend de testes substitui o backend [HTTP](https://www.rfc-editor.org/rfc/rfc9110.html) depois da configuração do cliente.

```ts
import { HttpClient, provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { firstValueFrom } from 'rxjs'
import { afterEach, beforeEach, expect, it } from 'vitest'

beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  })
})

afterEach(() => {
  TestBed.inject(HttpTestingController).verify()
})

it('preserva a falha de permissão para o consumidor', async () => {
  const client = TestBed.inject(HttpClient)
  const requests = TestBed.inject(HttpTestingController)
  const response = firstValueFrom(client.get('/api/payments'))
  const assertion = expect(response).rejects.toMatchObject({ status: 403 })

  const request = requests.expectOne('/api/payments')
  expect(request.request.method).toBe('GET')
  request.flush({ code: 'FORBIDDEN' }, { status: 403, statusText: 'Forbidden' })

  await assertion
})
```

O teste não prova que o servidor autoriza corretamente; prova o contrato observado pelo cliente neste cenário. Para validar interceptors, registre-os em `provideHttpClient(withInterceptors([...]))` e inspecione os cabeçalhos da requisição capturada, inclusive para destinos que não devem receber credenciais.

## Teste componentes pela interação

Importe o componente [standalone](https://angular.dev/guide/components/importing) no TestBed, configure suas dependências e use `fixture.componentRef.setInput` para [inputs](https://angular.dev/guide/components/inputs) quando apropriado. Após interações, espere a estabilização necessária com as APIs do ambiente em vez de inserir sleeps arbitrários. Evite depender de detalhes privados ou de chamadas manuais a hooks.

Teste um formulário inválido: ele não envia a operação, informa o erro e permite corrigir. Teste 403 numa tela de pagamentos: não exibe dados restritos e informa a indisponibilidade da ação. Para esses fluxos, um teste de integração costuma ser mais valioso que vários spies de métodos internos.

## Acessibilidade não vem automaticamente do framework

Use botões nativos, labels ligados aos inputs e nomes acessíveis. Para atributos [ARIA](https://www.w3.org/WAI/ARIA/apg/) dinâmicos, use bindings apropriados como `[attr.aria-expanded]`. Não substitua um botão por uma div clicável só porque `(click)` aceita o evento.

Em mudanças de rota, confira título da página, anúncio e foco conforme o contexto; o Router não decide sozinho a melhor experiência para cada produto. Modais precisam de foco inicial, contenção e retorno de foco. CDK pode ajudar, mas a configuração precisa ser testada.

Axe detecta parte dos problemas, não comprova conformidade. Faça a jornada sem mouse e com leitor de tela. Os roteiros detalhados estão em [teclado e foco](./acessibilidade-teclado-foco.md) e [testes de acessibilidade](./acessibilidade-testes-screen-readers-axe.md).

## Exercício

Adapte o teste para uma API que exige token e prove que analytics não o recebe. Depois teste um erro de formulário por teclado: a mensagem deve estar associada ao campo e não depender apenas de cor.

Referências: [testes Angular](https://angular.dev/guide/testing), [HTTP testing](https://angular.dev/guide/http/testing) e [acessibilidade Angular](https://angular.dev/best-practices/a11y).
