---
title: 'CSR, SSR e prerender no Angular: da escolha à hidratação'
description: 'Associe modos de renderização às rotas e evite diferenças entre HTML do servidor e primeira renderização no navegador.'
date: '2026-10-16'
category: 'Angular'
tags:
  - SSR
  - SSG
  - Hydration
---

**Renderizar** é produzir a representação que será exibida. No **CSR**, o navegador monta a interface; no **SSR**, o servidor gera o HTML da requisição; na geração estática, o HTML é preparado antes da visita. **Hidratação** é a etapa em que o Angular conecta sua lógica ao HTML recebido para tornar a página interativa.

A escolha entre renderização cliente, servidor e estática depende da rota. Os critérios gerais estão em [SSR, CSR ou estático](./decisao-ssr-csr-estatico.md); este guia trata das consequências no Angular.

## Três momentos diferentes

**CSR** monta a interface no navegador. Pode atender bem uma área autenticada, mas o carregamento inicial depende do JavaScript e das consultas necessárias. **SSR** produz HTML durante uma requisição ao servidor e exige infraestrutura, controle de tempo de resposta e isolamento entre usuários. **SSG/prerender** produz HTML no build: é adequado a conteúdo conhecido antecipadamente, com uma estratégia definida para atualizar páginas.

Angular permite configurar renderização por rota com as APIs de server routing da versão adotada. Uma aplicação pode pré-renderizar conteúdo público, renderizar páginas dinâmicas no servidor e deixar um painel em CSR. Não é preciso impor uma decisão única a todas as rotas.

## Hidratação reaproveita, não elimina JavaScript

Ao receber HTML do servidor, o cliente precisa associá-lo à árvore da aplicação e habilitar interação. [Hidratação](https://angular.dev/guide/hydration) reutiliza o [DOM](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model) existente quando cliente e servidor concordam sobre a estrutura inicial. Ela não torna uma aplicação pesada automaticamente leve nem remove a necessidade de carregar código.

Na configuração que usa SSR, `provideClientHydration` de `@angular/platform-browser` habilita a infraestrutura correspondente; o setup gerado pelo CLI pode já incluí-la. Siga a configuração da sua versão antes de duplicar [providers](https://angular.dev/guide/di/dependency-injection-providers). Recursos como event replay ou hidratação incremental têm requisitos próprios.

## Quando o HTML do servidor e o do cliente não combinam

- HTML inválido que o navegador corrige antes da hidratação.
- Bibliotecas que alteram o DOM diretamente antes de Angular assumir a view.
- Datas, números aleatórios ou conteúdo localizado diferentes entre servidor e cliente.
- Condições que produzem árvores diferentes na primeira renderização.

Não esconda todo mismatch com `ngSkipHydration`. Identifique a diferença e limite exceções a componentes com integração realmente incompatível. Acesso a [`localStorage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage), tamanho da tela e geolocalização deve ocorrer no navegador no momento apropriado, sem mudar arbitrariamente a estrutura inicial.

## Segurança e cache fazem parte do desenho

Estado mutável global no processo de SSR pode vazar dados entre requisições. Não compartilhe identidade de usuário em singletons externos ao escopo correto. HTML personalizado não deve entrar em cache público indiscriminado.

Transferir dados da resposta do servidor ao cliente pode evitar consultas duplicadas, mas não serializa segredos com segurança: o conteúdo enviado ao navegador fica acessível ao usuário. Avalie o comportamento do [HTTP](https://www.rfc-editor.org/rfc/rfc9110.html) transfer cache para requisições autenticadas, cabeçalhos e endpoints sensíveis.

## Exercício

Escolha uma página pública e um painel autenticado. Registre por que cada modo atende aos requisitos. Com SSR, teste acesso direto, refresh, interação antes e depois da hidratação e ausência de dados de outro usuário no HTML. Meça carregamento e responsividade: ver conteúdo cedo não garante uma página interativa cedo.

Referências: [renderização no servidor](https://angular.dev/guide/ssr) e [hidratação](https://angular.dev/guide/hydration).
