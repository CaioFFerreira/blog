---
title: 'Como mudar sem quebrar os outros produtos? Compartilhamento e autonomia'
description: 'Decida entre componente comum, contrato compartilhado e unidades independentes, usando o impacto de uma mudança para avaliar micro-frontends e compatibilidade.'
date: '2026-10-16'
category: 'Decisões técnicas'
tags:
  - Compatibilidade
  - Micro-frontends
  - Produtos
---

Imagine um campo de cadastro usado em três produtos: mudar sua regra pode ajudar um e quebrar os outros dois. O **consumidor** é cada aplicação que usa a peça compartilhada, e **compatibilidade** significa que ela continua atendendo ao contrato esperado. Vamos comparar formas de entregar a mudança sem obrigar todos a adotar uma regra que não lhes pertence.

Compartilhar reduz duplicação e aumenta o alcance de uma mudança. A decisão não termina quando dois produtos importam o mesmo pacote: é preciso saber quem pode evoluí-lo e como os consumidores absorvem a atualização.

## O caso: três produtos usam o mesmo formulário de cliente

O produto A pede uma nova regra obrigatória. B e C atendem outros fluxos e não podem passar a exigir o campo sem planejamento.

Antes de alterar o pacote, pergunte se a regra é universal ou pertence ao domínio de A. Um componente visual comum pode oferecer uma estrutura de campo, enquanto a funcionalidade de cada produto define quais dados exige.

Se o componente acumula flags por produto, a abstração pode estar no nível errado. As opções de composição estão no [guia de Design Systems](./arquitetura-design-system-composicao.md); aqui, vamos decidir como entregar a mudança.

## Compare três alternativas

| Alternativa | Benefício | Custo a assumir |
| --- | --- | --- |
| Nova capacidade de adesão explícita no componente | Migração gradual | Mais de uma configuração suportada |
| Composição específica no produto A | Isola a regra local | Alguma duplicação e revisão futura |
| Novo contrato comum obrigatório | Uniformidade quando a regra é universal | Migração coordenada de todos os consumidores |

Para a premissa de uma regra exclusiva de A, composição local ou capacidade de adesão explícita costuma ser mais defensável que alterar silenciosamente o comportamento de todos.

Mantenha uma lista dos consumidores suportados e execute os testes relevantes. Um monorepo pode facilitar uma mudança atômica em vários pacotes; não prova que versões já publicadas e clientes abertos foram atualizados.

## Versionamento comunica; testes verificam

[SemVer](https://semver.org/) exige uma API pública definida para classificar mudanças. A [especificação de versionamento semântico](https://semver.org/lang/pt-BR/) fornece a convenção; ela não detecta sozinha uma quebra de comportamento.

Um novo campo de resposta pode parecer aditivo e ainda atingir um consumidor com parsing estrito. Um novo valor de enum pode quebrar uma seleção sem fallback. Considere o contrato real dos clientes suportados, além de nomear a versão.

Use uma janela de depreciação e evidência de migração antes de remover a forma anterior. Um aviso em documentação não é prova de que todos os consumidores deixaram de usá-la.

## Precisamos de micro-frontends para isso?

Uma mudança de regra num componente não justifica, por si só, aplicações independentes. Micro-frontends podem ajudar quando equipes precisam entregar domínios com autonomia real e conseguem operar os contratos de integração.

Faça a pergunta decisiva: o bloqueio vem de um pacote inadequadamente compartilhado ou da necessidade de ciclos de deploy independentes? No primeiro caso, corrigir a fronteira pode bastar. No segundo, compare o custo operacional da separação.

O [guia de micro-frontends](./arquitetura-micro-frontends.md) concentra mecanismos e limites. Neste caso, um piloto só faz sentido se demonstrar uma entrega independente mantendo outras unidades em versões anteriores.

## Critérios de saída para a mudança

Valide os fluxos representativos de A, B e C com suas configurações. Teste o consumidor antigo contra o contrato compatível, a evolução de estilos e os comportamentos de teclado e foco relevantes.

Associe a publicação à versão do pacote e às versões de aplicações que a adotaram. Se precisar reverter, identifique qual parte pode voltar sem exigir regressão de todos os produtos.

## Quando revisar a escolha?

Se opções de adesão explícita se acumularem sem fronteira clara, revise a composição. Se equipes seguirem bloqueadas por releases sem relação, avalie autonomia. Se o custo de manter versões suportadas superar o benefício, negocie uma migração coordenada com responsáveis e prazo.

Não use “independência” para ocultar dependências que continuam obrigando todos a publicar juntos.

## Continue estudando

- [Monorepos e limites de módulo](./arquitetura-monorepos.md)
- [Migração em produção](./decisao-migracao-legado.md)
