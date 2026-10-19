---
title: 'Core Web Vitals: medir e melhorar LCP, INP e CLS'
description: 'Entenda as três métricas, diferencie laboratório de experiência real e transforme um resultado ruim em uma hipótese de investigação.'
date: '2026-10-16'
category: 'Performance'
tags:
  - Core Web Vitals
  - LCP
  - INP
  - CLS
---

**LCP** significa *Largest Contentful Paint* e acompanha a apresentação do maior conteúdo elegível; **INP**, *Interaction to Next Paint*, acompanha a resposta visual às interações; **CLS**, *Cumulative Layout Shift*, acompanha deslocamentos inesperados. Pense em três perguntas: “o conteúdo apareceu?”, “o clique teve resposta?” e “o botão ficou no lugar?”. As métricas ajudam a investigar cada dimensão.

Uma página pode baixar poucos arquivos e ainda responder mal a cliques. Pode responder rápido, mas deslocar o botão quando uma imagem chega. Performance tem várias dimensões: precisamos identificar qual experiência está ruim antes de escolher a otimização.

As [Core Web Vitals](https://web.dev/articles/vitals) acompanham carregamento percebido, resposta a interações e estabilidade visual. Os limites abaixo são os publicados pelo [web.dev](https://web.dev/articles/vitals?hl=pt-br), consultados em outubro de 2026.

## Limites e leitura correta

| Métrica | Boa | Precisa melhorar | Ruim |
| --- | --- | --- | --- |
| [LCP](https://web.dev/articles/lcp) | Até 2,5 s | Acima de 2,5 até 4 s | Acima de 4 s |
| [INP](https://web.dev/articles/inp) | Até 200 ms | Acima de 200 até 500 ms | Acima de 500 ms |
| [CLS](https://web.dev/articles/cls) | Até 0,1 | Acima de 0,1 até 0,25 | Acima de 0,25 |

Esses valores devem ser avaliados no **percentil 75** (o valor abaixo do qual estão 75% das observações), separando mobile e desktop: para cada métrica, pelo menos 75% das observações precisam estar dentro do limite bom. Uma média pode esconder uma parcela relevante de experiências ruins. Uma avaliação aprovada exige as três métricas boas.

## LCP: quando o maior conteúdo relevante aparece?

LCP acompanha a apresentação do maior elemento elegível visível na área inicial, como uma imagem de destaque ou um bloco de texto. Não é o tempo para baixar todos os recursos nem o evento `load`.

Uma investigação prática começa identificando o elemento LCP no trace. Se for uma imagem, separe quatro partes: espera pelo primeiro byte do documento, atraso para iniciar o recurso, download do recurso e atraso até renderizá-lo. Essa divisão evita reduzir bytes quando o maior problema está na descoberta tardia da imagem.

**Exemplo hipotético:** uma imagem pequena só começa a carregar depois que JavaScript busca os dados e monta o banner. Torná-la descobrível no HTML inicial pode ajudar mais do que comprimi-la novamente. Confira o resultado medindo, em vez de assumir um ganho.

Leia os detalhes e os tipos de elementos elegíveis na [definição de LCP](https://web.dev/articles/lcp?hl=pt-br).

## INP: quanto a interação espera até o próximo desenho?

INP considera interações como cliques, toques e teclado ao longo da visita. A duração inclui espera antes das funções que tratam os eventos, execução dessas funções e apresentação do próximo quadro visual (*frame*). O valor representa uma interação entre as mais lentas, com tratamento de valores extremos em visitas com muitas interações; não é uma média de cliques.

Imagine um clique para abrir filtros. O handler pode ser curto, mas uma tarefa anterior de 300 ms ocupa o thread principal. O clique ainda espera. Procure trabalho anterior, dentro do handler e na atualização visual posterior.

INP não mede quanto uma resposta de API demora até completar toda a operação. Mostrar feedback rapidamente e concluir a busca depois são etapas diferentes. A [documentação de INP](https://web.dev/articles/inp?hl=pt-br) explica essa distinção.

## CLS: quanto o conteúdo muda de lugar sem ser esperado?

CLS combina a área afetada e a distância dos deslocamentos inesperados. O resultado é uma pontuação sem unidade, não uma duração em segundos.

Ele usa janelas de sessão de deslocamentos, com regras de intervalo e duração; não é simplesmente a soma de tudo desde a abertura. Mudanças ligadas a uma entrada recente, dentro da janela prevista pela métrica, podem ser excluídas. Não use isso como desculpa para uma interface instável.

Comece reservando espaço para imagens, anúncios e embeds. Verifique também fontes e conteúdo inserido acima do que a pessoa está lendo. O elemento que se deslocou pode ser a vítima, não o recurso que causou a mudança. Consulte a [definição de CLS](https://web.dev/articles/cls?hl=pt-br).

## Campo e laboratório respondem a perguntas diferentes

- **Campo:** pessoas reais, diferentes dispositivos, redes e durações de visita. [CrUX](https://developer.chrome.com/docs/crux) e monitoramento próprio ajudam a enxergar a distribuição real.
- **Laboratório:** cenário controlado para reproduzir, investigar e comparar uma alteração. [Lighthouse](https://developer.chrome.com/docs/lighthouse/overview) e traces locais ajudam no diagnóstico.

Um teste de navegação do Lighthouse não reproduz a distribuição de INP da base real. [TBT](https://web.dev/articles/tbt) pode indicar bloqueio durante carregamento, mas não substitui INP. No [PageSpeed Insights](https://developers.google.com/speed/docs/insights/v5/about), confira se o bloco de campo é da URL ou da origem e se há amostra suficiente; os dados do CrUX refletem uma janela de 28 dias, não apenas o deploy de hoje.

## Exercício: transforme a métrica em um plano

Escolha uma rota e uma interação importante. Registre dispositivo, rede, estado de cache e versão da aplicação. Depois:

1. Consulte os dados de campo disponíveis e escolha a dimensão com problema.
2. Reproduza o fluxo no laboratório e identifique o elemento ou a interação.
3. Escreva uma hipótese concreta: “a imagem LCP começa tarde porque depende do JavaScript”.
4. Faça uma mudança e repita o mesmo cenário várias vezes.
5. Após publicar, acompanhe o campo e possíveis regressões nas outras métricas.

Os números de um exemplo não são resultados deste blog. O objetivo aqui é aprender o método; uma auditoria real precisa de medições da página analisada.

## Próximas leituras

- [Diagnóstico com Performance e Network](./performance-devtools-network-waterfall.md)
- [Imagens, lazy loading e estabilidade](./performance-imagens-lazy-loading.md)
- [Long tasks e responsividade](./performance-long-tasks.md)
