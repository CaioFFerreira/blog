---
title: "Transações e concorrência: quando duas pessoas reservam o mesmo item"
description: "Acompanhe uma disputa pela última unidade e entenda como confirmar, desfazer e coordenar mudanças no banco."
date: '2026-10-16'
category: 'Backend'
tags:
  - Transações
  - Concorrência
  - SQL
---

**Concorrência** acontece quando operações avançam em períodos que se sobrepõem, como duas reservas do mesmo produto. Uma **transação** agrupa mudanças no banco para que sejam confirmadas ou desfeitas em conjunto. Para experimentar os comandos abaixo, use um banco PostgreSQL de estudo e familiarize-se primeiro com [tabelas e SQL](./backend-sql-indices.md).

Duas pessoas tentam reservar a última unidade. Se o backend lê “há uma disponível” e depois grava “agora são zero”, as duas podem passar pela leitura antes da escrita. A correção depende do banco e da coordenação, não da velocidade do clique.

## Transação reúne mudanças locais

Dentro de uma transação, mudanças podem ser confirmadas por `COMMIT` ou descartadas por `ROLLBACK`. Atomicidade significa que a unidade transacional não deve aparecer parcialmente confirmada.

Exemplo para executar num banco PostgreSQL de estudo. `BEGIN` abre a transação; `UPDATE` altera a linha; `ROLLBACK` desfaz essa alteração; `SELECT` consulta o valor que permaneceu:

```sql
CREATE TABLE inventory (
  sku TEXT PRIMARY KEY,
  available INTEGER NOT NULL CHECK (available >= 0)
);

INSERT INTO inventory (sku, available) VALUES ('course-seat', 1);

BEGIN;
UPDATE inventory SET available = 0 WHERE sku = 'course-seat';
ROLLBACK;

SELECT available FROM inventory WHERE sku = 'course-seat';
```

O resultado é `1`: a alteração foi revertida. Isso demonstra rollback, não resolve sozinho a disputa entre reservas. Consulte a [introdução a transações do PostgreSQL](https://www.postgresql.org/docs/current/tutorial-transactions.html).

## Evite separar uma condição crítica da escrita

Uma atualização condicional pode reduzir a janela entre verificar e modificar:

```sql
UPDATE inventory
SET available = available - 1
WHERE sku = 'course-seat' AND available > 0
RETURNING sku, available;
```

Se uma linha foi retornada, a instrução decrementou a unidade. Se nenhuma foi retornada, o backend não deve tratar a reserva como aceita. No caso simples do PostgreSQL em **Read Committed**, nível em que as consultas leem dados confirmados antes de seu início, atualizações concorrentes nessa linha são coordenadas e a condição é reavaliada conforme as regras do isolamento.

Uma segunda execução depois de consumir a unidade não devolve uma nova linha. `CHECK` também impede saldo negativo, mas lidar corretamente com zero linhas faz parte do caso de uso.

## Várias escritas precisam de uma decisão conjunta

Se a reserva também exige inserir outro registro, agrupe as operações numa transação e confirme apenas quando todas as condições forem satisfeitas. Se o decremento não afetar linha, aborte o fluxo; não execute a inserção como se houvesse estoque.

O controle de fluxo fica no código servidor ou numa operação de banco adequadamente modelada. Não apresente uma sequência que sempre faz `COMMIT` como garantia de regra condicional.

## Isolamento define quais interações são possíveis

Read Committed, Repeatable Read e [Serializable](https://www.postgresql.org/docs/current/transaction-iso.html) oferecem garantias e custos diferentes; os detalhes variam entre bancos. Uma transação não implica automaticamente execução serial com todas as outras.

No PostgreSQL, Serializable pode rejeitar uma transação para evitar um resultado incompatível com execução serial. A aplicação precisa estar preparada para refazer a unidade correta quando o erro e o contrato permitirem, com limites. Veja a [documentação de isolamento](https://www.postgresql.org/docs/current/transaction-iso.html).

**Locks** são mecanismos de bloqueio para coordenar acessos concorrentes. Bloqueios explícitos podem ser úteis quando a regra envolve ler e decidir sobre registros, mas aumentam espera e risco de **deadlock**, quando operações ficam esperando por recursos que umas mantêm bloqueados para as outras. Ordem de aquisição, duração e quantidade de linhas importam. Evite manter uma transação aberta aguardando interação da pessoa ou uma integração externa lenta.

## Banco e serviço externo não compartilham a mesma transação por mágica

Uma chamada ao processador de pagamento não é desfeita porque a transação [SQL](https://www.postgresql.org/docs/current/tutorial-sql.html) executou rollback. Também pode haver falha entre confirmar uma escrita e publicar um evento.

Nessas fronteiras, precisamos de contratos adicionais. **Idempotência** controla o efeito de repetições; **outbox** registra o evento pendente junto da mudança no banco para publicá-lo depois; **compensação** é outra ação que procura corrigir um efeito; **reconciliação** consulta e compara registros para determinar o resultado e tratar divergências. A escolha depende do caso. O [guia de pagamentos e resultado desconhecido](./system-design-erros-retry-pagamentos.md) concentra essa aplicação; este artigo explica a garantia local do banco.

## Como testar

Teste sucesso, condição não atendida e rollback após falha intermediária. Para concorrência, use duas conexões reais com passos coordenados e verifique o estado final e as respostas de ambas.

Uma simulação sequencial demonstra apenas parte do contrato. Não declare a disputa resolvida por um teste que nunca sobrepõe as operações.
