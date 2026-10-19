---
title: 'Autenticação e segurança: desenhar a sessão além da tela de login'
description: 'Conecte OIDC, sessão no BFF, cookies e autorização por recurso, com cenários de expiração, logout, XSS e CSRF.'
date: '2026-10-16'
category: 'System Design'
tags:
  - Autenticação
  - Autorização
  - Segurança
  - OIDC
---

Pense num portal de clientes: entrar com sua conta não deve permitir ler a fatura de outra pessoa. A **sessão** mantém a relação entre requisições e o acesso autenticado; o servidor precisa conferir permissão para cada recurso. Este artigo aplica esses conceitos ao [portal hipotético da série](./system-design-portal-escala.md).

Autenticação responde quem está acessando. Autorização decide o que essa identidade pode fazer em um recurso específico. Mostrar a página de documentos apenas após login não garante que um cliente não consiga pedir o documento de outro.

No portal da série, a proposta é usar um provedor de identidade e uma sessão web mantida pelo [BFF](https://learn.microsoft.com/en-us/azure/architecture/patterns/backends-for-frontends). É uma opção arquitetural para o exercício, não uma implementação pronta de autenticação.

## Um fluxo de login com responsabilidades definidas

O navegador inicia o login no BFF. O BFF cria os parâmetros de correlação e redireciona para o provedor. Após a autenticação, o provedor retorna um código ao callback previamente cadastrado. O BFF valida a resposta, troca o código no servidor e estabelece a sessão web.

[OIDC](https://openid.net/specs/openid-connect-core-1_0.html) acrescenta identidade sobre [OAuth 2.0](https://www.rfc-editor.org/rfc/rfc6749.html). Um ID token não é automaticamente o token correto para chamar qualquer API. Em cada token, valide assinatura, emissor, audiência, validade e os requisitos específicos do fluxo; não basta decodificar o conteúdo.

Use bibliotecas e integrações mantidas. O desenho deve seguir as recomendações de segurança do fluxo, incluindo Authorization Code com [PKCE](https://www.rfc-editor.org/rfc/rfc7636.html) e proteção de correlação apropriada, como `state` e `nonce` quando aplicáveis. A [RFC 9700](https://www.rfc-editor.org/rfc/rfc9700.html) registra práticas atuais de segurança para OAuth 2.0; OIDC tem requisitos próprios adicionais.

## Cookie de sessão não é um token público no JavaScript

Um exemplo ilustrativo de resposta do BFF:

```http
Set-Cookie: __Host-portal-session=valor-opaco; Path=/; Secure; HttpOnly; SameSite=Lax
Cache-Control: no-store
```

O prefixo `__Host-` exige, entre outras condições, `Secure`, `Path=/` e ausência de `Domain`. [`HttpOnly`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#httponly) impede a leitura pelo JavaScript da página. O valor opaco referencia uma sessão protegida no servidor; não exponha credenciais no HTML ou em logs.

O exemplo presume HTTPS e um fluxo compatível com `SameSite=Lax`. Fluxos entre sites e diferentes modos de callback precisam ser avaliados antes de copiar a configuração. Consulte a [orientação de sessões da OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

Tokens do provedor podem permanecer no servidor nessa arquitetura. Uma SPA que acessa APIs diretamente tem outro modelo de ameaça e gestão de tokens; não transfira a solução de BFF para esse caso sem revisar as premissas.

## Proteja mutações e o conteúdo executado

[Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies) são enviados automaticamente pelo navegador, por isso mutações precisam de proteção contra [CSRF](https://owasp.org/www-community/attacks/csrf) conforme o fluxo: valide origem quando apropriado e use mecanismos como tokens anti-CSRF. [`SameSite`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#samesitesamesite-value) é uma camada, não uma justificativa para ignorar a análise. Não execute alteração de dados via GET.

[XSS](https://owasp.org/www-community/attacks/xss/) pode executar ações na sessão mesmo sem ler o cookie `HttpOnly`. Escape e sanitização conforme o contexto, dependências cuidadas e uma política de conteúdo adequada ajudam a reduzir o risco. [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS) controla quais origens podem acessar respostas no navegador; não é autenticação nem proteção geral contra requisições maliciosas.

## Autorização existe em cada operação

Para `GET /documents/{id}`, o servidor verifica se o solicitante pode acessar aquele documento, considerando organização, vínculo e regra de negócio. Não confie em um `customerId` recebido do navegador como prova de acesso.

Uma role ampla pode permitir abrir uma área, mas o acesso ao objeto ainda precisa ser verificado. A [OWASP sobre autorização](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) recomenda negação por padrão e verificações coerentes ao longo das operações.

Dados enviados para o cliente já estão expostos a ele. Esconder campos com CSS, guards de rota ou condicionais do framework não protege informação que veio na resposta.

## Expiração, renovação e logout fazem parte da UX

Defina validade absoluta e por inatividade, renovação e revogação. Várias chamadas simultâneas não devem disparar fluxos de renovação conflitantes. Sessão inválida não pode gerar um loop infinito de retry.

Ao sair, invalide a sessão no servidor e descarte caches e estado do usuário no cliente. Logout local e logout no provedor não são necessariamente a mesma operação. Teste a troca de usuário e organização, inclusive com outras abas abertas.

Preserve rascunhos apenas se a política permitir; nunca recupere dados de uma pessoa na sessão de outra. Mensagens de sessão expirada devem oferecer um caminho claro de retorno sem repetir automaticamente operações sensíveis.

## Casos para testar antes de aprovar

Altere IDs de recursos, use uma sessão expirada, troque de organização, volte após logout e tente duas abas. Simule indisponibilidade do provedor e credenciais revogadas. Confira se logs, telemetria e URLs não carregam tokens ou documentos pessoais.

## Continue estudando

- [BFF e contratos](./system-design-bff-contratos-api.md)
- [Cache isolado por usuário](./system-design-cache-estado-performance.md)
- [Gestão de estado no cliente](./arquitetura-state-management.md)
- [Same-Origin Policy e CORS](./navegador-same-origin-cors.md)
- [Defesas contra XSS e CSP](./navegador-xss-csp.md)
- [CSRF, clickjacking e vazamento de tokens](./navegador-csrf-clickjacking-tokens.md)
