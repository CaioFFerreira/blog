---
title: 'Teclado e gerenciamento de foco: manter a pessoa orientada'
description: 'Construa uma ordem de navegação coerente, preserve foco visível e decida para onde ele vai após abrir, remover ou trocar conteúdo.'
date: '2026-10-16'
category: 'Acessibilidade'
tags:
  - Navegação por teclado
  - Focus management
  - WCAG
---

Teclado não é apenas uma alternativa ao clique. Pessoas usam Tab, atalhos de leitores de tela, comandos de voz e outros mecanismos que dependem de controles reconhecíveis e foco previsível.

Você pode experimentar agora: pressione **Tab** para avançar entre controles e **Shift + Tab** para voltar. O elemento destacado está com o **foco**, isto é, recebe a próxima ação do teclado. O objetivo deste guia é garantir que uma tarefa inteira possa ser concluída assim, sem depender de descobrir onde clicar.

## Faça o fluxo inteiro sem mouse

Comece no endereço da página e avance usando Tab. Volte com Shift+Tab. Ative links com Enter e botões com Enter ou Espaço. Checkbox nativa costuma alternar com Espaço; grupos de radios usam também setas.

Nem todo elemento deve receber Tab. Textos e títulos normalmente são lidos por outros mecanismos, especialmente com leitores de tela. Em componentes compostos, como abas, as setas podem mover entre opções enquanto Tab entra ou sai do conjunto. Siga o padrão do componente; não invente um contrato de teclado por tela.

Essas convenções estão nas [orientações de interface de teclado da APG](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/).

## Ordem visual e ordem do documento

A ordem sequencial deriva principalmente do [DOM](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model). Reorganizar elementos com CSS não reorganiza necessariamente sua navegação. Se o foco salta de um lugar para outro sem relação com a leitura visual, examine a estrutura antes de acrescentar `tabindex`.

| Valor | Efeito esperado |
| --- | --- |
| Sem `tabindex` | O elemento segue o comportamento nativo |
| `tabindex="0"` | Inclui na ordem sequencial, conforme o DOM |
| `tabindex="-1"` | Permite foco programático, sem inserir na sequência normal de Tab |

Evite valores positivos para “corrigir” ordem. Eles criam uma sequência prioritária difícil de manter. Dar `tabindex="0"` a uma `div` também não transforma essa `div` em botão.

## Foco precisa ser percebido e continuar visível

```css
:focus-visible {
  outline: 3px solid #174ea6;
  outline-offset: 3px;
}

[id] {
  scroll-margin-top: 6rem;
}
```

Este CSS é um ponto de partida para uma página clara; confira o contraste em cada superfície. `scroll-margin-top` pode ajudar com um cabeçalho fixo, mas não garante que todo controle focado ficará descoberto.

Não remova `outline` sem substituto. Teste menus fixos, banners e drawers para verificar se escondem o foco. Na [WCAG 2.2](https://www.w3.org/TR/WCAG22/), 2.4.11 é o critério AA de foco não totalmente encoberto; 2.4.13, que trata de requisitos adicionais de aparência do foco, é AAA. Evite apresentar todos esses requisitos como se tivessem o mesmo nível.

## Ofereça um caminho para pular blocos repetidos

```html
<a class="pular" href="#conteudo">Pular para o conteúdo</a>
<nav aria-label="Principal">...</nav>
<main id="conteudo" tabindex="-1">
  <h1>Artigos</h1>
</main>
```

O link deve aparecer quando recebe foco, mesmo que fique visualmente escondido no estado inicial. Substitua as reticências pela navegação real. Teste se a ativação posiciona o foco e a leitura no destino esperado nos ambientes suportados.

## Quando mover o foco programaticamente?

Mova quando a mudança exige uma nova posição lógica. Exemplos: entrar em um modal, chegar ao resumo de erros após um envio inválido ou orientar a pessoa após uma navegação interna que troca o conteúdo principal.

Em uma SPA, atualize o título do documento e escolha uma estratégia para navegação: por exemplo, focar o título da nova página com `tabindex="-1"` depois que ele existir. Considere também voltar/avançar e navegações dentro da própria página. Não mova foco a cada atualização reativa.

Se uma busca atualiza resultados enquanto a pessoa digita, mantenha o foco no input e anuncie um status relevante. Se um item é excluído, escolha um destino coerente, como a próxima ação disponível, em vez de deixar o foco desaparecer com o nó removido.

## Teste o caminho de volta

Teste também a transição de saída de um componente, não só sua abertura. O [exemplo completo de modal](./acessibilidade-modais-dialog.md) concentra a implementação de Escape, foco inicial e retorno ao acionador, incluindo o caso em que esse acionador deixa de existir.

Registre os passos exatos: “após excluir o terceiro item, Tab reinicia no topo” é mais útil do que “foco quebrado”.

## Continue estudando

- [Foco visível — W3C](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html)
- [Modal com foco e retorno](./acessibilidade-modais-dialog.md)
- [Formulários e erros](./acessibilidade-formularios-erros-aria-live.md)
