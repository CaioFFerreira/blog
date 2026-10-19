---
title: 'Formulários acessíveis: rótulos, erros e aria-live sem ruído'
description: 'Associe instruções e mensagens aos campos, preserve os dados após falhas e anuncie atualizações sem interromper o preenchimento.'
date: '2026-10-16'
category: 'Acessibilidade'
tags:
  - Formulários acessíveis
  - Mensagens de erro
  - aria-live
---

Um formulário precisa explicar o que pede, permitir o preenchimento e ajudar a corrigir o que deu errado. A validação faz parte da experiência; uma borda vermelha não cumpre esse papel sozinha.

Pense num campo de e-mail: a pessoa precisa saber o que digitar, perceber que houve um erro e encontrar uma forma de corrigi-lo. Um **leitor de tela** apresenta informações da interface por voz ou braille. Por isso, o rótulo e a mensagem de erro precisam estar ligados ao campo no HTML, além de aparecer visualmente perto dele.

## Comece pelos recursos nativos

Use `label`, tipos apropriados, `required`, `autocomplete` e agrupamentos com `fieldset` e `legend` quando houver uma pergunta com várias opções relacionadas. Informe os campos obrigatórios em texto, sem depender apenas de um asterisco não explicado.

Validação nativa pode ser uma boa escolha, mas teste sua apresentação nos ambientes suportados. Se você optar por `novalidate` e mensagens próprias, passa a ser responsável por exibir, associar e orientar a correção dos erros.

## Exemplo completo de validação customizada

Este exemplo demonstra um único campo. Coloque o HTML em uma página e o script após ele, ou em um módulo carregado por essa página. Não há envio real para uma API.

```html
<form id="cadastro" novalidate>
  <label for="email">E-mail (obrigatório)</label>
  <p id="email-ajuda">Use um endereço que você consiga acessar.</p>
  <input id="email" name="email" type="email" autocomplete="email"
    required aria-describedby="email-ajuda">
  <p id="email-erro" hidden></p>
  <button type="submit">Cadastrar</button>
</form>
<p id="cadastro-status" role="status"></p>
```

```js
const formulario = document.querySelector('#cadastro')
const email = document.querySelector('#email')
const erro = document.querySelector('#email-erro')
const status = document.querySelector('#cadastro-status')

if (!(formulario instanceof HTMLFormElement)
  || !(email instanceof HTMLInputElement)
  || !(erro instanceof HTMLElement)
  || !(status instanceof HTMLElement)) {
  throw new Error('A estrutura do formulário não foi encontrada.')
}

function limparErro() {
  email.removeAttribute('aria-invalid')
  email.setAttribute('aria-describedby', 'email-ajuda')
  erro.hidden = true
  erro.textContent = ''
}

formulario.addEventListener('submit', event => {
  event.preventDefault()
  status.textContent = ''
  limparErro()

  if (!email.validity.valid) {
    erro.textContent = email.validity.valueMissing
      ? 'Informe seu e-mail.'
      : 'Informe um endereço de e-mail válido, como nome@exemplo.com.'
    erro.hidden = false
    email.setAttribute('aria-invalid', 'true')
    email.setAttribute('aria-describedby', 'email-ajuda email-erro')
    email.focus()
    return
  }

  status.textContent = 'Validação concluída. Nenhum dado foi enviado neste exemplo.'
})

email.addEventListener('input', () => {
  status.textContent = ''
  if (email.validity.valid) limparErro()
})
```

O erro aparece em texto e é ligado ao campo por [`aria-describedby`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-describedby). `aria-invalid` informa o estado; ele não valida nem exibe nada por conta própria. A ajuda permanece associada junto do erro.

Não marcamos o campo como inválido antes de a pessoa tentar enviar. Após a correção, o erro sai quando o valor atende à restrição. O endereço permanece preenchido, evitando retrabalho. Uma API real ainda precisa validar os dados no servidor.

## Para vários erros, considere um resumo

Após um envio inválido, um resumo no início do formulário pode listar os campos com problemas e oferecer links para eles. Dê ao resumo um título claro e, se essa for a estratégia de foco escolhida, permita foco programático com `tabindex="-1"`.

Mantenha também a mensagem perto de cada campo. “Há três erros” informa quantidade, mas não explica como corrigir. Ao ativar um link do resumo, confira se o campo recebe o foco esperado.

Evite empilhar foco no resumo, `role="alert"` em cada erro e outro anúncio global ao mesmo tempo. Isso pode repetir a informação e dificultar a orientação. O [tutorial de notificações em formulários](https://www.w3.org/WAI/tutorials/forms/notifications/) apresenta estratégias para esse fluxo.

## aria-live: anunciar mudança sem deslocar o foco

Uma região com `role="status"` tem comportamento implícito de anúncio educado, equivalente a uma região live `polite`, e atomicidade implícita. Ela é adequada para mensagens como “12 artigos encontrados” ou “Rascunho salvo”, quando não é necessário interromper a tarefa.

Crie a região antes da atualização e altere seu conteúdo depois. Um anúncio não é garantido só por inserir uma região já preenchida, e o comportamento varia entre combinações de navegador e leitor de tela.

`role="alert"` implica urgência, com live `assertive`. Reserve para situações que realmente exigem atenção imediata; não para cada letra digitada. Não é necessário repetir atributos implícitos sem motivo, e combinar mecanismos pode gerar anúncios duplicados em alguns ambientes.

`aria-atomic` controla se a região deve ser apresentada como um todo. `aria-busy` pode indicar que uma região está sendo atualizada; não substitui o estado visual nem a lógica de carregamento. Veja os [requisitos para mensagens de status](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html).

## Roteiro de teste

Envie vazio, preencha um valor inválido, corrija e envie novamente usando só teclado. Com leitor de tela, confirme nome, obrigatoriedade, ajuda, estado inválido e erro. Teste também falha de rede e rejeição pelo servidor no fluxo real.

Mensagens devem orientar uma ação possível. Diferencie “e-mail com formato inválido” de “não foi possível concluir agora”. Não apague os dados por uma falha temporária.

## Continue estudando

- [Tutorial de formulários — WAI](https://www.w3.org/WAI/tutorials/forms/)
- [Nomes acessíveis e descrições](./acessibilidade-html-semantico-aria-nomes.md)
- [Testar anúncios com leitores de tela](./acessibilidade-testes-screen-readers-axe.md)
