---
title: 'HttpClient e interceptors: contratos, tokens e falhas previsíveis'
description: 'Organize acesso a APIs, componha interceptors e evite enviar credenciais para destinos indevidos.'
date: '2026-10-16'
category: 'Angular'
tags:
  - HTTP
  - Segurança
  - Interceptors
---

Uma **API** é uma interface pela qual sistemas trocam dados e pedem operações; numa aplicação web, isso costuma envolver requisições HTTP. O `HttpClient` faz essas chamadas no Angular. Um **interceptor** participa do caminho de envio ou de resposta para aplicar uma regra compartilhada, como acrescentar uma credencial apenas aos destinos permitidos.

Um serviço de acesso a dados concentra os endereços e as regras de integração com uma API, sem assumir as responsabilidades de toda a aplicação. `HttpClient.get<Customer>()` ajuda o compilador, mas não valida o JSON recebido. Valide respostas externas quando o risco exigir. Um [DTO — Data Transfer Object](https://martinfowler.com/eaaCatalog/dataTransferObject.html) descreve os dados transportados pela integração; traduza esse formato para o modelo da funcionalidade na fronteira apropriada, quando os contratos forem diferentes.

Os [Observables](https://rxjs.dev/guide/observable) de requisição são normalmente frios: assinar inicia a operação e assinar duas vezes pode enviar duas requisições. Um nome terminado em `$` não implica cache.

## Um interceptor não deve enviar token para qualquer URL

O exemplo abaixo só acrescenta o cabeçalho a uma origem e um prefixo de API definidos. Ele demonstra o escopo, não armazenamento de credenciais nem um fluxo completo de autenticação:

```ts
import { HttpInterceptorFn } from '@angular/common/http'
import { InjectionToken, inject } from '@angular/core'

export const ACCESS_TOKEN = new InjectionToken<() => string | null>('ACCESS_TOKEN')

export const apiAuthInterceptor: HttpInterceptorFn = (request, next) => {
  const readToken = inject(ACCESS_TOKEN)
  const apiBase = new URL('https://api.example.com/v1/')
  let destination: URL
  try {
    destination = new URL(request.url)
  } catch {
    return next(request)
  }
  const trusted = destination.origin === apiBase.origin
    && destination.pathname.startsWith('/v1/')
  const token = trusted ? readToken() : null

  return next(token
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request)
}
```

**Contrato importante:** este cliente usa URLs absolutas da API. URLs relativas passam sem receber o token; a configuração não reescreve a URL enviada por [`HttpClient`](https://angular.dev/guide/http/making-requests). Para suportar URLs relativas, defina a origem real de resolução, especialmente em SSR. Configure uma factory para `ACCESS_TOKEN` que leia a sessão válida. Não fixe credenciais no bundle e não registre headers em logs.

Registre com `provideHttpClient(withInterceptors([apiAuthInterceptor]))`. Os imports de configuração vêm de `@angular/common/http`; o provider do token também precisa existir no [injector](https://angular.dev/guide/di/hierarchical-dependency-injection). [Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies) [HttpOnly](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#httponly) com um [BFF](https://learn.microsoft.com/en-us/azure/architecture/patterns/backends-for-frontends) são outra estratégia e exigem considerar [CSRF](https://owasp.org/www-community/attacks/csrf); não converta automaticamente toda aplicação para Bearer em [`localStorage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).

## Ordem da cadeia e responsabilidade

Vários interceptors podem tratar autenticação, correlação e métricas. A requisição passa na ordem configurada; respostas retornam pela composição inversa. A posição do tratamento de erro ou retry muda quais etapas são repetidas. Evite mutar corpos compartilhados: clonar a requisição não faz uma cópia profunda do JSON.

Use tratamento global para aspectos transversais e preserve contexto na funcionalidade: “pagamento recusado” não é igual a “rede indisponível”. Um 401 pode exigir renovar sessão; 403 não costuma ser resolvido repetindo login. Renovação precisa evitar ciclos e coordenar requisições simultâneas. Falha no próprio refresh deve encerrar o fluxo, não disparar outro refresh infinito.

Retry deve ter limite e considerar idempotência. Repetir uma criação de pagamento sem chave idempotente pode duplicar uma operação, mesmo quando o cliente recebeu apenas timeout.

## Exercício

Com [`HttpTestingController`](https://angular.dev/guide/http/testing), verifique que a API permitida recebe o cabeçalho e uma URL de analytics não recebe. Teste também sessão ausente, falha de rede e erro de domínio. O setup está em [testes Angular](./angular-testes-acessibilidade.md).

Referências: [interceptors](https://angular.dev/guide/http/interceptors) e [requisições HTTP](https://angular.dev/guide/http/making-requests).
