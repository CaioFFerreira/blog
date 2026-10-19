---
title: 'O que vale a pena testar: risco, comportamento e nível de confiança'
description: 'Escolha unitários, integração e E2E a partir da falha que precisa detectar, evitando cobertura que cresce sem proteger a pessoa usuária.'
date: '2026-10-16'
category: 'Testes'
tags:
  - Estratégia de testes
  - Unit
  - Integration
  - E2E
---

Uma **suíte** é um conjunto de testes; uma **asserção** é a verificação de um resultado esperado. Pense numa compra: calcular o desconto errado ou aceitar um pagamento sem permissão tem consequências diferentes de mudar um espaçamento. Uma estratégia escolhe quais comportamentos verificar e em qual nível, considerando tanto o risco quanto o custo de manter a verificação.

Uma suíte útil torna uma falha importante difícil de passar despercebida. Seu valor não é o número de asserções, mas a confiança que acrescenta diante do custo de escrever, executar e manter os testes.

Comece pela pergunta: **se esse comportamento quebrar, qual prejuízo acontece e qual teste detecta isso de forma confiável?**

## Unit, integration e E2E são escopos diferentes

```text
Unit: regra ou unidade com dependências controladas
  ↓
Integration: partes reais colaborando numa fronteira definida
  ↓
E2E: uma jornada atravessando o sistema pelo ambiente escolhido
```

O desenho indica ampliação de escopo, não uma sequência obrigatória de execução nem uma porcentagem universal de testes. Uma suíte não precisa reproduzir cada caso em todos os níveis.

| Risco | Primeiro nível a considerar | Evidência procurada |
| --- | --- | --- |
| Regra de permissão decide incorretamente | Unit da regra | Combinações relevantes de identidade e acesso |
| Formulário não envia os dados corretos | Integração da UI | Interação, envio e feedback observável |
| API entrega documento a outra pessoa | Integração/API com autorização real | Negação antes de expor o recurso |
| Sessão não funciona após navegação | E2E | Jornada com [cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies), rotas e backend compatíveis |
| Layout crítico quebra em navegador suportado | Teste de browser apropriado | Comportamento ou regressão visual relevante |

Esses são pontos de partida. A nomenclatura pode variar entre equipes; documente o que cada teste realmente inclui.

## Permissão é um bom exemplo de risco distribuído

“Sem permissão, o sistema bloqueia” pode exigir mais de uma evidência: o servidor nega o acesso, dados protegidos não chegam ao cliente e a interface oferece uma mensagem e um caminho de retorno.

Testar somente que o botão foi escondido não comprova segurança. Testar somente uma função local também não comprova que o endpoint a utiliza. Escolha testes complementares para fronteiras diferentes, sem repetir toda a matriz de casos no E2E.

O desenho da autorização está no [guia de segurança e sessão](./system-design-autenticacao-seguranca.md). Esta série trata de como verificar o contrato, não de redefini-lo.

## Texto de botão não é sempre um teste inútil

Um teste isolado que monta o componente e confirma uma string constante costuma acrescentar pouca confiança. Mas o nome acessível de uma ação, uma mensagem obrigatória ou a orientação após uma falha podem ser contratos importantes.

Buscar “Salvar” para executar o fluxo e verificar persistência é diferente de testar apenas que a palavra está no [DOM](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model). O valor depende de qual regressão a asserção detecta.

## Escreva o cenário antes da ferramenta

Uma descrição útil contém contexto, ação e resultado:

> Dada uma sessão sem acesso ao documento, ao abrir sua URL diretamente, a API nega a leitura e a página informa a restrição sem exibir o conteúdo.

Compare com “testar DocumentPage”. O primeiro enunciado orienta dados, fronteiras, observações e o nível necessário.

## Priorize falhas e limites relevantes

Inclua caminhos de negação, envio duplicado quando há efeito sensível, resultado vazio versus falha e respostas atrasadas quando podem corromper a tela. Não multiplique combinações que exercitam a mesma regra sem acrescentar distinção.

Para uma função simples de formatação, poucos exemplos e limites podem bastar. Para uma operação financeira, falhas de rede e reconciliação têm impacto maior que snapshots extensos de marcação.

## Quando não adicionar outro teste?

Quando ele apenas espelha a implementação, confirma algo já protegido na mesma fronteira ou custa mais que o risco de uma mudança reversível e pequena. Revise também se o código exige tantos mocks por falta de uma responsabilidade clara.

Uma boa revisão pergunta: qual defeito plausível faria este teste falhar? Se a única resposta é “renomear um método interno”, talvez ele esteja protegendo a estrutura errada.

## Roteiro da série

1. [Unitários com Vitest e Jest](./testes-unitarios-vitest-jest.md)
2. [Integração de UI com Testing Library](./testes-integracao-testing-library.md)
3. [E2E com Playwright e Cypress](./testes-e2e-playwright-cypress.md)
4. [Mocks, contratos e assincronismo](./testes-mocks-contratos-assincronismo.md)
5. [Cobertura, flakiness e manutenção](./testes-manutencao-cobertura-ci.md)

## Referências relacionadas

- [Princípios da Testing Library](https://testing-library.com/docs/guiding-principles/)
- [Boas práticas do Playwright](https://playwright.dev/docs/best-practices)
