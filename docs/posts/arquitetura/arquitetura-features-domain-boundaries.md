---
title: "Organizar por funcionalidades: definir responsabilidades e fronteiras"
description: "Veja como agrupar código por área do produto e definir quais dependências podem existir entre essas partes."
date: '2026-10-16'
category: 'Arquitetura Front-end'
tags:
  - Feature-based architecture
  - Domain boundaries
  - Separation of concerns
---

Uma **feature** é uma funcionalidade reconhecível, como emitir uma fatura. Um **domínio** reúne conceitos e regras de uma área, como faturamento. Sua **fronteira** define quais responsabilidades ficam ali e como outras partes conversam com ela. A organização de pastas deve ajudar a enxergar essas relações, em vez de ser apenas uma convenção visual.

Para dez pessoas evoluírem uma aplicação por cinco anos, a pergunta útil é: “quanto do sistema precisamos entender e alterar para entregar uma mudança?”. Uma arquitetura deve tornar esse custo previsível, não multiplicar pastas sem propósito.

Vamos usar um produto hipotético com autenticação, clientes, pagamentos e relatórios. A estrutura abaixo é uma proposta para esse contexto, não uma convenção obrigatória de Vue ou de qualquer framework.

## Uma estrutura inicial com donos claros

```text
src/
├── app/
│   ├── bootstrap.ts
│   └── routes.ts
├── core/
│   └── session/
├── shared/
│   ├── ui/
│   └── lib/
├── features/
│   ├── authentication/
│   ├── customers/
│   ├── payments/
│   └── reports/
└── infrastructure/
    ├── http/
    └── telemetry/
```

- `app` conecta rotas, dependências e inicialização. É o ponto de composição, onde detalhes concretos podem ser reunidos.
- `core` guarda contratos e capacidades realmente transversais, quando existirem, como a representação da sessão. Não deve importar telas das funcionalidades.
- `shared` contém elementos genéricos sem regras de um domínio particular: botões, formatação e utilitários com contrato claro.
- `features` concentra comportamento por capacidade de negócio. Clientes e pagamentos têm responsáveis e APIs públicas próprias.
- `infrastructure` integra detalhes externos, como [HTTP](https://www.rfc-editor.org/rfc/rfc9110.html) e telemetria. Um adaptador específico também pode ficar dentro da funcionalidade que o possui; não centralize tudo só para seguir o desenho.

Se `core` e `shared` acabam recebendo as mesmas coisas, elimine a distinção ou escreva uma regra melhor. Pastas não precisam existir vazias para demonstrar maturidade.

## Feature não é apenas uma tela

Uma funcionalidade pode conter várias páginas, casos de uso e componentes relacionados. “Clientes” pode cuidar de cadastro e edição; “Pagamentos” cuida de cobrança e seu acompanhamento.

```text
features/payments/
├── index.ts
├── model/
├── application/
├── ui/
└── adapters/
```

Crie essas subdivisões quando ajudam a separar responsabilidades reais. Uma funcionalidade pequena pode começar com três arquivos próximos e ganhar estrutura depois.

O `index.ts` pode definir o que outras partes consomem. Importar `payments/ui/internal/payment-modal-state` atravessa a implementação interna e facilita acoplamento acidental. Uma API pública pequena torna a dependência revisável.

## Domain boundaries: o mesmo termo pode representar coisas diferentes

Em cadastro, um cliente pode ter endereço e contatos. Em cobrança, a tela pode precisar apenas de identificador e condição de pagamento. Não force um único `Customer` gigantesco a carregar todos os significados do produto.

A ideia de [Bounded Context](https://martinfowler.com/bliki/BoundedContext.html) ajuda a explicitar onde um modelo e sua linguagem têm significado. Uma pasta de funcionalidade não vira automaticamente um bounded context: esses limites precisam ser descobertos com as regras e as pessoas do negócio.

Compartilhe identificadores e contratos necessários, em vez de compartilhar todos os detalhes do modelo. Um [DTO — Data Transfer Object](https://martinfowler.com/eaaCatalog/dataTransferObject.html) representa dados de uma integração. Traduzir esse formato externo na borda evita que uma mudança de API se espalhe por vários templates.

## Escreva uma regra de dependência verificável

Para esse produto, uma política possível seria:

1. `shared` não importa `features`, `app` ou adaptadores externos específicos.
2. Uma funcionalidade expõe apenas os contratos que outros contextos realmente precisam.
3. Coordenação entre funcionalidades acontece por composição ou por contrato explícito, não por leitura do store interno de outra funcionalidade.
4. Regras de negócio não importam componentes nem clientes HTTP concretos.

Lint de imports ou ferramentas de grafo podem reforçar esses limites. Não é necessário adotar um monorepo só para verificar algumas dependências.

## Como dez pessoas trabalham nisso?

Defina um responsável de referência por área e substitutos, sem criar propriedade exclusiva que bloqueie colaboração. Mantenha testes junto do comportamento, documente contratos e faça revisões que observem dependências, não apenas estilo.

Observe sinais de atrito: uma mudança em clientes exige aprovação de quatro áreas? O mesmo tipo recebe novos campos para atender telas sem relação? Há ciclos entre funcionalidades? Esses sinais justificam rever fronteiras melhor que o número de linhas de um diretório.

## Exercício de revisão

Escolha uma mudança, como adicionar uma condição de cobrança ao cliente. Liste os arquivos que precisariam mudar e os times envolvidos. Explique por que cada dependência existe. Se um componente genérico precisa conhecer a regra comercial, talvez a regra esteja no lugar errado.

O objetivo é conter mudanças comuns e tornar as inevitavelmente transversais explícitas.

## Continue estudando

- [Dependency inversion e SOLID](./arquitetura-dependency-inversion-solid.md)
- [Estado e ownership](./arquitetura-state-management.md)
- [Evolução e overengineering](./arquitetura-evolucao-overengineering.md)
