---
title: 'React Query ou estado global? Decidir quem possui cada dado'
description: 'Avalie um fluxo de pedidos e edição para separar cache do servidor, URL e rascunho local, sem duplicar a mesma resposta em vários stores.'
date: '2026-10-16'
category: 'Decisões técnicas'
tags:
  - React Query
  - TanStack Query
  - Estado global
---

Uma lista de pedidos recebida da API é uma cópia dos dados do servidor. Já o texto que a pessoa ainda está digitando é um rascunho local. **Estado** é o conjunto dessas informações na aplicação; um **store** concentra dados e operações de atualização. A pergunta é quem deve cuidar de cada informação, incluindo sua atualização e descarte.

[React Query](https://tanstack.com/query/latest/docs/framework/react/overview), hoje parte do TanStack Query, e um store de estado cliente não precisam competir pelo mesmo problema. A decisão começa identificando o que é uma cópia de dado remoto e o que é uma escolha ou edição da pessoa.

Este estudo usa o nome da ferramenta para discutir uma aplicação React hipotética. Não migra o blog Vue para React nem adiciona dependências.

## O caso: lista de pedidos com edição

A tela busca pedidos por organização e filtro, permite abrir detalhes e editar uma observação. Depois de salvar, a lista precisa refletir a mudança. Há também painel aberto e seleção de itens para uma ação.

O inventário mínimo fica assim:

| Informação | Dono sugerido no cenário |
| --- | --- |
| Resposta de pedidos e detalhes | Camada de consultas remotas |
| Filtro compartilhável | URL |
| Observação ainda não enviada | Fluxo de edição |
| Painel aberto | Componente ou funcionalidade |
| Seleção usada em várias telas | Estado cliente compartilhado, se necessário |

A classificação geral já está no [guia de state management](./arquitetura-state-management.md). A decisão aqui é se o ciclo remoto justifica uma ferramenta específica.

## Quando Query acrescenta valor?

Se várias telas precisam deduplicar consultas, atualizar dados, tratar invalidação e acompanhar erros e carregamento, uma biblioteca de server state pode reduzir coordenação manual. A [documentação do TanStack](https://tanstack.com/query/latest/docs/framework/react/guides/does-this-replace-client-state) diferencia esse papel do estado cliente.

Para o cenário, uma recomendação possível é usar Query para pedidos e manter o rascunho na edição. Não copie cada resposta do Query para um store global apenas para disponibilizá-la: isso cria outra representação que também precisa ser atualizada.

Uma página isolada, com uma leitura simples e ciclo curto, pode não justificar adicionar a dependência. Considere a infraestrutura já presente e o custo total do código manual, não apenas o tamanho do primeiro fetch.

## As escolhas que a biblioteca não faz pelo produto

Qual a validade aceitável? Quando atualizar? Uma lista pode continuar mostrando dado anterior? Quais mutações invalidam quais consultas? Como trocar usuário ou organização sem exibir resultado antigo?

Revise os [defaults importantes](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults) da versão usada, incluindo atualização e retry, em vez de assumir que representam a política do seu domínio. Uma transação financeira não deve herdar tentativas inadequadas por conveniência.

As [query keys](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys) precisam representar as variáveis que alteram o resultado. A implementação de isolamento por identidade está no [caso de cache do portal](./system-design-cache-estado-performance.md).

## Edição é um conflito de produto, não só de estado

Se o servidor atualiza um pedido enquanto o formulário tem alterações não enviadas, substituir o rascunho silenciosamente pode perder trabalho. Defina como detectar versão, informar conflito e salvar.

Query pode coordenar a consulta, mas o contrato de concorrência da edição continua entre aplicação, API e produto. Um store global não resolve isso automaticamente tampouco.

## Experimento e critério de saída

Implemente um fluxo representativo com consulta, edição e invalidação. Teste duas telas observando o mesmo pedido, troca de organização, resposta atrasada e erro de gravação.

Compare esforço de coordenação, clareza sobre quem é responsável por cada dado e comportamento observável. Reduzir código repetitivo de infraestrutura (boilerplate) só é um benefício se o contrato continuar explícito e correto.

Se o restante de estado compartilhado se resume a um painel local, talvez um store global nem seja necessário. Se há um editor com extenso estado cliente sincronizado, os dois mecanismos podem coexistir com limites claros.
