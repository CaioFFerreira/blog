---
title: 'DOM na prática: encontrar elementos, atualizar conteúdo e ouvir eventos'
description: 'Construa uma pequena lista com APIs do navegador, entendendo seleção, criação de elementos, propagação de eventos e limpeza.'
date: '2026-10-16'
category: 'JavaScript'
tags:
  - DOM
  - Web APIs
  - Eventos
---

O navegador transforma o documento HTML em uma árvore de objetos: o [DOM](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model). As APIs dessa árvore permitem que JavaScript consulte elementos, altere conteúdo e reaja à interação da pessoa.

DOM é uma API do ambiente, não parte da linguagem JavaScript em si. No Node.js, por exemplo, `document` não está disponível por padrão.

O HTML descreve a página; o **DOM** (*Document Object Model*) é a representação desses elementos que o JavaScript pode consultar e alterar. Um **evento** informa que algo aconteceu, como um clique. Um **listener** é a função registrada para reagir a ele. Os exemplos ligam esses três passos: encontrar o elemento, escutar a ação e atualizar a interface.

## Um exemplo completo para experimentar

Crie um HTML com o conteúdo abaixo e coloque o JavaScript da próxima seção em `main.js`, na mesma pasta. Sirva os arquivos com um servidor local.

```html
<form id="formulario">
  <label for="assunto">O que você quer estudar?</label>
  <input id="assunto" name="assunto" required>
  <button type="submit">Adicionar</button>
</form>

<p id="mensagem" role="status"></p>
<ul id="lista"></ul>

<script type="module" src="./main.js"></script>
```

O formulário oferece uma interação que funciona também com Enter. A label nomeia o campo. A região `role="status"` permite anunciar atualizações sem mover o foco.

## Selecionar e verificar os elementos

Comece `main.js` assim:

```js
const formulario = document.querySelector('#formulario')
const campo = document.querySelector('#assunto')
const lista = document.querySelector('#lista')
const mensagem = document.querySelector('#mensagem')

if (!(formulario instanceof HTMLFormElement)
  || !(campo instanceof HTMLInputElement)
  || !(lista instanceof HTMLUListElement)
  || !(mensagem instanceof HTMLParagraphElement)) {
  throw new Error('A estrutura esperada não foi encontrada.')
}

const controller = new AbortController()
```

[`querySelector`](https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector) devolve o primeiro elemento compatível, ou `null`. As verificações evitam tentar usar um elemento inexistente e deixam claro o contrato com o HTML.

Já [`querySelectorAll`](https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelectorAll) devolve uma coleção estática de correspondências: se você adicionar elementos depois, aquela coleção não se atualiza automaticamente.

## Criar conteúdo e tratar o envio

Continue no mesmo arquivo:

```js
formulario.addEventListener('submit', event => {
  event.preventDefault()
  const assunto = campo.value.trim()

  if (!assunto) {
    mensagem.textContent = 'Escreva um assunto antes de adicionar.'
    return
  }

  const item = document.createElement('li')
  const texto = document.createElement('span')
  texto.textContent = assunto

  const remover = document.createElement('button')
  remover.type = 'button'
  remover.textContent = 'Remover'
  remover.dataset.action = 'remover'
  remover.setAttribute('aria-label', `Remover ${assunto}`)

  item.append(texto, ' ', remover)
  lista.append(item)
  campo.value = ''
  campo.focus()
  mensagem.textContent = `${assunto} adicionado à lista.`
}, { signal: controller.signal })
```

[`preventDefault`](https://developer.mozilla.org/en-US/docs/Web/API/Event/preventDefault) impede o envio padrão do formulário, que poderia navegar ou recarregar a página. Ele não interrompe a propagação do evento.

`createElement` constrói um elemento; `append` o insere na árvore. [`textContent`](https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent) trata o assunto como texto: digitar `<strong>teste</strong>` exibe esses caracteres, em vez de criar uma tag.

Não insira texto não confiável com [`innerHTML`](https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML): ele interpreta HTML e pode abrir espaço para injeção. Escolha a API de acordo com o tipo de conteúdo que você realmente quer representar.

## Delegação de eventos: um listener para vários botões

Adicione este trecho depois do anterior:

```js
lista.addEventListener('click', event => {
  if (!(event.target instanceof Element)) return

  const botao = event.target.closest('button[data-action="remover"]')
  if (!botao || !lista.contains(botao)) return

  const item = botao.closest('li')
  if (!item || item.parentElement !== lista) return

  item.remove()
  mensagem.textContent = 'Assunto removido.'
  campo.focus()
}, { signal: controller.signal })
```

O clique de um botão normalmente propaga pelos ancestrais. O listener da lista recebe esse evento e identifica qual botão foi acionado. Como a decisão acontece no clique, botões adicionados depois também funcionam.

`event.target` representa o alvo original, que pode ser um elemento dentro do botão. `closest` procura o botão mais próximo. Já `event.currentTarget` seria a lista, onde o listener foi registrado.

Nem todo evento propaga da mesma forma: `focus`, por exemplo, não faz bubbling, enquanto `focusin` faz. Evite aplicar delegação sem conferir o comportamento do evento.

## Encerre os listeners quando a tela terminar

```js
function encerrarLista() {
  controller.abort()
}
```

Os dois listeners usam o mesmo `signal`. Ao chamar `encerrarLista`, ambos são removidos. Em uma aplicação com componentes, conecte essa função ao ciclo de desmontagem.

Este exemplo mantém os itens apenas no DOM. Recarregar a página apaga a lista. Para persistir dados, mantenha um modelo separado e use uma estratégia como a do [post sobre armazenamento](./javascript-localstorage-sessionstorage-cookies.md).

## Outros recursos úteis do DOM

- `classList.add`, `remove` e `toggle` alteram classes sem reconstruir a string inteira.
- `setAttribute` altera atributos; propriedades como `input.value` representam o estado atual do campo e nem sempre equivalem ao atributo do HTML inicial.
- `replaceChildren` substitui o conteúdo de um elemento.
- `DocumentFragment` pode agrupar nós antes da inserção; não presuma ganho de performance sem medir.

Em Vue, normalmente deixe o template representar o estado. Manipulação direta pode ser útil em integrações e foco, mas modificar a mesma região controlada pelo framework pode gerar inconsistências.

## Continue estudando

- [Introdução ao DOM — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Introduction)
- [addEventListener — MDN](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener)
- [textContent — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent)
- [Debounce e throttle para eventos frequentes](./javascript-debounce-throttle.md)
