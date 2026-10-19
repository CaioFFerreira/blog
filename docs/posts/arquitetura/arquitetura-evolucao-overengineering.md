---
title: 'Arquitetura para cinco anos: decisões evolutivas e sinais de overengineering'
description: 'Faça uma proposta arquitetural com contexto, alternativas, evidências e plano de revisão, evitando complexidade que o produto ainda não precisa sustentar.'
date: '2026-10-16'
category: 'Arquitetura Front-end'
tags:
  - Overengineering
  - ADR
  - Evolução
  - Arquitetura
---

**Arquitetura** é a forma como responsabilidades e dependências são organizadas para o sistema funcionar e poder mudar. **Overengineering** é acrescentar complexidade além do que o problema justifica. Uma loja pequena, por exemplo, pode precisar de módulos bem separados sem precisar de vários serviços independentes desde o primeiro dia.

Planejar cinco anos não significa antecipar todas as funcionalidades. Significa criar condições para mudar: fronteiras compreensíveis, decisões registradas, testes dos contratos importantes e uma equipe capaz de operar o que construiu.

Uma arquitetura sofisticada pode ser adequada a um contexto e excessiva em outro. O custo inclui aprender, depurar, atualizar dependências, integrar pessoas e desfazer uma decisão equivocada.

## Comece pelas restrições do produto

Para o cenário de dez desenvolvedores, investigue antes de desenhar:

- Há uma ou várias equipes com ciclos de entrega distintos?
- Quais fluxos são críticos e quais precisam funcionar com rede instável?
- Há SSR, requisitos de acesso, múltiplas organizações ou integrações externas?
- Quais problemas já custam tempo: mudanças transversais, deploy, testes ou onboarding?
- Quem vai manter infraestrutura e bibliotecas compartilhadas?

Sem essas respostas, a proposta tende a refletir preferência por ferramentas, não necessidade.

## Uma proposta inicial defensável

Para um produto único, com uma equipe e entrega coordenada, uma aplicação modular por funcionalidades pode ser um bom ponto inicial. Estado tem donos claros, integrações entram por fronteiras coerentes e testes cobrem regras e fluxos críticos.

Uma biblioteca interna pode surgir quando há consumidores reais. Um monorepo pode entrar quando existem múltiplos projetos com coordenação recorrente. [Micro-frontends](https://martinfowler.com/articles/micro-frontends.html) precisam de uma necessidade de autonomia que justifique seu custo operacional.

Isso é uma sequência possível para esse contexto, não uma lei de maturidade. O argumento de [Monolith First](https://martinfowler.com/bliki/MonolithFirst.html) ajuda a discutir o custo de definir fronteiras distribuídas cedo demais; no front-end, use essa ideia como reflexão, não como equivalência automática com serviços de backend.

## Sinais concretos de overengineering

Um CRUD simples exige alterar doze arquivos que apenas repassam parâmetros. Há três implementações de uma interface, mas duas nunca são usadas. O time mantém um mecanismo de plugins sem extensão real prevista. Cada componente precisa de configuração genérica mais difícil de entender que o caso concreto.

Esses sinais não provam excesso isoladamente: valide o papel de cada fronteira. Uma camada que concentra validação ou protege uma integração pode ter valor mesmo com uma implementação. Uma camada que apenas renomeia a mesma chamada talvez não tenha.

Pergunte qual problema verificável cada abstração resolve e qual custo ela introduz. “Talvez um dia” precisa ser comparado à possibilidade de extrair depois.

## Registre decisões com ADRs curtos

Um Architecture Decision Record explica contexto, decisão e consequências. A proposta original de [Michael Nygard sobre ADRs](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) valoriza registros pequenos que preservem o motivo das escolhas.

Exemplo didático:

```text
Título: Organizar o portal por features
Status: Aceita

Contexto:
Um produto, uma equipe de dez pessoas e deploy coordenado.
Mudanças de clientes hoje atravessam diretórios técnicos sem dono.

Decisão:
Agrupar por capacidade de negócio e expor contratos públicos pequenos.
Manter uma aplicação e um pipeline de publicação.

Alternativas:
Manter a estrutura atual; dividir em aplicações independentes.

Consequências:
Será preciso migrar imports gradualmente e definir responsáveis.
Não teremos deploy independente por feature nesta etapa.

Revisão:
Reavaliar se equipes com ciclos distintos forem bloqueadas
repetidamente por entregas sem relação entre si.
```

O registro descreve um cenário hipotético; não é uma mudança aplicada à arquitetura deste blog. Quando a decisão mudar, preserve o histórico e marque a anterior como substituída, em vez de apagar o raciocínio.

## Migre em fatias que possam ser verificadas

Escolha uma funcionalidade, estabeleça seu contrato e mova consumidores gradualmente. Evite misturar migração de pasta, troca de framework e mudança de regra de negócio na mesma entrega sem necessidade.

Compatibilidade pode ser mantida por adaptadores ou exports temporários. Documente quem os remove e em qual condição; uma ponte sem plano de retirada vira estrutura permanente.

Priorize testes que protegem comportamento, contratos de integração e fluxos de alto risco. Snapshot de toda a árvore de componentes não substitui verificar que um pagamento não é enviado duas vezes.

## Meça se a arquitetura está ajudando

Observe o tempo para executar o projeto, entregar uma mudança comum, receber feedback do CI e diagnosticar uma falha. Registre dependências cíclicas e alterações que atravessam domínios sem razão clara.

Não transforme número de arquivos ou cobertura em porcentagem em objetivos isolados. Uma arquitetura deve reduzir risco e custo de mudanças relevantes, mantendo desempenho, acessibilidade e confiabilidade.

## Um exercício de entrevista com resposta profissional

Ao ouvir “organize para dez pessoas e cinco anos”, explique primeiro as hipóteses. Desenhe responsabilidades, dependências permitidas, donos do estado e estratégia de testes e entrega. Apresente alternativas, custos e gatilhos para evoluir.

Para praticar a comparação com um caso concreto, siga o [estudo de escopo, custo e crescimento](./decisao-escopo-custo-crescimento.md). A série de Decisões técnicas aplica os mecanismos desta arquitetura a escolhas como SSR, estado e migração, sem exigir que a solução mais complexa vença.

Reconhecer que um blog estático pode funcionar com Markdown, componentes e um build simples também é uma decisão arquitetural. O tamanho da solução deve acompanhar o problema que ela precisa resolver.

## Roteiro da série

1. [Features e fronteiras de domínio](./arquitetura-features-domain-boundaries.md)
2. [Dependency inversion e SOLID](./arquitetura-dependency-inversion-solid.md)
3. [Estado e ownership](./arquitetura-state-management.md)
4. [Design Systems e composição](./arquitetura-design-system-composicao.md)
5. [Monorepos](./arquitetura-monorepos.md)
6. [Micro-frontends e seus limites](./arquitetura-micro-frontends.md)
