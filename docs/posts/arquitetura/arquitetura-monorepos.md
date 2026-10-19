---
title: 'Monorepos: coordenar código compartilhado sem perder fronteiras'
description: 'Avalie repositório único, pacotes e automação por impacto, distinguindo organização do código, dependências e unidades de deploy.'
date: '2026-10-16'
category: 'Arquitetura Front-end'
tags:
  - Monorepos
  - Module boundaries
  - CI
---

Um **repositório** guarda arquivos e seu histórico de alterações. Num monorepo, uma mesma base pode reunir o site, um painel administrativo e uma biblioteca de componentes. **Pacote** é uma unidade de código com suas dependências e interface de uso. Estarem no mesmo repositório não obriga esses projetos a serem publicados juntos.

Monorepo significa manter vários projetos ou pacotes em um repositório. Não define sozinho arquitetura de domínio, número de aplicações nem estratégia de publicação. Ele pode hospedar um monólito modular, várias aplicações ou [micro-frontends](https://martinfowler.com/articles/micro-frontends.html).

## Qual problema estamos tentando resolver?

Na equipe de dez pessoas, talvez haja um portal e uma área administrativa que compartilham componentes e contratos. Mudar um componente e seus consumidores no mesmo conjunto de alterações pode reduzir coordenação entre repositórios.

Se existe apenas uma aplicação pequena e nenhum pacote com vida própria, um projeto convencional já pode atender. Adotar uma ferramenta de monorepo não cria automaticamente produtividade.

## Uma estrutura ilustrativa

```text
apps/
├── portal/
└── admin/
packages/
├── ui/
├── customer-contracts/
├── eslint-config/
└── test-utils/
```

Cada pacote precisa de responsabilidade e API pública. Colocar todo o código em `packages/shared` apenas muda o endereço do acoplamento.

`customer-contracts` não deve receber todos os tipos do backend. Compartilhe apenas o que precisa ser um contrato comum; diferentes consumidores podem traduzir o mesmo conteúdo da mensagem para modelos próprios.

## Workspaces, grafo de tarefas e fronteiras são capacidades diferentes

[Workspaces](https://docs.npmjs.com/cli/v11/using-npm/workspaces) ajudam a instalar e vincular pacotes locais. Ferramentas de tarefas podem ordenar builds, executar projetos afetados e reutilizar resultados. Regras de dependência limitam imports entre áreas.

Você pode adotar essas capacidades gradualmente. Um workspace não precisa começar com geradores complexos, cache remoto e publicação automatizada de todos os pacotes.

No [Nx](https://nx.dev/docs/features/enforce-module-boundaries), por exemplo, tags e regras de module boundaries podem restringir dependências entre tipos e escopos de projeto. A [documentação oficial de fronteiras](https://nx.dev/docs/features/enforce-module-boundaries) explica os mecanismos; a política de domínio ainda precisa ser definida pela equipe.

## Uma política possível para o produto

- Aplicações podem consumir pacotes públicos.
- `ui` não pode importar código de negócio nem aplicações.
- Clientes e pagamentos não acessam implementações internas um do outro.
- Código de teste não entra como dependência de execução em produção.
- Não há ciclos entre os pacotes publicados.

Reforce a política com verificações automáticas quando o custo de manutenção justificar. Revisão humana sozinha tende a deixar passar imports aparentemente convenientes.

## Cache de build precisa representar todas as entradas

Se um resultado depende de arquivos, lockfile, configuração de ferramentas e variáveis de ambiente, o cache precisa considerar essas entradas. Uma chave incompleta pode reutilizar um resultado incorreto.

Tarefas com efeitos externos, publicação ou dados variáveis não devem ser tratadas como cálculos puros sem analisar o contrato. Resultados e logs também podem conter informação sensível; configure o compartilhamento remoto conforme o ambiente da equipe.

## O que pode dar errado?

Um pipeline que testa tudo em toda mudança pode ficar lento. Um pipeline que testa apenas a pasta alterada pode ignorar consumidores afetados. O grafo precisa representar dependências reais e incluir mudanças de configuração que afetam vários projetos.

Um único lockfile facilita alinhar versões, mas pode ampliar o impacto de um upgrade. Vários pacotes não garantem independência: se todos precisam ser atualizados e publicados juntos, existe coordenação que a árvore de diretórios não revela.

## Repositório e deploy são decisões separadas

Aplicações no mesmo repositório podem publicar separadamente. Aplicações em repositórios diferentes podem continuar exigindo deploy sincronizado por contrato incompatível. Avalie o fluxo de entrega, não apenas onde o código fica.

## Como decidir e validar?

Registre o problema atual: quanto tempo custa atualizar uma biblioteca em todos os consumidores? Onde ocorrem incompatibilidades? O time consegue rodar um projeto sem construir tudo manualmente?

Faça um piloto com dois consumidores reais. Meça tempo de feedback, esforço de atualização e facilidade para um novo integrante executar testes. Compare o benefício com a manutenção da automação.

## Continue estudando

- [Design Systems e consumidores](./arquitetura-design-system-composicao.md)
- [Micro-frontends: outra decisão](./arquitetura-micro-frontends.md)
- [Evoluir sem overengineering](./arquitetura-evolucao-overengineering.md)
