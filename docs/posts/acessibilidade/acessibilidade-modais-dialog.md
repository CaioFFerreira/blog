---
title: 'Modais acessíveis: dialog, foco inicial e retorno ao contexto'
description: 'Implemente um diálogo modal nativo com nome, fechamento por teclado e retorno de foco, e confira os limites do exemplo antes de reutilizá-lo.'
date: '2026-10-16'
category: 'Acessibilidade'
tags:
  - Modais
  - dialog
  - Focus management
  - ARIA
---

Um modal interrompe o fluxo e exige que a interação fique dentro dele enquanto estiver aberto. Nome, foco, conteúdo de fundo e forma de sair fazem parte do componente; não são detalhes opcionais do acabamento.

A janela que pergunta “Deseja excluir este arquivo?” é um exemplo de modal. **Foco** é o ponto da interface que recebe a interação do teclado. Ao abrir essa janela, precisamos levar o foco para ela; ao fechar, devolver a pessoa a um lugar coerente para continuar a tarefa.

## Prefira dialog quando ele atender ao seu caso

O elemento `dialog`, aberto com `showModal()`, oferece comportamento modal nativo, posicionamento na top layer e torna o restante do documento inerte para interação. Abrir apenas com o atributo `open` ou com `show()` não produz o mesmo comportamento modal.

Ainda precisamos dar um nome ao diálogo, escolher o foco inicial e validar a experiência. O [guia de dialog da MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog) explica essas diferenças.

## Um exemplo completo de confirmação

Crie uma página HTML com este conteúdo e carregue o JavaScript em um script de módulo depois dos elementos:

```html
<button id="abrir-exclusao" type="button">Excluir rascunho</button>

<dialog id="confirmacao" aria-labelledby="confirmacao-titulo"
  aria-describedby="confirmacao-descricao">
  <h2 id="confirmacao-titulo">Excluir rascunho?</h2>
  <p id="confirmacao-descricao">Esta ação não poderá ser desfeita.</p>
  <form method="dialog">
    <button id="cancelar-exclusao" value="cancelar" autofocus>Cancelar</button>
    <button value="excluir">Excluir rascunho</button>
  </form>
</dialog>

<p id="resultado-exclusao" role="status"></p>
```

```js
const abrir = document.querySelector('#abrir-exclusao')
const dialogo = document.querySelector('#confirmacao')
const cancelar = document.querySelector('#cancelar-exclusao')
const resultado = document.querySelector('#resultado-exclusao')

if (!(abrir instanceof HTMLButtonElement)
  || !(dialogo instanceof HTMLDialogElement)
  || !(cancelar instanceof HTMLButtonElement)
  || !(resultado instanceof HTMLElement)) {
  throw new Error('Os elementos de confirmação não foram encontrados.')
}

let focoAnterior = null

abrir.addEventListener('click', () => {
  focoAnterior = document.activeElement
  dialogo.returnValue = ''
  resultado.textContent = ''
  dialogo.showModal()
  cancelar.focus()
})

dialogo.addEventListener('close', () => {
  if (focoAnterior instanceof HTMLElement && focoAnterior.isConnected) {
    focoAnterior.focus()
  }

  resultado.textContent = dialogo.returnValue === 'excluir'
    ? 'Exclusão confirmada. Nenhum dado foi alterado neste exemplo.'
    : 'Exclusão cancelada.'
})
```

O formulário com `method="dialog"` fecha o diálogo e fornece o valor do botão acionado. O exemplo não exclui dados nem envia uma requisição. Em uma aplicação real, trate a operação e suas falhas antes de anunciar conclusão.

O nome vem do título visível. A descrição curta complementa o contexto. Para conteúdo longo e estruturado, não associe automaticamente todo o corpo por [`aria-describedby`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-describedby): um anúncio extenso pode dificultar a navegação pelo próprio conteúdo.

## Por que começar em Cancelar?

Para uma ação destrutiva difícil de desfazer, colocar o foco inicial na opção menos destrutiva ajuda a evitar confirmação involuntária. Em um formulário de edição, o primeiro campo pode ser mais apropriado; em um diálogo de leitura longa, um título focável programaticamente pode orientar melhor o início.

Não há uma regra universal de sempre focar o primeiro botão. A decisão depende da tarefa. O [padrão de diálogo modal da APG](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) apresenta o contrato de teclado e casos de foco inicial.

## Fechamento e retorno de foco

O comportamento nativo permite fechar esse modal com Escape. Não cancelamos o evento `cancel`, preservando essa saída. O botão Cancelar também oferece uma ação explícita.

Ao fechar, voltamos ao controle anterior se ele ainda existe. Neste exemplo, ele permanece na página. Se a exclusão real remover a linha que continha o acionador, escolha outro destino lógico, como a próxima linha ou o título da lista.

O clique no fundo não é usado como única saída e não foi implementado neste exemplo. O tratamento de scroll de fundo e outros detalhes visuais também precisa ser validado conforme o layout e os navegadores suportados.

## Evite um modal que só é modal no nome

Adicionar `role="dialog"` e `aria-modal="true"` a uma `div` não torna o fundo inerte, não contém Tab e não implementa Escape. Uma solução customizada precisa implementar e testar todo esse contrato.

Não aplique `aria-hidden` a um ancestral que contenha o próprio diálogo. Evite recriar a contenção de foco nativa com um listener global de Tab sem necessidade: elementos dinâmicos e condições de visibilidade tornam esse código frágil.

## Checklist manual

Abra com teclado e confira foco inicial e nome anunciado. Percorra para frente e para trás e confirme que a interação não entra no conteúdo de fundo. Feche com Escape, com Cancelar e com a confirmação, reabrindo a cada teste.

Depois teste leitor de tela, zoom, conteúdo longo e telas pequenas. O diálogo inteiro e suas ações precisam continuar alcançáveis, sem depender de uma altura fixa que corte botões.

## Continue estudando

- [Teclado e foco](./acessibilidade-teclado-foco.md)
- [Mensagens de status após uma ação](./acessibilidade-formularios-erros-aria-live.md)
