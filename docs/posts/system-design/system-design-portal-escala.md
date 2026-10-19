---
title: "System Design: planejar um portal que possa crescer"
description: "Parta das tarefas dos clientes, estime o uso e distribua responsabilidades antes de escolher a infraestrutura de um portal."
date: '2026-10-16'
category: 'System Design'
tags:
  - Escalabilidade
  - Capacidade
  - Trade-offs
  - CDN
---

**System Design**, ou projeto de sistemas, é planejar como as partes colaboram para atender uma necessidade. Uma **jornada** é o caminho de uma pessoa para concluir uma tarefa, como pagar uma fatura. **Escala** trata da capacidade diante de aumento de uso. Vamos partir dessas tarefas e de estimativas explícitas antes de escolher tecnologias.

“Dois milhões de clientes” informa o tamanho da base, não quantas requisições chegam por segundo. Antes de escolher infraestrutura, precisamos entender atividade, picos, jornadas e o custo de falhar em cada uma.

Esta série usa um portal hipotético com login, pagamentos, documentos e notificações. Os números e contratos são exemplos para discussão, não resultados medidos ou serviços implementados neste blog.

## Comece pelas perguntas que mudam o desenho

Quantas pessoas acessam por dia e simultaneamente? Há picos no vencimento de faturas? Quais regiões e dispositivos predominam? Documentos são públicos ou pessoais? Pagamento precisa de confirmação imediata ou pode ficar em processamento? Qual interrupção é tolerável?

Liste requisitos funcionais e requisitos de qualidade por jornada. Separar “abrir um documento” de “confirmar pagamento” evita dar a ambos a mesma política de cache, retry e disponibilidade.

## Faça uma estimativa que outra pessoa consiga revisar

Suponha, apenas para o exercício, que 10% da base use o portal por dia e que cada pessoa gere 20 chamadas de API:

```text
Base cadastrada:                  2.000.000 clientes
Ativos diários assumidos:         200.000 clientes
Chamadas por cliente ativo/dia:   20
Chamadas por dia:                 4.000.000
Média distribuída em 24 horas:    aproximadamente 46 chamadas/s
Pico assumido de 10 vezes:        aproximadamente 463 chamadas/s
```

Esse pico é uma hipótese para começar, não um dimensionamento validado. Uma campanha concentrada em cinco minutos pode invalidá-lo. Downloads de documentos, arquivos estáticos, conexões persistentes e chamadas internas precisam de estimativas separadas.

Se uma chamada do [BFF](https://learn.microsoft.com/en-us/azure/architecture/patterns/backends-for-frontends) dispara três consultas internas, 463 chamadas/s podem gerar cerca de 1.389 chamadas/s entre dependências, antes de cache e retries. O front-end influencia essa amplificação pela quantidade de chamadas e pelo contrato da tela.

## Um desenho inicial com responsabilidades explícitas

```text
Navegador ── busca assets ──> CDN ──> origem estática
    │
    ├── redirecionamento de login ──> Provedor OIDC
    │                                     ▲
    └── HTTPS: /api e callback ──> BFF ────┘
                                  │   troca de código no servidor
                    ┌─────────────┼──────────────┐
                    ▼             ▼              ▼
                 Clientes     Pagamentos     Documentos
                    │             │              │
                    └────── persistência ────────┘
                                      │
                                      └── processamento assíncrono
                                                │
                                                ▼
                                           Notificações
```

A CDN distribui arquivos públicos versionados. O navegador executa a interface. O provedor de identidade autentica; nesta proposta, o BFF completa o fluxo no servidor, mantém a sessão e agrega dados para a experiência web.

Clientes, pagamentos e documentos representam capacidades lógicas. Não precisam começar como microserviços nem ter três bancos separados. Uma aplicação de backend modular pode implementá-las; a separação física depende de escala, isolamento e divisão real de responsabilidades entre as equipes.

O navegador não acessa o banco diretamente. A autorização de cada operação e recurso continua sendo responsabilidade do servidor, mesmo que a interface esconda ações.

## Como cada parte escala?

Assets públicos aproveitam distribuição e cache. BFF e APIs podem ganhar réplicas, desde que estado de sessão, limites e dependências sejam tratados. Adicionar réplicas sem capacidade de banco ou provedor de pagamentos pode apenas deslocar o gargalo.

Trabalho demorado, como gerar um documento, pode entrar em fila e devolver um identificador para acompanhamento. Downloads grandes podem usar armazenamento de objetos autorizado, evitando fazer todos os bytes atravessarem o BFF.

Escala horizontal não é uma propriedade automática da palavra “cloud”. Testes precisam verificar saturação, conexões, filas, limites externos e comportamento sob falhas.

## Front-end também é parte do sistema distribuído

Defina divisão de código por jornada, orçamentos de carregamento e estados independentes por painel. Uma falha em notificações não precisa impedir a consulta de documentos. Pagamentos, por outro lado, não podem apresentar sucesso sem confirmação confiável.

Escolha SPA, SSR ou uma combinação conforme descoberta, conteúdo inicial, infraestrutura e custo. SSR adiciona execução no servidor e cuidados de cache e sessão; não deve ser escolhido só porque a base tem milhões de contas.

## O que apresentar numa entrevista?

Mostre hipóteses, desenho, fluxos críticos e pontos de falha. Depois aprofunde uma jornada, como pagamento com timeout, explicando o estado no navegador e o contrato no servidor.

Compare alternativas e diga o que faria mudar a decisão. Um desenho coerente e operável é mais convincente que uma lista de tecnologias sem relação com os requisitos.

## Caminho da série

1. [Autenticação e segurança](./system-design-autenticacao-seguranca.md)
2. [BFF e contratos de API](./system-design-bff-contratos-api.md)
3. [Cache, estado e performance](./system-design-cache-estado-performance.md)
4. [Erros, retries e pagamentos](./system-design-erros-retry-pagamentos.md)
5. [Documentos e notificações](./system-design-documentos-notificacoes.md)
6. [Disponibilidade e observabilidade](./system-design-disponibilidade-observabilidade.md)

## Referência relacionada

- [Padrão BFF — Microsoft Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/patterns/backends-for-frontends)
- [Arquitetura por funcionalidades no cliente](./arquitetura-features-domain-boundaries.md)
