---
title: 'Da URL aos pixels: o caminho de uma página no navegador'
description: 'Conecte DNS, conexão, HTTP, DOM, CSSOM, layout, paint e composição, identificando em qual etapa uma mudança realmente atua.'
date: '2026-10-16'
category: 'Navegador'
tags:
  - DNS
  - DOM
  - CSSOM
  - Render Tree
  - Rendering
---

Imagine digitar o endereço de um site e ver o conteúdo aparecer. Entre esses momentos, o navegador localiza o servidor, recebe arquivos, interpreta HTML e CSS e desenha a tela. **Parsing** é essa interpretação da estrutura; **renderização** envolve produzir a apresentação visual. Vamos acompanhar as etapas para descobrir onde um atraso pode nascer.

Ao abrir uma URL, o navegador coordena rede, parsing e renderização. Entender essa sequência permite explicar por que um recurso atrasou ou por que uma alteração visual custou mais do que parecia.

O modelo abaixo organiza as etapas, mas não descreve uma fila rigidamente sequencial: downloads, parsing e trabalho de renderização podem se sobrepor, e caches ou conexões existentes podem evitar etapas.

```text
URL → resolução de DNS → conexão segura → requisição HTTP
                                               │
                                               ▼
                                          bytes de HTML
                                               │
                          ┌────────────────────┴───────────────┐
                          ▼                                    ▼
                         DOM                           CSS → CSSOM
                          └────────────────────┬───────────────┘
                                               ▼
                                   estilos e árvore de renderização
                                               ▼
                                            Layout
                                               ▼
                                            Paint
                                               ▼
                                           Composite
```

## URL, DNS e conexão

O navegador interpreta esquema, host, porta, caminho, query e fragmento. O fragmento, como `#referencias`, não é enviado na requisição [HTTP](https://www.rfc-editor.org/rfc/rfc9110.html). Redirecionamentos podem acrescentar novas requisições antes do documento final.

[DNS](https://developer.mozilla.org/en-US/docs/Glossary/DNS) resolve o host em informações de endereçamento, com participação de caches. Uma conexão existente pode ser reutilizada. Em HTTPS sobre [HTTP/2](https://www.rfc-editor.org/rfc/rfc9113.html), normalmente há TCP e [TLS](https://developer.mozilla.org/en-US/docs/Web/Security/Transport_Layer_Security); [HTTP/3](https://www.rfc-editor.org/rfc/rfc9114.html) usa QUIC, com segurança integrada ao protocolo. Não atribua um número fixo de viagens de rede a qualquer navegação: versão, retomada e reutilização mudam esse custo.

Para comparar os protocolos, continue no [guia de HTTP/2, HTTP/3 e resource hints](./navegador-http-preload-prefetch.md).

## HTTP entrega bytes, não uma página pronta

O navegador envia a requisição e recebe status, cabeçalhos e corpo. Uma resposta pode vir do cache ou de um [Service Worker](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API), sem buscar todo o conteúdo na origem naquele momento.

O parser pode começar a processar HTML antes de o corpo inteiro terminar de chegar. Ao encontrar referências, o navegador descobre recursos adicionais; mecanismos de descoberta antecipada também ajudam a iniciar downloads.

O momento em que um recurso é descoberto e sua prioridade podem importar tanto quanto seus bytes. A investigação da cadeia de dependências está no [guia de network waterfall](./performance-devtools-network-waterfall.md).

## DOM e CSSOM

O [DOM](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model) representa a estrutura do documento em nós. O [CSSOM](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Object_Model) representa as regras de estilo disponíveis. O navegador resolve a cascata e os estilos aplicáveis; um elemento `display: none` não gera caixas de layout, enquanto um elemento `visibility: hidden` normalmente ainda ocupa espaço.

“Render Tree” é um modelo útil para discutir o que participa da apresentação. Motores reais mantêm diferentes estruturas internas; ela não deve ser confundida com a árvore de acessibilidade, que representa outra dimensão do conteúdo.

Scripts clássicos sem [`defer`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script#defer) ou `async` podem interromper o parsing para executar. Scripts `defer` aguardam o parsing e preservam a ordem entre eles; módulos são adiados por padrão quando não marcados como `async`. `async` permite execução quando o recurso estiver disponível, sem garantir a ordem de documento entre scripts independentes.

CSS necessário à apresentação normalmente bloqueia a renderização inicial. Isso não significa que todo download de CSS pare o parser de HTML da mesma maneira que um script bloqueante.

## Layout, paint e composição são custos diferentes

Layout calcula geometria: tamanhos e posições. Paint produz instruções de desenho para conteúdo visual, que serão rasterizadas. Composição combina as superfícies e camadas necessárias para apresentar o frame.

Uma mudança de largura pode afetar geometria e disparar etapas posteriores. Uma animação de `transform` ou `opacity` pode, em condições adequadas, evitar layout e paint repetidos, mas isso depende da implementação e das camadas disponíveis. Não prometa “roda na GPU sem custo” só pela propriedade escolhida.

Adicionar muitas camadas também custa memória. [`will-change`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/will-change) permanente em todos os elementos pode piorar o resultado; use evidência do profiler.

## Um experimento sobre layout síncrono

Numa página com vários elementos `.linha`, compare agrupar leituras e escritas a alterná-las repetidamente:

```js
const linhas = [...document.querySelectorAll('.linha')]
const larguras = linhas.map(linha => linha.getBoundingClientRect().width)

linhas.forEach((linha, indice) => {
  linha.style.width = `${larguras[indice] + 1}px`
})
```

O exemplo mede tudo antes de escrever. Ler geometria após uma escrita que invalidou layout pode exigir atualização síncrona. O trecho não garante melhoria em qualquer página: grave um trace e procure o custo de layout no cenário real.

## Continue estudando

- [Como navegadores carregam páginas — MDN](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/How_browsers_work)
- [Long tasks e resposta a interações](./performance-long-tasks.md)
- [Core Web Vitals](./performance-core-web-vitals.md)
