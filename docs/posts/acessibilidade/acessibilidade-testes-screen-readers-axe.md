---
title: 'Testar acessibilidade: teclado, leitores de tela e axe no mesmo fluxo'
description: 'Combine inspeção automática e avaliação manual, registre evidências úteis e entenda por que zero violações não comprova conformidade.'
date: '2026-10-16'
category: 'Acessibilidade'
tags:
  - Screen readers
  - axe
  - Testes
  - WCAG
---

Ferramentas automáticas encontram muitos defeitos repetíveis. Uma avaliação manual verifica se a pessoa consegue realizar a tarefa e entender o que aconteceu. Uma abordagem profissional combina as duas, em vez de escolher uma como substituta da outra.

Use uma tarefa concreta como ponto de partida: preencher um cadastro e entender a confirmação. Um **leitor de tela** apresenta a interface por voz ou braille; o **axe** é uma ferramenta de análise automática. Cada um revela problemas diferentes. Não é preciso dominar os dois para começar pela navegação com teclado.

## Defina o que será avaliado

Escolha um fluxo, por exemplo localizar um artigo, marcá-lo como estudado e voltar à listagem. Inclua estados relevantes: carregamento, lista vazia, erro, diálogo aberto e confirmação.

Registre versão da aplicação, navegador, sistema operacional, tecnologia assistiva e dados utilizados. Resultados de uma combinação não descrevem automaticamente todas as outras.

O [guia de ferramentas de avaliação da WAI](https://www.w3.org/WAI/test-evaluate/tools/) explica como ferramentas apoiam a avaliação sem eliminar o julgamento humano.

## Primeira passagem: só teclado

Sem usar mouse, percorra o fluxo com Tab e Shift+Tab, ative controles e teste a saída de menus e diálogos. Observe ordem, foco visível, conteúdo encoberto e mudanças inesperadas.

Um controle inacessível por teclado precisa ser corrigido mesmo que tenha um nome perfeito. Da mesma forma, um controle que recebe foco não está automaticamente bem nomeado.

## Segunda passagem: leitor de tela

Comece com uma combinação que você consiga operar, como [NVDA](https://www.nvaccess.org/files/nvda/documentation/userGuide.html) no Windows com um navegador suportado ou [VoiceOver](https://support.apple.com/guide/voiceover/welcome/mac) com Safari no macOS. Atalhos e modos variam; consulte a documentação da versão utilizada e registre a combinação testada.

Não reduza a avaliação a ouvir a página inteira do início ao fim. Use navegação por títulos, regiões, links, campos e tabelas para investigar a estrutura.

Confira se cada ação tem nome compreensível, se o estado marcado é exposto e se as mensagens dinâmicas são percebidas sem interromper a tarefa. Em formulários, teste ajuda, erro e correção; em diálogos, teste entrada, leitura e retorno ao contexto.

Leitores de tela podem ter modo de leitura e modo de interação com formulários. Uma tecla que navega por títulos pode ser digitada num campo em outro modo. Conhecer essa diferença evita registrar como bug da aplicação uma operação incorreta da ferramenta.

Testar com usuários que utilizam essas tecnologias diariamente acrescenta uma avaliação que uma sessão técnica isolada não substitui.

## Terceira passagem: axe

O [axe-core](https://github.com/dequelabs/axe-core/blob/develop/doc/API.md) é um motor de análise automatizada; integrações como axe DevTools oferecem interfaces para executá-lo no navegador. Confira as regras e a versão da ferramenta, pois a cobertura muda ao longo do tempo.

Uma análise verifica o [DOM](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model) no estado em que foi executada. Rodar antes de abrir o modal não cobre automaticamente seu conteúdo aberto. Repita nos estados relevantes.

Para quem já tem axe-core carregado na página por uma integração de teste, o exemplo abaixo pode ser executado em um console com suporte a `await`:

```js
const resultado = await axe.run(document, {
  runOnly: {
    type: 'tag',
    values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
  },
})

console.table(resultado.violations.map(violacao => ({
  regra: violacao.id,
  impacto: violacao.impact,
  elementos: violacao.nodes.length,
  ajuda: violacao.helpUrl,
})))
```

O identificador global `axe` não existe neste blog por padrão; o trecho pressupõe a biblioteca já carregada. Em testes de uma aplicação, use o import ou a integração correspondente. A lista filtra regras disponíveis com essas tags; não implementa nem cobre todos os critérios desses níveis. Confira a [documentação de API do axe-core](https://github.com/dequelabs/axe-core/blob/develop/doc/API.md) para a versão utilizada.

Não envie dados sensíveis da página a serviços externos sem avaliar o fluxo da ferramenta. Uma integração local e uma plataforma hospedada podem ter comportamentos diferentes.

## Interprete o relatório sem transformar tudo em uma nota

`violations` contém problemas detectados. `incomplete` contém verificações que precisam de revisão; não ignore esse grupo por ele não ser uma falha confirmada. Há ainda resultados aprovados e regras não aplicáveis.

Zero violações significa que aquela execução não detectou falhas nas regras cobertas e naquele estado. Não comprova que os nomes fazem sentido, que a sequência de foco é útil ou que todo o processo atende [WCAG](https://www.w3.org/WAI/standards-guidelines/wcag/).

Priorize pelo impacto real na tarefa, não apenas pela quantidade. Um bloqueio no pagamento pode ser mais grave que várias ocorrências de um mesmo detalhe em uma área secundária.

## Registre um defeito que outra pessoa consiga reproduzir

Um registro útil contém:

- Página, estado, ambiente e passos para chegar ao problema.
- Resultado atual e resultado esperado para a pessoa.
- Elemento envolvido, evidência e critério relacionado quando identificado.
- Verificação de regressão que deve passar após a correção.

Exemplo: “Ao fechar o diálogo de filtros com Escape, o foco vai para o corpo da página. Esperado: retornar ao botão Filtros, permitindo continuar a navegação.”

## Integração contínua e limites

Depois de estabilizar o fluxo manualmente, automatize verificações de estados críticos na suíte existente. Evite simplesmente silenciar regras em toda a aplicação para fazer o pipeline passar. Documente limitações e volte a testar após mudanças.

Este post ensina o procedimento; não adiciona axe ao projeto nem declara que o site passou por uma auditoria com leitor de tela. Exemplos de conteúdo e validação do build são verificações diferentes de acessibilidade da experiência real.

## Referências e prática

- [axe-core — documentação oficial](https://github.com/dequelabs/axe-core)
- [WCAG e critérios verificáveis](./acessibilidade-wcag-contraste.md)
- [Modal para praticar entrada e retorno de foco](./acessibilidade-modais-dialog.md)
- [Formulário para praticar erros e anúncios](./acessibilidade-formularios-erros-aria-live.md)
