---
title: "HTTP, preload e prefetch: descobrir por que um arquivo começa a carregar tarde"
description: "Separe comunicação, descoberta e prioridade dos recursos antes de mudar o protocolo ou adicionar dicas de carregamento."
date: '2026-10-16'
category: 'Navegador'
tags:
  - HTTP/2
  - HTTP/3
  - Preload
  - Prefetch
---

O navegador precisa descobrir um arquivo antes de poder baixá-lo. **Preload** indica um recurso necessário para a página atual; **prefetch** sugere algo que pode ser útil numa navegação futura. Já a versão de **HTTP**, o protocolo de comunicação, altera o transporte. Entender em qual etapa está o atraso evita aplicar uma dica de carregamento ao problema errado.

Trocar a versão de [HTTP](https://www.rfc-editor.org/rfc/rfc9110.html) não elimina uma dependência descoberta tarde. Adicionar [preload](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/preload) não torna a resposta do servidor mais rápida. Separe transporte, descoberta, prioridade e quantidade de dados antes de escolher a intervenção.

## O que HTTP/2 e HTTP/3 mudam?

HTTP mantém conceitos como métodos, status e cabeçalhos entre as versões. [HTTP/2](https://www.rfc-editor.org/rfc/rfc9113.html) multiplexa streams sobre uma conexão TCP e comprime campos de cabeçalhos. Se há perda de dados no TCP, a entrega ordenada nessa conexão ainda pode atrasar streams diferentes. A [RFC 9113](https://www.rfc-editor.org/rfc/rfc9113.html) define o protocolo.

[HTTP/3](https://www.rfc-editor.org/rfc/rfc9114.html) transporta HTTP sobre QUIC, baseado em UDP e com [TLS](https://developer.mozilla.org/en-US/docs/Web/Security/Transport_Layer_Security) integrado. Streams independentes reduzem o bloqueio entre streams causado pela entrega ordenada de uma única conexão TCP, mas não eliminam congestionamento, dependências de aplicação ou todo tipo de espera. Veja a [RFC 9114](https://www.rfc-editor.org/rfc/rfc9114.html).

O resultado depende da rede, servidor, intermediários e negociação. Bloqueio de UDP ou ausência de suporte pode exigir fallback. “HTTP/3 é sempre mais rápido” não é uma conclusão defensável sem medir.

## Verifique o protocolo usado de verdade

Na coluna Protocol do Network, confira se a conexão observada usa `h2`, `h3` ou outra opção. Analise conexão fria e reutilizada separadamente. Não conclua suporte a HTTP/3 apenas por uma configuração no provedor: observe a navegação real.

Multiplexação reduz certas limitações, mas não justifica criar milhares de recursos minúsculos. Headers, agendamento, processamento e dependências ainda têm custos.

## Preload: necessário para esta página

`preload` indica um recurso necessário no carregamento atual que poderia ser descoberto tarde. Um exemplo para uma fonte efetivamente utilizada:

```html
<link rel="preload" href="/fonts/interface.woff2"
  as="font" type="font/woff2" crossorigin>
```

O arquivo precisa existir e corresponder à fonte declarada no CSS. Os atributos de destino e [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS) devem corresponder ao uso; incompatibilidades podem impedir reutilização e produzir trabalho duplicado. O recurso não é aplicado só porque foi baixado.

Não antecipe todos os pesos de fonte. O custo extra pode disputar banda com a imagem principal. A [referência de preload](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/preload) descreve os requisitos; o caso de imagens responsivas está no [guia de imagens](./performance-imagens-lazy-loading.md).

## Prefetch: talvez necessário depois

```html
<link rel="prefetch" href="/ajuda.html">
```

O exemplo pressupõe uma página pública com esse endereço. A indicação é especulativa: o navegador pode não executá-la ou o resultado pode não ser reaproveitado em outro contexto. Suporte, prioridade e particionamento do cache influenciam esse comportamento, como detalha a [referência de prefetch](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/prefetch).

Evite antecipar conteúdo sensível ou endpoints que alteram estado. Prefetch pode gerar tráfego mesmo sem a pessoa navegar. Em redes restritas, baixar possibilidades demais custa dados sem benefício.

## Preconnect, dns-prefetch e modulepreload

[`preconnect`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/preconnect) pode preparar a conexão com uma origem provavelmente necessária. [`dns-prefetch`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/dns-prefetch) antecipa apenas resolução de nome. [`modulepreload`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/modulepreload) é direcionado ao carregamento de módulos JavaScript e participa de sua preparação de forma diferente de um preload genérico de script.

Esses mecanismos são dicas, não substitutos para uma arquitetura de carregamento. Use poucas origens relevantes; abrir conexões para terceiros que não serão usados também custa recursos e tem consequências de privacidade.

## Um experimento que distingue causa e efeito

Escolha um recurso crítico que inicia tarde. Registre o initiator e a dependência que o revela. Depois teste uma única indicação compatível e compare início, reutilização e métrica da jornada.

Se o recurso começa antes, mas o [LCP](https://web.dev/articles/lcp) não melhora, investigue o atraso até renderizá-lo. Se houver dois downloads, compare URL, destino, credenciais e política CORS. Remova a dica quando ela não trouxer benefício mensurável.

Para revalidação e duração de respostas, o conteúdo principal está no [guia de cache HTTP](./performance-cache-memoization.md); protocolo e resource hints não substituem essa política.
