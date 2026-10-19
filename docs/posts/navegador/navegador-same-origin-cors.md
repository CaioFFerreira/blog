---
title: 'Same-Origin Policy e CORS: o que o navegador permite ler'
description: 'Diferencie origem de site, entenda preflight e credenciais e diagnostique bloqueios sem tratar CORS como autenticação ou proteção contra CSRF.'
date: '2026-10-16'
category: 'Navegador'
tags:
  - Same-Origin Policy
  - CORS
  - Segurança
---

Uma **origem** combina protocolo, nome do host e porta. Por exemplo, `https://site.exemplo` e `https://api.exemplo` são origens diferentes. **CORS** (*Cross-Origin Resource Sharing*) é um mecanismo em que o servidor informa quais respostas podem ser compartilhadas com código de outra origem. A decisão de permitir a leitura no navegador é diferente de autenticar ou autorizar uma operação.

Uma chamada funciona no servidor ou no curl, mas falha no navegador. Isso pode acontecer porque o navegador aplica regras de acesso entre origens que não são controles gerais de autorização da API.

## Origem não é apenas o domínio

Origem combina esquema, host e porta efetiva. `https://portal.example.com` e `https://api.example.com` são origens diferentes. Dois caminhos na mesma origem não criam isolamento. [HTTP](https://www.rfc-editor.org/rfc/rfc9110.html) e HTTPS também não são a mesma origem.

“Site”, usado em políticas como [SameSite](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#samesitesamesite-value) de [cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies), tem outra definição, relacionada ao domínio registrável e ao esquema. Dois subdomínios podem ser same-site e cross-origin ao mesmo tempo. Não use esses termos como sinônimos.

A [Same-Origin Policy](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy) restringe principalmente determinados acessos e leituras entre origens. Ela não impede toda navegação, todo embedding ou todo envio de requisição para outro host.

## CORS permite compartilhar certas respostas

Suponha que a página está em `https://portal.example.com` e usa uma API própria em outra origem:

```js
async function buscarPerfil() {
  const response = await fetch('https://api.example.com/profile', {
    credentials: 'include',
  })

  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

buscarPerfil().then(console.log).catch(console.error)
```

Os domínios são fictícios. Para expor essa resposta com credenciais à origem permitida, a API precisaria de uma configuração equivalente a:

```http
Access-Control-Allow-Origin: https://portal.example.com
Access-Control-Allow-Credentials: true
Vary: Origin
```

`Vary: Origin` é relevante quando a resposta depende do Origin recebido. A origem deve vir de uma lista explícita de valores permitidos confiável; não reflita qualquer valor com credenciais. `*` não serve como origem autorizada para uma resposta exposta com credenciais.

`credentials: 'include'` não força envio de cookies bloqueados por SameSite ou políticas do navegador. [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS) e elegibilidade de cookies são verificações diferentes.

## Preflight: uma consulta antes da operação

Certos métodos e cabeçalhos provocam uma requisição OPTIONS prévia. Por exemplo, um POST com `Content-Type: application/json` ou um cabeçalho Authorization normalmente exige preflight em uma chamada cross-origin.

O navegador informa origem, método e cabeçalhos pretendidos. O servidor precisa permitir os elementos apropriados, e a resposta da operação real também precisa dos cabeçalhos CORS necessários. Autorizar OPTIONS não autoriza a operação de negócio.

Uma requisição elegível sem preflight ainda pode chegar ao servidor antes de o navegador bloquear a leitura da resposta. Por isso, CORS não é proteção contra [CSRF](https://owasp.org/www-community/attacks/csrf). A [documentação de CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS) detalha os critérios e o protocolo.

## no-cors não resolve acesso a JSON

`mode: 'no-cors'` pode produzir uma resposta opaca, cujo corpo e status não ficam disponíveis para o JavaScript da forma necessária ao consumo normal da API. Ele também restringe o que a requisição pode expressar.

Se você controla a API, configure a política correta. Se há um [BFF](https://learn.microsoft.com/en-us/azure/architecture/patterns/backends-for-frontends) autorizado para essa integração, avalie usá-lo. Um proxy aberto que aceita qualquer destino pode introduzir outro problema de segurança.

## Roteiro de diagnóstico

1. Compare as origens reais, incluindo redirecionamentos e portas.
2. Veja se o preflight aconteceu e qual resposta recebeu.
3. Inspecione cabeçalhos da resposta final e dos erros, não apenas do sucesso.
4. Verifique envio de credenciais separadamente da exposição da resposta.
5. Confirme autorização no servidor mesmo após CORS estar correto.

Não desative a proteção do navegador como solução de produto. Um servidor de desenvolvimento com proxy pode facilitar testes, mas produção precisa de um desenho explícito.

## Continue estudando

- [CSRF, clickjacking e vazamento de tokens](./navegador-csrf-clickjacking-tokens.md)
- [BFF e contratos](./system-design-bff-contratos-api.md)
