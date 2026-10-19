---
title: "Bundles, code splitting e tree shaking: carregar menos JavaScript"
description: "Entenda o que chega ao navegador, o que pode ser adiado e o que pode ser removido, medindo também o trabalho de execução."
date: '2026-10-16'
category: 'Performance'
tags:
  - Bundle analysis
  - Code splitting
  - Lazy loading
  - Tree shaking
---

O **bundle** é um arquivo que reúne código para entrega. **Code splitting** divide o código em partes; **lazy loading** escolhe carregar uma parte apenas quando necessária; **tree shaking** tenta retirar código não utilizado. Imagine uma área de relatórios pouco acessada: podemos adiar seu carregamento sem confundir isso com apagar sua funcionalidade.

O custo de JavaScript inclui transferência, descompressão, parse, compilação e execução. Um arquivo pequeno comprimido ainda pode fazer muito trabalho ao executar. Analise bytes e CPU juntos.

## Bundle analysis: descubra o conteúdo real

Gere um build de produção. Use um analisador compatível com seu bundler para visualizar módulos, dependências e chunks. No ecossistema Rollup, por exemplo, existe o [rollup-plugin-visualizer](https://github.com/btd/rollup-plugin-visualizer).

Antes de instalar uma ferramenta, confira se o relatório do build e o [Network](https://developer.chrome.com/docs/devtools/network) já respondem à pergunta. Um mapa de módulos ajuda a encontrar candidatos, não comprova que todos são carregados na primeira rota.

Procure dependências duplicadas, bibliotecas usadas para uma função pequena e recursos exclusivos de telas secundárias presentes no caminho inicial. Diferencie tamanho original, minificado e comprimido; compare a mesma medida antes e depois.

## Code splitting: separar o que pode ser carregado depois

Imports dinâmicos permitem estabelecer uma fronteira de carregamento. Em um projeto com bundler, considere dois arquivos de exemplo.

Em `relatorio.js`:

```js
export function gerarRelatorio() {
  return 'Relatório pronto'
}
```

Em `main.js`, servido como módulo em uma página com um botão `id="relatorio"` e um parágrafo `id="resultado"`:

```js
const botao = document.querySelector('#relatorio')
const resultado = document.querySelector('#resultado')

if (!(botao instanceof HTMLButtonElement)
  || !(resultado instanceof HTMLParagraphElement)) {
  throw new Error('Adicione o botão e a área de resultado ao HTML.')
}

botao.addEventListener('click', async () => {
  botao.disabled = true
  resultado.textContent = 'Preparando relatório…'

  try {
    const { gerarRelatorio } = await import('./relatorio.js')
    resultado.textContent = gerarRelatorio()
  } catch {
    resultado.textContent = 'Falha ao carregar. Tente novamente.'
  } finally {
    botao.disabled = false
  }
})
```

O conteúdo opcional só é solicitado quando a pessoa usa o botão, sujeito às decisões e otimizações do bundler. A primeira interação pode pagar o download e a avaliação desse módulo: ofereça feedback e trate falhas.

O relatório mínimo acima apenas demonstra a fronteira. Separar uma função tão pequena dificilmente justifica um chunk real. A técnica faz sentido para recursos maiores e opcionais, como editores, gráficos ou rotas secundárias.

## Lazy loading é a política; splitting é um mecanismo

[Code splitting](https://webpack.js.org/guides/code-splitting/) cria unidades separadas. [Lazy loading](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Lazy_loading) decide carregá-las sob demanda. Um recurso dividido que é imediatamente importado no início pode continuar fazendo parte do custo inicial.

Também verifique se o módulo opcional não é importado estaticamente por outro caminho. Confira a rede no build publicado, incluindo preloads e dependências compartilhadas. Dividir demais pode aumentar coordenação, requisições e dependências em sequência.

## Tree shaking: remover código que não é necessário

Módulos ES têm uma estrutura que ferramentas podem analisar estaticamente. A técnica de [tree shaking](https://webpack.js.org/guides/tree-shaking/) permite ao bundler remover exports não utilizados, desde que preserve efeitos observáveis.

Imagine um módulo que exporta `somar` e `multiplicar`, enquanto a aplicação só importa `somar`. A ferramenta pode eliminar o código não necessário. Mas uma chamada no topo do módulo, como registrar um listener global, tem efeito colateral e pode precisar ser preservada.

`sideEffects: false` em um pacote é uma declaração sobre esses efeitos, não um botão mágico de otimização. Uma configuração incorreta pode remover inicializações ou imports de CSS necessários. Use-a apenas quando o contrato for verdadeiro, ou declare exceções apropriadas. A [documentação do webpack](https://webpack.js.org/guides/tree-shaking/) detalha essa diferença.

Minificação reduz a representação do código; tree shaking pode remover partes; splitting reorganiza o carregamento. As estratégias se complementam, mas não são sinônimos.

## Experimento recomendado

1. Escolha uma rota e registre os chunks realmente solicitados no primeiro acesso.
2. Identifique um recurso opcional grande no analisador.
3. Adie-o com uma fronteira de import dinâmico coerente.
4. Compare bytes iniciais, trabalho de CPU e tempo até usar o recurso opcional.
5. Teste falha de carregamento e a navegação após um novo deploy.

Preservar recursos estáticos antigos durante a transição de versões ajuda a evitar que uma aba antiga peça um chunk já removido. A estratégia depende da hospedagem; HTML e recursos estáticos versionados também precisam de políticas de cache compatíveis.

## Continue estudando

- [Módulos ES e import dinâmico](./javascript-modulos-es.md)
- [Diagnóstico com waterfall](./performance-devtools-network-waterfall.md)
- [Cache HTTP e invalidação](./performance-cache-memoization.md)
