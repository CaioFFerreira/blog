---
title: 'SQL e índices: entender o custo de pedir dados ao banco'
description: 'Modele relações e restrições básicas, escreva filtros e joins e leia o plano de execução antes de sugerir mais cache ou mais servidor.'
date: '2026-10-16'
category: 'Backend'
tags:
  - SQL
  - Índices
  - PostgreSQL
---

Num banco relacional, dados ficam em **tabelas**, com linhas e colunas, e **SQL** é a linguagem usada para consultá-los e alterá-los. Um **índice** é uma estrutura que pode ajudar o banco a localizar registros sem percorrer todos eles. Pense no índice de um livro: ele ajuda certas buscas, mas também precisa ser mantido.

Uma API lenta pode estar esperando uma consulta que lê muito mais dados do que precisa. Entender [SQL](https://www.postgresql.org/docs/current/tutorial-sql.html) permite conversar sobre esse custo e perceber que paginação e filtros da interface têm consequências na persistência.

Os exemplos usam um modelo didático compatível com PostgreSQL. Execute criação e inserções apenas em um banco descartável de estudo; eles não fazem parte da infraestrutura deste blog.

## Relacione registros e declare restrições

```sql
CREATE TABLE customers (
  id BIGINT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL
);

CREATE TABLE documents (
  id BIGINT PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id),
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('processing', 'ready'))
);

INSERT INTO customers (id, organization_id, name)
VALUES (1, 'org_1', 'Caio'), (2, 'org_2', 'Ana');

INSERT INTO documents (id, customer_id, title, status)
VALUES (10, 1, 'Extrato', 'ready'), (11, 1, 'Recibo', 'processing'),
       (12, 2, 'Contrato', 'ready');
```

A chave primária identifica cada linha. A foreign key exige um cliente existente para o documento. `NOT NULL` e `CHECK` protegem parte do formato mesmo quando outra aplicação grava no banco.

Essas restrições não implementam autorização por usuário. A aplicação ainda precisa obter a identidade de uma fonte verificada e restringir o acesso correspondente.

## Uma consulta com filtro e relação

```sql
SELECT documents.id, documents.title, customers.name
FROM documents
JOIN customers ON customers.id = documents.customer_id
WHERE customers.organization_id = 'org_1'
  AND documents.status = 'ready'
ORDER BY documents.id
LIMIT 20;
```

Com os dados acima, o resultado contém apenas o documento 10, `Extrato`, de Caio. `JOIN` relaciona as linhas; `WHERE` restringe; `ORDER BY` define a ordem. Sem ordenação, não prometa que a sequência será sempre a mesma.

O literal é apenas para o laboratório. Na aplicação, use parâmetros do driver; não concatene entrada da pessoa na SQL. O valor de organização também não deve ser aceito como prova de autorização só por chegar no requisição.

## Índice não é um atalho universal

Um índice pode reduzir o trabalho para localizar ou ordenar dados, com custo de espaço e manutenção nas escritas. O PostgreSQL cria índices para certas restrições, como a chave primária, mas isso não significa que qualquer filtro estará atendido.

Uma hipótese para a consulta seria:

```sql
CREATE INDEX customers_by_organization
ON customers (organization_id, id);

CREATE INDEX documents_by_customer_status
ON documents (customer_id, status, id);
```

A ordem das colunas importa para os caminhos de acesso. Esses índices são candidatos para estudar, não uma recomendação validada para dados reais. Em três documentos, uma leitura sequencial pode ser mais barata; o otimizador não é obrigado a usar um índice só porque ele existe.

Consulte a [documentação de índices](https://www.postgresql.org/docs/current/indexes.html) para os métodos e restrições de uso.

## Leia o plano, depois meça

[`EXPLAIN`](https://www.postgresql.org/docs/current/using-explain.html) mostra o plano estimado. `EXPLAIN ANALYZE` executa a instrução e coleta medidas: em comandos que alteram dados, isso pode produzir efeitos reais. Use um ambiente seguro e apropriado ao teste.

Observe estimativas versus linhas reais, caminhos de acesso, loops, ordenações e tempo. Não compare planos com uma amostra minúscula e dados de produção como se fossem equivalentes. Estatísticas e distribuição afetam decisões. O [guia de EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html) explica a leitura.

## O que o front-end pode negociar?

Evite listas sem limite, busca a cada tecla sem política e consultas que exigem todos os detalhes para mostrar um resumo. Paginação por cursor precisa de ordenação estável e desempate, não apenas de “um cursor qualquer”.

Pergunte se o endpoint faz uma consulta por item, carrega colunas desnecessárias ou espera dados de outra dependência. A interface não precisa escrever SQL para discutir esses custos de forma útil.

## Continue estudando

- [Transações e concorrência](./backend-transacoes-concorrencia.md)
- [N+1 em GraphQL](./backend-graphql-resolvers.md)
- [Contratos e paginação da API](./system-design-bff-contratos-api.md)
