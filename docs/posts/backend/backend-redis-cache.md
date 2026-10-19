---
title: 'Redis no backend: chave, validade e comportamento quando o cache falha'
description: 'Entenda Redis como dependência de dados, aplique cache-aside e reconheça expiração, eviction e concorrência sem tratá-lo como uma garantia automática de consistência.'
date: '2026-10-16'
category: 'Backend'
tags:
  - Redis
  - Cache-aside
  - Expiração
---

Imagine uma consulta frequente e demorada. Um **cache** guarda seu resultado para reutilização, com regras que dizem por quanto tempo e em quais situações ele vale. O Redis pode cumprir esse papel. A pergunta prática é como a aplicação se comporta quando o valor está ausente, ficou antigo ou o próprio Redis está indisponível.

[Redis](https://redis.io/docs/latest/) oferece estruturas de dados acessíveis por comandos e é frequentemente usado para cache, sessões, contadores e outras necessidades. Isso não significa que qualquer informação ali tenha a mesma garantia de persistência que seu banco principal.

A política [HTTP](https://www.rfc-editor.org/rfc/rfc9110.html) e a classificação de dados já estão no [guia de caching](./performance-cache-memoization.md). Aqui, o foco é o papel de Redis entre a aplicação e a persistência.

## Cache-aside: buscar, calcular e preencher

```text
Consulta da aplicação
    │
    ├── chave válida em Redis? ── sim ──> usar valor permitido
    │
    └── não ──> consultar fonte de verdade
                       │
                       ├── preencher cache com validade
                       └── devolver resultado
```

O cache pode reduzir consultas repetidas, mas a fonte continua definindo o dado correto. O backend precisa tratar valor ausente, formato antigo, erro de conexão e política de invalidação após uma escrita.

Se o endpoint é pessoal, identidade e autorização precisam ser consideradas tanto no acesso quanto na formação do resultado. Uma chave bem nomeada não substitui autorização.

## Um laboratório de comandos

Em uma instância descartável de Redis, os comandos abaixo gravam uma representação pública fictícia por 60 segundos:

```text
SET study:catalog:v1 '{"total":3}' EX 60
GET study:catalog:v1
TTL study:catalog:v1
DEL study:catalog:v1
```

`EX` define expiração em segundos. `GET` devolve a string, não um objeto JavaScript validado. [`TTL`](https://redis.io/docs/latest/commands/expire/) informa o tempo restante ou valores especiais conforme existência e expiração. `DEL` remove a chave especificada.

O exemplo não conecta o blog a Redis e não deve ser executado em uma instância compartilhada sem um namespace e um ambiente apropriados. A [referência de SET](https://redis.io/docs/latest/commands/set/) documenta suas opções.

## Expiração e eviction não são sinônimos

Expiração remove a validade conforme o prazo da chave. Eviction é uma política associada ao limite de memória e pode retirar entradas antes de você esperar, dependendo da configuração. Com outra política, uma escrita pode ser rejeitada em vez de expulsar dados.

Configure capacidade e observe memória, latência, acertos (valor encontrado), falhas de consulta ao cache (*misses*) e remoções. A [documentação de eviction](https://redis.io/docs/latest/develop/reference/eviction/) explica políticas e vantagens e custos. Não trate uma sessão armazenada em Redis como cache descartável sem definir o efeito da perda.

## Concorrência pode devolver um valor antigo ao cache

Imagine uma consulta que lê do banco, enquanto outra operação atualiza o mesmo dado e invalida a chave. Se a primeira consulta preencher o cache depois, ela pode reintroduzir a versão antiga.

O prazo de validade (TTL, *Time to Live*) limita parte da duração, mas não garante atualização imediata. Versões, ordenação de eventos e estratégias de invalidação dependem da consistência exigida. Para um contador aproximado e um saldo financeiro, as políticas provavelmente serão diferentes.

## Cache indisponível: qual é o comportamento esperado?

Em alguns fluxos, faz sentido consultar a fonte diretamente. Em outros, um fallback irrestrito pode sobrecarregar o banco justamente quando o cache falha. Defina limites, degradação e capacidade para esse cenário.

Se Redis guarda sessão, coordenação ou outro estado necessário, o impacto não é o mesmo de perder um cache de catálogo. Não use o rótulo “cache” para esconder que uma dependência virou parte crítica da disponibilidade.

## Cuidado com garantias de coordenação

`SET` com condição e expiração pode participar de certas estratégias de lock, mas não garante sozinho correção distribuída. Dono, renovação, liberação, pausas de processo e falhas precisam ser tratados conforme a operação.

Antes de adicionar um lock remoto para corrigir uma regra do banco, verifique se uma transação ou restrição local atende ao caso com menos componentes.

## Como verificar

Teste hit, miss, expiração, valor inválido, escrita concorrente e indisponibilidade. Compare carga no banco e correção do resultado, não apenas uma requisição rápida quando o cache está aquecido.

## Continue estudando

- [Cache isolado por usuário e organização](./system-design-cache-estado-performance.md)
- [Transações locais](./backend-transacoes-concorrencia.md)
