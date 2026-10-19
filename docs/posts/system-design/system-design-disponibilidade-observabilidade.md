---
title: "Disponibilidade e observabilidade: descobrir se a tarefa realmente funcionou"
description: "Relacione sinais técnicos às tarefas do cliente para detectar falhas, investigar sua causa e planejar recuperação."
date: '2026-10-16'
category: 'System Design'
tags:
  - Disponibilidade
  - Observabilidade
  - SLO
  - Trade-offs
---

**Disponibilidade** descreve em que medida o serviço pode ser usado conforme o objetivo definido. **Observabilidade** é conseguir investigar seu funcionamento a partir de sinais, como métricas, logs e rastros de requisições. Pense numa reclamação “não consigo baixar minha fatura”: precisamos descobrir a jornada afetada e seguir suas etapas, mesmo que o servidor ainda responda.

Um servidor pode responder 200 enquanto a pessoa vê uma tela vazia por erro de JavaScript. Uma CDN pode estar saudável enquanto pagamentos estão indisponíveis. A unidade mais útil para discutir confiabilidade é a jornada do cliente, não apenas uma máquina ou endpoint.

## Defina o que será considerado bom

[SLI](https://sre.google/sre-book/service-level-objectives/) (*Service Level Indicator*) é um indicador de nível de serviço; **SLO** (*Service Level Objective*) é o objetivo acordado para ele em um período. **SLA** (*Service Level Agreement*) é um acordo de nível de serviço com consequências contratuais e não deve ser confundido com um alvo interno. O [capítulo de SLOs do Google SRE](https://sre.google/sre-book/service-level-objectives/) apresenta esses conceitos.

No exercício, podemos propor um SLI para abertura de documentos: proporção de solicitações elegíveis que alcançam o arquivo correto dentro do prazo acordado. Precisamos definir denominador, exclusões, fonte e como falhas de autorização legítimas serão classificadas.

O prazo e a meta são decisões do produto e da operação. Não copie “99,99%” sem avaliar custo, dependências e capacidade de resposta a incidentes.

## Um orçamento de erro ilustrativo

```text
Meta hipotética:                 99,9% de operações elegíveis boas
Operações na janela:            1.000.000
Fração permitida de operações ruins: 0,1%
Orçamento correspondente:       1.000 operações ruins
```

Este exemplo é baseado em eventos, não em minutos de indisponibilidade. Misturar os dois modelos pode esconder o impacto de períodos com tráfego maior. Uma exclusão precisa de justificativa estável, não ser criada depois de uma falha para melhorar a porcentagem.

## Colete sinais complementares

**Métricas** resumem medidas, como quantidade de erros e tempos de resposta. **Logs** registram acontecimentos com contexto. **Traces**, ou rastros, relacionam as etapas de uma operação entre componentes para mostrar onde ela passou e quanto cada etapa demorou. O [modelo de sinais do OpenTelemetry](https://opentelemetry.io/docs/concepts/signals/) ajuda a estruturar essa instrumentação.

No navegador, acompanhe falhas de inicialização, erros de jornada e [Core Web Vitals](./performance-core-web-vitals.md). No [BFF](https://learn.microsoft.com/en-us/azure/architecture/patterns/backends-for-frontends), observe latência, tráfego, erros e saturação. Nas filas, idade do item mais antigo e tempo até conclusão podem revelar um gargalo que a taxa de resposta [HTTP](https://www.rfc-editor.org/rfc/rfc9110.html) não mostra.

Não use médias como único resumo. Observe percentis e recortes relevantes, lembrando que percentis agregados não são calculados pela média dos percentis de cada instância.

## Correlacione sem vazar dados

Um identificador de requisição pode aparecer na resposta e no suporte, associado a um trace no servidor. Valide dados de correlação recebidos; um ID não deve conceder acesso a detalhes internos.

Não registre tokens, [cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies), números de documentos ou URLs assinadas. Evite usar cada ID de usuário como uma etiqueta de métrica. Isso produz muitas combinações distintas, problema chamado **alta cardinalidade**, que pode aumentar custo e dificultar a operação. Logs e traces têm requisitos de acesso, retenção e amostragem.

Telemetria do navegador pode ser bloqueada, falhar ou representar uma amostra enviesada. Combine **RUM** (*Real User Monitoring*, medições da experiência de visitantes reais), verificações sintéticas (fluxos executados de forma controlada) e sinais do servidor; nenhuma fonte isolada descreve toda a experiência.

## Disponibilidade exige isolamento e recuperação

Uma falha de notificações pode mostrar um aviso local sem bloquear documentos. Um processador financeiro indisponível deve impedir uma confirmação falsa, mesmo que isso reduza a funcionalidade disponível.

Use timeouts coerentes, limites de concorrência e proteção contra saturação. Um [circuit breaker](https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker) pode interromper chamadas a uma dependência degradada e testar recuperação; não corrige o serviço e precisa de política e observação.

Réplicas em zonas diferentes ajudam contra certas falhas, mas dependências comuns, deploy e banco continuam podendo derrubar tudo. Recuperação de dados também precisa de metas: **RTO** (*Recovery Time Objective*) é o objetivo de tempo para recuperar o serviço; **RPO** (*Recovery Point Objective*) define quão antigo pode ser o ponto de dados recuperado, expressando a perda tolerada em tempo. Backup sem teste de restauração não comprova recuperação.

## Planeje mudanças e incidentes

Publicação gradual, sinais por versão e rollback reduzem o impacto de uma regressão quando o sistema permite essas estratégias. Rollback de front-end não desfaz automaticamente uma mudança incompatível de API ou esquema; mantenha contratos e plano de migração.

Um runbook deve explicar como identificar a jornada afetada, limitar dano e escalar para quem possui a dependência. Alertas precisam indicar ação; centenas de notificações sem prioridade atrasam a resposta.

Considere alertas relacionados ao consumo acelerado do orçamento de erro, em vez de apenas CPU alta. Uma CPU ocupada pode ser normal; clientes incapazes de pagar precisam de atenção conforme o impacto e o objetivo definido.

## Um ensaio de falha para a equipe

Em ambiente controlado, torne notificações indisponíveis, atrase uma dependência e publique uma versão que falhe no carregamento. Verifique detecção, identificação da versão, comportamento degradado e recuperação.

Registre o que o cliente viu, o tempo para detectar e as lacunas de diagnóstico. O exercício fecha a proposta de System Design: não basta desenhar como o sistema funciona quando tudo está saudável.

## Continue estudando

- [Desenho completo do portal](./system-design-portal-escala.md)
- [Tratamento de falhas e pagamentos](./system-design-erros-retry-pagamentos.md)
- [Decisões arquiteturais e vantagens e custos](./arquitetura-evolucao-overengineering.md)
