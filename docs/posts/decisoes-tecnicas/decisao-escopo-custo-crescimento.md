---
title: 'Decisão técnica: escolher o menor investimento que resolve o problema certo'
description: 'Compare alternativas por resultado, risco, operação e reversibilidade, distinguindo uma entrega de dois dias de uma plataforma de três semanas.'
date: '2026-10-16'
category: 'Decisões técnicas'
tags:
  - Tomada de decisão
  - Escopo
  - Trade-offs
  - Crescimento
---

Pense no pedido “criar relatórios”: ele pode significar exportar uma lista ou construir um editor inteiro. **Escopo** é o conjunto de entregas e limites combinados. Uma **premissa** é algo que assumimos para comparar caminhos. A decisão fica mais clara quando cada opção é avaliada pelo resultado que entrega e pelo trabalho que continuará exigindo.

Gerar uma implementação não responde se ela deve existir. Uma decisão técnica útil conecta uma necessidade do produto às alternativas, explicita o que ainda não sabemos e escolhe como verificar o resultado.

Esta série usa casos hipotéticos. Prazos e cenários não são estimativas deste projeto, e as recomendações dependem das premissas declaradas. Os conceitos de arquitetura continuam nos guias anteriores; aqui, vamos praticar a escolha.

## Troque o pedido de solução pelo resultado necessário

O pedido é “precisamos de um construtor de relatórios”. Pergunte quem usa, quais perguntas precisa responder, com que frequência e quais restrições de dados existem.

Suponha que a necessidade imediata seja exportar uma lista filtrada por uma equipe interna, sem edição livre de colunas. Construir um designer completo atende um problema maior do que o demonstrado.

## Compare opções que realmente possam ser escolhidas

| Alternativa hipotética | Resultado entregue | Custo e limite |
| --- | --- | --- |
| Reusar exportação existente | Lista filtrada com campos permitidos | Depende de validar cobertura e acesso |
| Criar exportação específica | Atende o fluxo conhecido | Menos flexível para pedidos futuros |
| Construir um designer | Variações configuráveis de relatório | Mais desenvolvimento, testes, operação e superfície de acesso |

Imagine que a primeira opção possa ser validada e entregue em dois dias, enquanto o designer seja estimado em três semanas. Os prazos são hipóteses de equipe: confirme dependências, revisão e teste antes de transformá-los em compromisso.

Uma solução mais barata só participa da comparação se atender às restrições obrigatórias. Segurança e integridade não viram pontos compensáveis por velocidade numa média ponderada.

## Inclua custo depois da primeira entrega

Quem resolve incidentes? Quem atualiza dependências? Como o recurso será testado e desativado? Quanto custa mudar a regra de autorização em três consumidores?

Uma ferramenta pronta pode reduzir código e ainda exigir integração, governança e contrato. Um componente próprio pode ser curto e virar uma plataforma interna difícil de manter. Compare o trabalho completo, não apenas linhas geradas.

## Escolha uma hipótese e um limite

Para o cenário descrito, uma decisão defensável seria reusar a exportação existente se os filtros, campos e permissões cobrirem a tarefa. O designer fica fora do escopo atual, com demanda registrada para revisão.

Critérios de aceitação: a equipe obtém o arquivo correto, nenhum campo restrito aparece e o volume esperado não excede o limite validado. Se uma dessas condições falhar, a alternativa precisa ser ajustada ou descartada.

Defina um responsável, um prazo para verificar a hipótese e o custo máximo do experimento. Um spike deve responder uma incerteza concreta, não produzir uma arquitetura paralela sem critério de encerramento.

## “Vai aguentar crescimento?” precisa virar uma pergunta mensurável

Separe aumento de usuários, volume de dados, tráfego simultâneo e número de equipes. Cada crescimento pressiona partes diferentes. Um relatório de cem mil linhas não é resolvido apenas multiplicando réplicas da interface.

Declare o intervalo de carga que precisa ser atendido, identifique a dependência limitante e faça um teste representativo. O [caso do portal e suas estimativas](./system-design-portal-escala.md) explica dimensionamento; o [guia de SQL](./backend-sql-indices.md) ajuda a investigar consultas.

Planeje uma evolução possível e seu gatilho, sem construir capacidade ilimitada antecipadamente. “Vamos revisar quando o tempo de geração ultrapassar o limite acordado em determinada parcela das solicitações” é mais acionável que “vamos escalar quando crescer”.

## Registre o motivo, não apenas o vencedor

Use o [guia de ADRs](./arquitetura-evolucao-overengineering.md) para preservar a decisão. O template `templates/decision.md` deste repositório ajuda a preparar alternativas, restrições e validação antes do registro final.

Uma resposta profissional inclui condições que fariam você mudar de ideia. Isso permite revisar a decisão quando o contexto muda sem tratar a escolha anterior como erro automático.

## Referência para registrar a decisão

Um [ADR — Architecture Decision Record](https://adr.github.io/) é um registro curto de contexto, alternativas, escolha e consequências. Use-o para explicar os compromissos da solução (vantagens e custos), não para transformar toda alteração pequena em um processo burocrático.

## Estudos da série

- [SSR, CSR ou geração estática](./decisao-ssr-csr-estatico.md)
- [React Query ou estado global](./decisao-query-estado-global.md)
- [Front, Backend e dados expostos](./decisao-front-backend-dados.md)
- [Compartilhar sem quebrar produtos](./decisao-produtos-compartilhamento.md)
- [Migrar legado em produção](./decisao-migracao-legado.md)
