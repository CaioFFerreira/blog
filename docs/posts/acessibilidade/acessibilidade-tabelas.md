---
title: 'Tabelas acessíveis: preservar as relações entre cabeçalhos e dados'
description: 'Use caption, th e scope para comunicar dados tabulares, trate ordenação e rolagem e saiba quando uma grid exige outro contrato de interação.'
date: '2026-10-16'
category: 'Acessibilidade'
tags:
  - Tabelas
  - HTML semântico
  - Screen readers
---

Uma tabela comunica relações entre linhas e colunas. Quem navega por suas células precisa descobrir a que cabeçalho cada valor pertence, sem depender da posição visual na tela.

Use tabelas para dados com essa relação, não para montar o layout geral da página. Um conjunto de cards sem relação tabular pode ter outra estrutura mais adequada.

Numa tabela de compras, o valor “R$ 50” só faz sentido quando sabemos de qual produto e de qual coluna ele faz parte. Os cabeçalhos dão esse contexto. Os exemplos usam HTML e um pouco de JavaScript; comece entendendo a relação entre `<table>`, `<tr>`, `<th>` e `<td>` antes de adicionar ordenação.

## Comece com uma tabela simples e explícita

```html
<table>
  <caption>Plano de estudos da semana</caption>
  <thead>
    <tr>
      <th scope="col">Assunto</th>
      <th scope="col">Situação</th>
      <th scope="col">Tempo planejado</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Event Loop</th>
      <td>Em estudo</td>
      <td>30 minutos</td>
    </tr>
    <tr>
      <th scope="row">Formulários acessíveis</th>
      <td>Não iniciado</td>
      <td>45 minutos</td>
    </tr>
  </tbody>
</table>
```

`caption` identifica a tabela. `th` marca cabeçalhos; `scope="col"` e `scope="row"` explicitam a direção da associação. Ao chegar ao valor “30 minutos”, a tecnologia assistiva pode relacioná-lo ao assunto e à coluna de tempo, conforme a navegação utilizada.

`thead` e `tbody` organizam grupos, mas não substituem a marcação dos cabeçalhos. Deixar uma célula em negrito com CSS também não transforma `td` em `th`.

## Simplifique antes de aumentar a complexidade

Cabeçalhos que atravessam várias linhas ou colunas podem precisar de `scope="colgroup"`, `scope="rowgroup"` ou relações explícitas por IDs e `headers`. A solução depende da estrutura; acrescentar `scope="col"` em tudo não resolve qualquer tabela.

Pergunte se a informação pode ser dividida em tabelas menores e mais claras. Quando a estrutura complexa é necessária, teste a associação de cada tipo de célula. O [tutorial de tabelas da WAI](https://www.w3.org/WAI/tutorials/tables/) oferece exemplos por complexidade.

## Ordenação tem ação e estado

Se clicar no cabeçalho ordena os dados, coloque um botão no cabeçalho e mantenha o estado na célula `th` relevante:

```html
<th scope="col" aria-sort="ascending">
  <button type="button">Assunto <span aria-hidden="true">↑</span></button>
</th>
```

O trecho representa uma coluna atualmente em ordem ascendente. Ele não implementa a ordenação: o código precisa reorganizar os dados e atualizar [`aria-sort`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-sort) conforme a ordem real. Em uma ordenação simples por uma coluna, não marque várias colunas como se fossem simultaneamente a chave ativa.

Mantenha o foco no botão após atualizar os dados. O ícone é um reforço visual; o estado programático comunica a ordenação. Consulte o [exemplo de tabela ordenável da APG](https://www.w3.org/WAI/ARIA/apg/patterns/table/examples/sortable-table/).

## Rolagem horizontal precisa ser operável

Em telas pequenas, um contêiner com `overflow-x: auto` pode preservar a tabela sem cortar colunas. Se precisar torná-lo um ponto de Tab para permitir rolagem por teclado nos ambientes suportados, dê nome e foco visível a essa região. Não acrescente paradas em cada célula apenas para permitir leitura.

Teste o contêiner com teclado e leitor de tela. Mudar todos os elementos da tabela para `display: block` pode afetar a semântica em algumas combinações de navegador e tecnologia assistiva; confira o resultado na árvore de acessibilidade.

Dados que exigem relação bidimensional têm uma exceção específica no critério de reflow. Isso não autoriza cortar ações, esconder conteúdo essencial ou tornar o resto da página dependente de rolagem horizontal.

## Table e grid não são intercambiáveis

Uma tabela com links ou botões pode continuar sendo uma tabela nativa. `role="grid"` indica um componente composto com outro contrato, normalmente incluindo navegação por setas e gerenciamento de foco entre células.

Não adicione esse papel só porque o visual lembra uma planilha. Se há edição e navegação entre células, avalie o padrão completo e a tecnologia que vai implementá-lo. Virtualização acrescenta desafios porque nem todas as linhas existem no [DOM](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model) ao mesmo tempo.

## Como verificar

Com leitor de tela, localize a tabela pelo nome, navegue por células e confirme os cabeçalhos anunciados. Com teclado, teste ações, ordenação e rolagem. Depois use zoom e uma largura pequena, verificando se a relação entre valores permanece compreensível.

Registre casos concretos: “a célula de tempo não anuncia a coluna” aponta uma relação ausente; “o botão perde foco ao ordenar” aponta outro problema, de atualização e foco.

## Continue estudando

- [Tabelas — APG](https://www.w3.org/WAI/ARIA/apg/patterns/table/)
- [Virtualização e seus limites](./performance-virtualizacao-renderizacao.md)
- [Roteiro de testes manuais e automáticos](./acessibilidade-testes-screen-readers-axe.md)
