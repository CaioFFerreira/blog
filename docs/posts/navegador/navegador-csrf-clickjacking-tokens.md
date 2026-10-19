---
title: "CSRF, clickjacking e tokens: distinguir ataques e proteger cada fluxo"
description: "Entenda ações forjadas, cliques disfarçados e vazamento de credenciais sem tratar problemas diferentes como uma única ameaça."
date: '2026-10-16'
category: 'Navegador'
tags:
  - CSRF
  - Clickjacking
  - Token leakage
  - Segurança
---

Imagine uma pessoa autenticada num site de compras visitando outra página. Parte da segurança depende de impedir que essa página provoque ações indevidas ou disfarce um clique. Um **cookie de sessão** pode identificar a sessão nas requisições; um **token** pode servir como credencial ou proteção, conforme o contrato. Vamos distinguir os ataques e as defesas de cada caso.

Uma defesa adequada depende do mecanismo da ameaça. Impedir leitura de uma resposta a partir de outra origem (*cross-origin*), impedir execução de conteúdo injetado e impedir uma ação indevida com [cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies) são problemas relacionados, mas diferentes.

Os fundamentos de cookies e Web Storage estão no [guia de armazenamento](./javascript-localstorage-sessionstorage-cookies.md); a arquitetura de sessão fica no [guia de autenticação](./system-design-autenticacao-seguranca.md). Aqui, vamos examinar como credenciais e ações podem ser expostas.

## CSRF: credenciais podem acompanhar uma requisição não desejada

**CSRF** significa *Cross-Site Request Forgery*, uma falsificação de requisição entre sites. Se o navegador envia cookies automaticamente, outra página pode tentar induzir uma ação autenticada. A resposta não precisa ser legível pela página atacante para o efeito de negócio acontecer.

Por isso, não trate [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS) como proteção geral contra [CSRF](https://owasp.org/www-community/attacks/csrf) e não realize mutações em GET. Para aplicações com sessão em cookie, escolha uma estratégia anti-CSRF adequada: token validado no servidor, verificações de origem e políticas de cookies compatíveis com o fluxo.

Um contrato ilustrativo de mutação pode exigir:

```http
POST /api/preferences
Content-Type: application/json
X-CSRF-Token: valor-associado-a-sessao
```

O cabeçalho só ajuda se o servidor emite, associa e valida o token de acordo com o modelo escolhido, antes de executar a operação. O valor mostrado é fictício. Não implemente uma comparação decorativa no cliente nem copie um token fixo em todas as sessões.

[`SameSite`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#samesitesamesite-value) é uma camada útil, mas a definição de site não coincide com origem. Subdomínios e fluxos de navegação podem mudar a análise. A [orientação anti-CSRF da OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html) detalha padrões e limitações. [XSS](https://owasp.org/www-community/attacks/xss/) pode contornar várias dessas proteções ao executar no contexto da própria aplicação.

## Clickjacking: uma ação legítima em uma interface enganosa

Uma página pode ser enquadrada dentro de outra e apresentada de forma a enganar a pessoa sobre onde está clicando. A aplicação precisa decidir quais ancestrais, se houver, podem incorporá-la.

Para uma página que não deve ser embutida, um exemplo de cabeçalhos de resposta é:

```http
Content-Security-Policy: frame-ancestors 'none'
X-Frame-Options: DENY
```

`frame-ancestors` controla quem pode enquadrar o documento. `frame-src` controla quais frames o documento pode carregar: não são equivalentes. `X-Frame-Options` pode apoiar compatibilidade, mas não oferece uma lista explícita de valores permitidos moderna de múltiplas origens equivalente à [CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP).

Esses são cabeçalhos do documento protegido. Um script que tenta sair do frame não é substituto confiável. Se o produto exige embedding por parceiros, defina os ancestrais permitidos e teste a integração, como orienta a [referência de clickjacking da OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html).

## Token leakage: vazamento de credenciais

Um **bearer token** é uma credencial cujo acesso depende de sua posse, conforme o contrato. Quem obtém esse valor pode conseguir usá-lo. Ele não deve aparecer em links de compartilhamento, query strings de API, mensagens de erro ou eventos de analytics.

URLs podem chegar a histórico, logs de infraestrutura, ferramentas de suporte e, conforme política e contexto, referenciadores. Um fragmento não é enviado como parte da requisição [HTTP](https://www.rfc-editor.org/rfc/rfc9110.html), mas continua acessível a scripts e não se torna um cofre por isso.

Usar o cabeçalho `Authorization` reduz alguns caminhos de exposição em comparação com credenciais na URL, mas ainda exige transporte seguro, remoção de credenciais dos logs e verificação de audiência, validade e autorização no servidor.

## Armazenamento seguro depende da arquitetura

[`localStorage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage), [`sessionStorage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage) e [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) são acessíveis a JavaScript autorizado na origem. Mudar entre eles não impede roubo por XSS. Manter um token em memória reduz sua persistência, mas um script malicioso ativo ainda pode agir ou acessar dados.

Uma sessão em cookie [`HttpOnly`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#httponly) pode evitar expor o identificador ao código da página, mas exige desenho anti-CSRF e não neutraliza XSS. O [caso de BFF e sessão](./system-design-autenticacao-seguranca.md) concentra a configuração e o ciclo de login; não há um armazenamento universalmente seguro separado desse contexto.

## Uma revisão com evidência

Em ambiente de teste, verifique uma mutação sem o token exigido, uma origem não permitida e uma tentativa de embedding não autorizada. Inspecione se o servidor bloqueia antes do efeito, não apenas se a UI mostra erro.

Depois examine uma amostra com dados sensíveis removidos de logs, histórico e conteúdos das mensagens de telemetria em busca de credenciais. Teste logout e troca de usuário, garantindo que dados e operações pendentes não atravessem identidades. Não use tokens reais em tickets ou capturas para demonstrar a falha.

## Continue estudando

- [Same-Origin Policy e CORS](./navegador-same-origin-cors.md)
- [XSS e CSP](./navegador-xss-csp.md)
