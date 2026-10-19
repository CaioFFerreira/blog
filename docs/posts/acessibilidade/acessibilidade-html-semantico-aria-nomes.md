---
title: 'HTML semântico, ARIA e nomes acessíveis: comunicar a intenção da interface'
description: 'Escolha elementos nativos, diferencie nome de descrição e exponha estados sem criar controles que só funcionam visualmente.'
date: '2026-10-16'
category: 'Acessibilidade'
tags:
  - HTML semântico
  - ARIA
  - Accessible names
---

Um componente tem aparência, comportamento e informação programática. Um leitor de tela precisa reconhecer o que ele é, como se chama e qual é seu estado. Um botão desenhado como botão, mas implementado como uma `div` clicável, pode falhar nessas outras dimensões.

**HTML semântico** é usar elementos pelo seu significado: um `<button>` representa uma ação e um `<a>` representa um link. **ARIA** é um conjunto de atributos que comunica informações de acessibilidade quando o HTML sozinho não basta. A ideia é fazer a função do controle ser compreendida também por quem não depende de sua aparência.

## Comece pelo elemento que já oferece o comportamento

Use um link com `href` para navegar e um `button` para executar uma ação. Um botão nativo já participa da navegação por teclado e oferece ativação esperada. `role="button"` não adiciona esses comportamentos a uma `div`.

```html
<a href="/artigos/">Ver artigos</a>
<button type="button">Abrir filtros</button>
```

Um caminho com barra inicial parte da raiz do domínio; adapte URLs ao caminho base da aplicação. Em formulários, declare `type="button"` em ações que não devem enviar os dados.

Organize páginas com um `main` para o conteúdo principal, títulos que representem a hierarquia e regiões como `nav`, `header` e `footer` conforme sua função. Use CSS para aparência, não o nível do título para obter uma fonte maior. Um `h1` claro para a página é uma convenção útil, mas a avaliação não se resume a contar títulos.

## O que é um nome acessível?

É o texto pelo qual um controle pode ser identificado programaticamente. O botão “Salvar rascunho” normalmente recebe esse nome a partir do conteúdo. Um campo recebe o nome por uma `label` associada.

```html
<label for="busca">Buscar artigos</label>
<input id="busca" type="search" aria-describedby="busca-ajuda">
<p id="busca-ajuda">Você pode buscar pelo título ou assunto.</p>
```

O nome é “Buscar artigos”; a ajuda é uma descrição complementar. Descrição não substitui nome, e placeholder não substitui uma label persistente.

Se houver um título visível adequado, [`aria-labelledby`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-labelledby) permite usá-lo para nomear um elemento. Quando não há texto visível, um [`aria-label`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-label) pode ser apropriado em elementos que aceitam nomeação, como um botão com ícone:

```html
<button type="button" aria-label="Fechar filtros">
  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
    <path d="M6 6 18 18 M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2"></path>
  </svg>
</button>
```

O SVG é decorativo dentro desse controle. O nome descreve a ação, não a forma do ícone. A área clicável também precisa de tamanho e foco adequados.

## Não sobrescreva o texto visível sem necessidade

`aria-label` e `aria-labelledby` podem substituir o nome que viria do conteúdo. Se o botão mostra “Salvar”, mas recebe `aria-label="Confirmar alterações"`, pessoas que usam comandos de voz podem tentar dizer “Salvar” e não encontrar a correspondência.

Mantenha o texto visível no nome acessível, idealmente no início. Para cards com vários links “Ler artigo”, dê contexto: um link cujo próprio texto é o título costuma ser mais útil que muitos nomes idênticos.

O cálculo do nome tem regras próprias, descritas nas [orientações sobre nomes e descrições da APG](https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/). Inspecione o nome calculado no navegador em vez de deduzi-lo só pela aparência.

## ARIA comunica estado; JavaScript precisa manter a verdade

Neste exemplo completo, em um HTML com script de módulo, o botão expõe se o painel está aberto:

```html
<button id="abrir-filtros" type="button" aria-expanded="false" aria-controls="filtros">
  Filtros
</button>
<section id="filtros" hidden aria-labelledby="titulo-filtros">
  <h2 id="titulo-filtros">Filtrar artigos</h2>
  <label><input type="checkbox"> Somente não estudados</label>
</section>

<script type="module">
  const botao = document.querySelector('#abrir-filtros')
  const painel = document.querySelector('#filtros')

  botao.addEventListener('click', () => {
    const aberto = botao.getAttribute('aria-expanded') === 'true'
    botao.setAttribute('aria-expanded', String(!aberto))
    painel.hidden = aberto
  })
</script>
```

`aria-controls` indica a relação; [`aria-expanded`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-expanded) informa o estado. Nenhum desses atributos mostra o painel sozinho. O foco fica no botão, e a pessoa pode avançar para o conteúdo com Tab.

## Cuidados frequentes

- Não coloque `aria-hidden="true"` em um controle focável ou em um ancestral que ainda contenha controles acessíveis pelo teclado.
- Não use [ARIA](https://www.w3.org/WAI/ARIA/apg/) incompatível com o papel do elemento. Uma checkbox nativa já expõe seu estado por `checked`.
- Evite `role="application"` para páginas comuns: ele pode alterar a forma de interação do leitor de tela.
- IDs referenciados precisam existir e ser únicos no documento.
- Informação essencial não deve existir só em `title`, hover ou ícone sem nome.

## Como verificar

Inspecione papel, nome, descrição e estado na árvore de acessibilidade. Teste Tab e ativação. Depois use um leitor de tela e confira se a pessoa entende a ação antes de executá-la.

## Continue estudando

- [Primeira regra de ARIA e semântica nativa — W3C](https://www.w3.org/TR/using-aria/#rule1)
- [Formulários, erros e mensagens dinâmicas](./acessibilidade-formularios-erros-aria-live.md)
- [Testar com leitores de tela e axe](./acessibilidade-testes-screen-readers-axe.md)
