---
title: 'Uma suíte que continua útil: cobertura, flakiness e custo de manutenção'
description: 'Avalie quais falhas a suíte detecta, investigue instabilidade e retire testes que protegem detalhes acidentais em vez de comportamento importante.'
date: '2026-10-16'
category: 'Testes'
tags:
  - Cobertura
  - Flakiness
  - CI
  - Manutenção
---

**Cobertura** indica quais partes do código foram exercitadas pelos testes; ela não diz, sozinha, se o resultado correto foi conferido. Um teste **instável**, também chamado *flaky*, passa ou falha sem uma mudança relevante no comportamento esperado. Vamos investigar essas situações antes de confiar numa porcentagem alta ou repetir uma execução até ela passar.

Uma suíte deixa de inspirar confiança quando falha sem diagnóstico, demora demais ou exige reescrever dezenas de testes após uma refatoração que preservou o comportamento.

Manter testes é trabalho de engenharia: escolha sinais úteis, remova ruído e verifique o que uma execução verde realmente significa.

## Cobertura aponta lacunas; não mede toda a qualidade

Cobertura de linha mostra execução, não se o resultado foi corretamente verificado. Uma função pode ter todas as linhas executadas por um teste que não identifica uma decisão errada.

Cobertura de branches ajuda a encontrar caminhos não exercitados. Ainda assim, duas execuções podem cobrir o mesmo ramo com dados que não distinguem os limites relevantes. Use o relatório para perguntar o que falta, não como substituto de uma análise de risco.

Na [regra de acesso do guia unitário](./testes-unitarios-vitest-jest.md), negar outra organização e permitir a correta importam por causa do contrato. Remover uma dessas verificações e observar se a suíte falha é mais informativo que apenas aumentar a porcentagem.

## Reconheça sinais de testes frágeis

Um **snapshot** de teste é um registro de uma saída usado para comparar execuções futuras. Um snapshot enorme pode mudar por uma classe sem importância e esconder uma alteração de comportamento. Uma query por posição no [DOM](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model) pode quebrar ao reorganizar a apresentação. Uma asserção sobre estado privado pode falhar quando a implementação melhora sem alterar o resultado.

Snapshots e testes visuais têm usos legítimos quando a estrutura ou aparência é o contrato e as diferenças são revisadas. O problema é aprovar atualizações em massa sem interpretar o que mudou.

Da mesma forma, verificar o nome de um botão pode ser valioso para um contrato de acessibilidade; verificar apenas texto estático sem relação com uma ação costuma ter retorno pequeno.

## Flakiness precisa de diagnóstico

Se o mesmo cenário alterna entre sucesso e falha sem mudança relevante, investigue sincronização, dados compartilhados, relógio, ordem de execução, rede e recursos do ambiente. Nem toda falha rara é um defeito do teste: ela pode revelar uma condição de corrida real do produto.

Use traces, logs e contexto de versão sanitizados. Espere por resultados observáveis, não por um sleep cada vez maior. Um teste só passar após aumentar o timeout não explica sua causa.

Retries do runner ajudam a coletar evidência ou tolerar uma condição conhecida, mas podem esconder regressões. Monitore o sucesso na primeira tentativa e abra um trabalho com dono para a instabilidade. Quarentena precisa de prazo e rastreamento; ignorar para sempre não é corrigir.

## Dados independentes e ambiente previsível

Cada cenário deve preparar suas precondições sem depender da execução anterior. Não use a mesma conta mutável em vários testes paralelos se eles alteram os mesmos dados.

Use seeds, identificadores únicos e limpeza conforme a estratégia do ambiente. Quando o relógio ou a expiração fazem parte da regra, controle-os de forma explícita no nível adequado. Um teste E2E que depende do dia do mês pode falhar por mudança de calendário, não pelo deploy.

## Distribua o feedback no CI

Checks rápidos podem rodar em toda mudança; cenários amplos podem exigir outra distribuição conforme tempo e risco. Dividir o pipeline não autoriza publicar antes de um check obrigatório de segurança ou de negócio terminar.

Registre qual conjunto foi executado e retenha artefatos com acesso e duração apropriados. Traces e storage states podem expor sessão e dados; não trate todo relatório como material público.

O [guia de CI/CD](./devops-ci-cd-actions-gitlab.md) concentra jobs, artefatos e permissões. Este blog continua sem um runner de testes instalado: os artigos não criam checks fictícios no workflow.

## Uma revisão periódica da suíte

Para cada teste custoso ou frequentemente alterado, responda:

- Qual defeito plausível e relevante ele detecta?
- Qual parte é real e qual foi substituída?
- Outro teste já verifica a mesma fronteira com confiança equivalente?
- Ele falharia com uma implementação errada ou só com uma mudança interna?
- Sua duração e manutenção justificam o risco protegido?

Consolide testes equivalentes e retire os que perderam a finalidade, preservando a evidência importante. Uma redução de quantidade pode melhorar a qualidade da suíte.

## Limites que continuam exigindo avaliação humana

Teste automatizado não substitui exploração de fluxos novos, revisão de ameaça e experiência com tecnologia assistiva. Para acessibilidade, siga o [roteiro de teclado, leitor de tela e axe](./acessibilidade-testes-screen-readers-axe.md), em vez de interpretar um teste de DOM como auditoria completa.

Uma execução verde significa que os cenários e checks selecionados passaram naquele contexto. A decisão de publicar considera também as lacunas conhecidas e o risco da mudança.

## Referências

- [Cobertura no Vitest](https://vitest.dev/guide/coverage)
- [Práticas de testes de navegador — Playwright](https://playwright.dev/docs/best-practices)
