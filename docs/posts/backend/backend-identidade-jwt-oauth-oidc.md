---
title: "JWT, OAuth e OIDC: o papel dos tokens no acesso a uma aplicação"
description: "Separe identificação, permissão e formato de token; entenda por que ler uma credencial não é o mesmo que validá-la."
date: '2026-10-16'
category: 'Backend'
tags:
  - JWT
  - OAuth 2.0
  - OIDC
  - Refresh tokens
  - Sessões
---

Imagine entrar num aplicativo usando uma conta de outro serviço. Precisamos distinguir **autenticação** — identificar quem entrou — de **autorização** — definir o que pode ser acessado. Um **token** é um valor usado como parte dessa comunicação. Este artigo organiza o papel de cada sigla antes de discutir como conferir um token.

[JWT](https://www.rfc-editor.org/rfc/rfc7519.html), OAuth e [OIDC](https://openid.net/specs/openid-connect-core-1_0.html) não são três nomes para a mesma solução. Um descreve um formato; outro, um framework de autorização; o terceiro acrescenta uma camada de identidade.

O [guia de autenticação do portal](./system-design-autenticacao-seguranca.md) já descreve o login com [BFF](https://learn.microsoft.com/en-us/azure/architecture/patterns/backends-for-frontends), cookie, autorização e logout. Aqui, o foco é o papel dos tokens e as responsabilidades do servidor.

## Um mapa de conceitos

| Conceito | Papel |
| --- | --- |
| Sessão | Relacionar requisições a um contexto de acesso com validade definida |
| JWT (*JSON Web Token*) | Representar declarações sobre uma identidade ou contexto (*claims*) em um formato padronizado, com mecanismos de proteção |
| [OAuth 2.0](https://www.rfc-editor.org/rfc/rfc6749.html) | Delegar acesso a recursos por meio de fluxos e tokens |
| OIDC (*OpenID Connect*) | Autenticação e informação de identidade sobre OAuth 2.0 |
| Access token | Credencial destinada a acessar recursos dentro do contrato de emissão |
| Refresh token | Credencial apresentada ao servidor de autorização para renovar acesso |

JWT não é obrigatório em todo OAuth. Uma sessão pode usar um identificador **opaco**, cujo conteúdo o cliente não interpreta; um access token também pode ter esse formato. A aplicação apresenta o valor conforme o contrato, sem tentar deduzir dele todas as permissões.

## Decodificar JWT não é validá-lo

Um JWT assinado normalmente pode ser lido por quem o recebe; assinatura não é criptografia do conteúdo da mensagem. Não coloque segredos no conteúdo supondo que o formato os esconde. Há também formatos com criptografia, com outro contrato de processamento.

A API que aceita o token precisa verificar sua proteção com algoritmos permitidos e chaves confiáveis, além das claims exigidas: emissor (quem o emitiu), audiência (a quem se destina), validade e outras condições do perfil adotado. Nunca escolha cegamente o algoritmo ou um destino de chave indicado por uma entrada não confiável.

Use uma biblioteca e a configuração apropriada ao provedor; um exemplo artesanal de decodificação criaria uma falsa sensação de segurança. A [RFC 7519](https://www.rfc-editor.org/rfc/rfc7519.html) define o formato, e as regras seguras de uso dependem também do perfil e das recomendações atuais.

## ID token e access token têm destinatários diferentes

No OIDC, o ID token comunica o resultado de autenticação ao cliente previsto pelo protocolo. Ele não é automaticamente a credencial adequada para chamar qualquer API.

Uma API valida o access token que foi emitido para seu contexto e aplica autorização. Mesmo um token válido não prova que a pessoa pode ler qualquer documento cujo ID conheça. A [especificação OIDC Core](https://openid.net/specs/openid-connect-core-1_0.html) detalha o papel da identidade e suas validações.

## Refresh token não é uma sessão eterna

O servidor de autorização define validade, revogação e mecanismos de proteção. Clientes públicos exigem cuidados específicos; recomendações atuais incluem proteção contra reutilização por rotação ou vinculação criptográfica do token ao cliente que o apresenta, conforme o modelo aplicável. A [RFC 9700](https://www.rfc-editor.org/rfc/rfc9700.html) consolida práticas de segurança OAuth.

Na rotação, renovar pode invalidar o token anterior e produzir outro. Duas renovações concorrentes da mesma sessão podem gerar conflito; coordene a operação e siga a política do provedor para detecção de reutilização. Não trate qualquer rejeição como motivo para tentar renovar sem limite.

Um refresh token vai ao endpoint apropriado do servidor de autorização, não a cada endpoint de negócio. No modelo BFF da série, ele pode permanecer no servidor, fora do JavaScript entregue ao cliente.

## Revogação muda o equilíbrio entre vantagens e custos

Validar assinatura localmente reduz algumas consultas, mas não torna revogação imediata gratuita. Tokens podem continuar válidos até expirar se a API não consulta outro estado ou mecanismo. Introspecção, sessões, listas de revogação e tokens curtos têm custos e garantias diferentes.

Rotação de chaves também exige uma estratégia para cache e atualização do conjunto confiável. Um `kid` ajuda a identificar uma chave; não deve permitir selecionar qualquer material externo.

## Perguntas para um desenho real

Quem emite e quem valida cada token? Para qual audiência? Onde são guardados? Como renovam e expiram? O que acontece no logout e após revogação? Como duas abas e uma API indisponível afetam o fluxo?

As escolhas de armazenamento e os caminhos de vazamento estão no [guia de tokens no navegador](./navegador-csrf-clickjacking-tokens.md). Não existe um local universalmente seguro que dispense esse modelo de ameaça.
