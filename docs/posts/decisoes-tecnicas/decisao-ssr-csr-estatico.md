---
title: 'Devemos fazer SSR? Decidir pela jornada, não pela moda'
description: 'Compare geração estática, renderização no cliente e SSR em cenários concretos, incluindo conteúdo público, personalização, hidratação e operação.'
date: '2026-10-16'
category: 'Decisões técnicas'
tags:
  - SSR
  - CSR
  - SSG
  - Trade-offs
---

Quando uma página abre, alguém precisa produzir seu HTML. Isso pode ocorrer antes da visita, na **geração estática**; no servidor a cada requisição, com **SSR** (*Server-Side Rendering*); ou no navegador, com **CSR** (*Client-Side Rendering*). A escolha muda quando o conteúdo fica disponível e qual trabalho cada parte precisa executar.

A pergunta “devemos fazer [SSR](https://developer.mozilla.org/en-US/docs/Glossary/SSR)?” fica incompleta sem dizer qual página, qual conteúdo inicial e qual problema queremos resolver. Uma aplicação não precisa usar o mesmo modo de renderização em todas as jornadas.

## Caso 1: um blog com conteúdo conhecido no build

Neste projeto, artigos Markdown podem ser transformados em HTML antes da visita. A geração estática atende esse conteúdo sem executar um servidor de renderização por requisição. Busca local e progresso de estudo podem ganhar interatividade no navegador.

Recomendação para esse cenário: manter geração estática enquanto publicação por build e conteúdo público cobrirem o produto. Um requisito futuro de resposta personalizada no primeiro HTML exigiria outra análise, mas não torna a escolha atual insuficiente por antecipação.

## Caso 2: catálogo público com atualização frequente

Se o catálogo precisa de conteúdo inicial acessível a mecanismos de descoberta e clientes lentos, compare renderização por requisição com estratégias de geração e atualização de páginas suportadas pela plataforma.

Defina a validade aceitável: o título pode ficar alguns minutos antigo, mas preço e disponibilidade exigem confirmação atual antes da compra? Essa divisão evita renderizar toda informação em tempo real apenas porque um campo tem requisito mais forte.

SSR pode produzir conteúdo inicial com dados da requisição, mas introduz dependências antes da resposta. Cache público e dados personalizados precisam permanecer corretamente separados.

## Caso 3: um editor autenticado e altamente interativo

Se o valor principal aparece depois de carregar um documento privado e interagir intensamente, uma arquitetura com execução no cliente pode ser suficiente. Não dispense a medição de carregamento: uma área autenticada também pode se beneficiar de conteúdo inicial mais rápido.

Recomendação condicional: mantenha [CSR](https://developer.mozilla.org/en-US/docs/Glossary/CSR) se a jornada atende os objetivos medidos e a operação simples tem valor. Teste SSR apenas se houver um gargalo ou requisito que ele tenha chance concreta de resolver.

## Critérios de comparação

| Pergunta | Por que muda a decisão |
| --- | --- |
| O conteúdo é igual para todos e conhecido antes da visita? | Favorece avaliar geração estática |
| O primeiro HTML precisa de dados da requisição? | Pode justificar execução no servidor |
| Qual é a idade aceitável dos dados? | Define oportunidades de cache e atualização |
| O problema é conteúdo inicial ou resposta a interações? | SSR não elimina automaticamente CPU no cliente |
| Quem opera o ambiente de execução e suas dependências? | Acrescenta custo e pontos de falha |

Os mecanismos e restrições de SSR estão na [documentação do Vue](https://vuejs.org/guide/scaling-up/ssr.html). A avaliação deve considerar também a ferramenta e a hospedagem realmente escolhidas.

## HTML pronto não significa interação pronta

Hidratação pode continuar exigindo JavaScript e trabalho de CPU. Uma página pode apresentar o conteúdo e ainda demorar a responder. Desalinhamento entre HTML inicial e estado do cliente também pode produzir problemas.

Teste o fluxo sem depender apenas da aparência do primeiro frame. O [caminho de renderização no navegador](./navegador-url-renderizacao.md) explica as etapas; o [guia de Core Web Vitals](./performance-core-web-vitals.md) fornece os instrumentos de avaliação.

## Um experimento comparável

Escolha uma rota representativa. Mantenha conteúdo, dispositivo e rede equivalentes e compare tempo até conteúdo útil, interatividade, bytes, trabalho de CPU e latência do servidor. Inclua uma falha de API necessária à renderização.

Teste usuários diferentes para detectar mistura de dados por cache ou estado compartilhado no servidor. Não aceite um ganho em página pública como prova de segurança na área autenticada.

## Como defender a recomendação

Escreva: “para esta jornada e estas condições, escolhemos esta estratégia porque atende os objetivos com estes custos; vamos revisar se esta evidência mudar”. Evite prometer que SSR melhora qualquer página ou que SSG impede interatividade.
