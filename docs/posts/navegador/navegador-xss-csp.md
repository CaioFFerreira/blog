---
title: "XSS e CSP: impedir que dados virem código indevido"
description: "Siga o caminho de um dado até sua exibição e entenda como evitar execução indevida e aplicar uma política de conteúdo."
date: '2026-10-16'
category: 'Navegador'
tags:
  - XSS
  - CSP
  - Segurança
---

Imagine um comentário que deveria aparecer como texto, mas que acaba interpretado como código. **XSS** (*Cross-Site Scripting*) é esse tipo de execução indevida no contexto do site. **CSP** (*Content Security Policy*) é uma política que restringe origens e formas de carregamento ou execução. Vamos seguir o dado até seu uso para entender onde prevenir o problema.

[XSS](https://owasp.org/www-community/attacks/xss/) acontece quando conteúdo controlado por uma parte não confiável acaba executado no contexto da aplicação. O dado pode vir de um formulário, URL, API, armazenamento local ou conteúdo previamente salvo; “veio do nosso servidor” não prova que seja seguro para qualquer uso.

## Siga o dado até o destino

Se a intenção é exibir texto, prefira uma API que não interprete HTML. Exemplo em uma página com `<p id="resultado"></p>`:

```js
const resultado = document.querySelector('#resultado')
const texto = new URLSearchParams(window.location.search).get('texto') ?? ''

if (!(resultado instanceof HTMLElement)) {
  throw new Error('Adicione a área de resultado ao HTML.')
}

resultado.textContent = texto
```

Ao testar `?texto=%3Cstrong%3EOlá%3C%2Fstrong%3E`, a página deve mostrar os caracteres `<strong>Olá</strong>`, sem produzir texto em negrito. O exemplo demonstra um destino de texto; não é um sanitizador universal.

Contextos de HTML, JavaScript, CSS e URL têm regras diferentes. Para um link, por exemplo, também é necessário validar os esquemas aceitos. Escapar texto de HTML não resolve automaticamente um valor usado como URL executável.

## Quando o produto realmente precisa de HTML

Rich text exige uma política e um sanitizador apropriado ao contexto, com configuração e dependências mantidas. Não escreva um filtro de tags com regex para tratar HTML arbitrário.

Templates de frameworks normalmente escapam interpolação textual, mas APIs de HTML bruto e integrações externas podem sair dessa proteção. Revise caminhos como `v-html` e manipulação direta do [DOM](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model). A [orientação de prevenção de XSS da OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html) explica defesas por contexto.

## CSP limita o que o documento pode executar ou carregar

Content Security Policy é uma política enviada normalmente por cabeçalho de resposta. Ela pode restringir fontes de scripts, conexões, estilos e outros recursos. Não substitui a correção da injeção e não torna confiável todo script permitido.

Um modelo de política para uma aplicação hipotética com HTML gerado por resposta:

```http
Content-Security-Policy: default-src 'self'; script-src 'nonce-VALOR_DA_RESPOSTA'; style-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'
```

O placeholder do nonce precisa ser substituído por um valor criptograficamente imprevisível, novo por resposta, associado aos scripts autorizados. Não use esse texto como nonce real nem um valor fixo em um build público. O cache do HTML precisa ser compatível com a geração e distribuição desse valor.

Para HTML estático, hashes de scripts autorizados podem ser uma alternativa, com manutenção ligada ao build. A política precisa considerar estilos, fontes, imagens e conexões realmente usados. Este modelo não foi aplicado ao blog, que possui recursos externos e exigiria inventário próprio.

## Introduza a política com evidência

Uma política `Content-Security-Policy-Report-Only` permite observar violações sem bloquear por aquela política. Use relatórios e testes para preparar o modo de enforcement; Report-Only não oferece o mesmo bloqueio.

Evite resolver tudo adicionando `unsafe-inline`, `unsafe-eval` ou listas amplas de domínios. Uma origem autorizada que permite conteúdo arbitrário pode enfraquecer o resultado. Requisições de relatório também precisam de controle de volume e privacidade.

A [documentação de CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP) detalha diretivas e mecanismos. `frame-ancestors`, por exemplo, não é aplicado por uma meta tag de CSP: entregue-o via cabeçalho.

## Como testar

Comece em ambiente controlado com marcadores inofensivos que deveriam permanecer texto. Teste entradas da URL, dados persistidos e respostas remotas, verificando o destino real de cada valor.

Depois confira Console, cabeçalhos e relatórios da política nos fluxos de erro e sucesso. Verifique que scripts legítimos necessários continuam funcionando e que uma política ausente em uma rota secundária não cria uma lacuna.

O critério de saída é dado não confiável tratado corretamente e política efetivamente entregue, não apenas “nenhum alerta apareceu nesta navegação”.

## Continue estudando

- [CSRF, clickjacking e tokens](./navegador-csrf-clickjacking-tokens.md)
- [Sessão autenticada e autorização](./system-design-autenticacao-seguranca.md)
