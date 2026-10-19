---
title: 'Imagens rápidas: tamanho certo, prioridade e lazy loading'
description: 'Entregue variantes responsivas, reserve espaço para evitar deslocamentos e diferencie a imagem principal das imagens fora da tela.'
date: '2026-10-16'
category: 'Performance'
tags:
  - Image optimization
  - Lazy loading
  - LCP
  - CLS
---

Imagine uma imagem de 4.000 pixels exibida num espaço de 400 pixels: podemos estar transferindo mais dados do que a tela precisa. Uma imagem **responsiva** permite escolher recursos adequados ao espaço e ao dispositivo. **Lazy loading** adia o carregamento; por isso, é útil distinguir a imagem que a pessoa precisa ver imediatamente das que estão mais abaixo.

Otimizar imagens envolve mais que escolher AVIF ou WebP. É preciso entregar dimensões adequadas, descobrir o recurso no momento certo e reservar seu espaço antes do download.

## Comece pelo papel da imagem

Uma imagem de destaque visível ao abrir a página pode ser candidata a [LCP](https://web.dev/articles/lcp). Uma foto no final do artigo normalmente pode esperar. Aplicar a mesma política a ambas pode atrasar o conteúdo principal.

No DevTools, identifique a imagem LCP e confira quando a requisição começou. Não presuma que a maior imagem em bytes é o elemento LCP.

## Um exemplo responsivo para a imagem principal

Este HTML é um modelo para um site que realmente tenha as variantes indicadas; os arquivos não são recursos estáticos deste blog.

```html
<img
  src="/imagens/capa-1280.webp"
  srcset="/imagens/capa-640.webp 640w,
          /imagens/capa-1280.webp 1280w"
  sizes="(max-width: 700px) calc(100vw - 48px), 640px"
  width="1280"
  height="720"
  fetchpriority="high"
  alt="Pessoa analisando uma linha do tempo de performance"
  style="display: block; width: 100%; max-width: 640px; height: auto;"
>
```

`srcset` apresenta variantes; `sizes` descreve a largura de exibição esperada. O navegador escolhe um recurso considerando também densidade de pixels e suas próprias heurísticas. `sizes` precisa corresponder ao layout, não apenas repetir os tamanhos dos arquivos.

`width` e `height` informam a proporção para reservar espaço. O CSS permite redimensionar mantendo essa proporção. `fetchpriority="high"` sugere prioridade; não reduz os bytes nem garante tempo de conclusão. Evite colocar prioridade alta em todas as imagens.

Não aplique `loading="lazy"` à imagem principal necessária logo na abertura. Também evite escondê-la atrás de uma sequência desnecessária de requisições JavaScript.

## Imagens abaixo da área inicial

```html
<img
  src="/imagens/exemplo-800.webp"
  width="800"
  height="450"
  loading="lazy"
  decoding="async"
  alt="Comparação de duas versões do mesmo layout"
  style="max-width: 100%; height: auto;"
>
```

O [lazy loading](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Lazy_loading) nativo permite adiar imagens fora da área visível conforme critérios do navegador. `decoding="async"` é uma indicação sobre decodificação; não é sinônimo de lazy loading nem impede que a imagem custe CPU e memória.

A reserva de espaço continua necessária. Adiar um download não deve fazer o parágrafo saltar quando a imagem finalmente aparece.

## Formato e compressão exigem comparação visual

Teste AVIF ou WebP em fotografias; SVG pode ser adequado para ilustrações vetoriais. Se houver necessidade de formatos alternativos ou direção de arte, use `picture` com fontes compatíveis e um `img` de fallback.

Compare arquivos na mesma dimensão e com qualidade visual aceitável. Artefatos em texto dentro de screenshots, transparência e tempo de codificação influenciam a decisão. Um JPEG bem dimensionado pode ser melhor que um arquivo moderno enorme.

Não envie uma imagem de 4000 px para um espaço de 300 px sem avaliar variantes. O custo não é só a transferência: uma imagem descomprimida pode ocupar muito mais memória que seu arquivo comprimido.

## Preload: use quando houver atraso de descoberta comprovado

Um preload pode antecipar um recurso crítico que seria descoberto tarde, mas configurá-lo incorretamente pode gerar download duplicado ou disputar banda com conteúdo mais importante. Para imagens responsivas, alinhe os candidatos e as regras do preload com os do elemento.

Se o `img` já está cedo no HTML e recebe prioridade adequada, meça antes de acrescentar outro mecanismo. Mais dicas de prioridade não significam automaticamente carregamento melhor.

## Roteiro de validação

1. Teste viewport e densidade de pixels diferentes e confira qual variante foi baixada.
2. Observe dimensões renderizadas, peso transferido e qualidade visual.
3. Grave o carregamento para verificar espaço reservado e deslocamentos.
4. Compare o início da requisição e o LCP sob condições equivalentes.
5. Role a página e confirme que imagens adiadas aparecem sem prejudicar a leitura.

## Referências

- [Imagens responsivas — MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Responsive_images)
- [Lazy loading nativo de imagens — web.dev](https://web.dev/articles/browser-level-image-lazy-loading)
- [Core Web Vitals na prática](./performance-core-web-vitals.md)
