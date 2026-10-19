---
title: 'WCAG na prática: critérios, contraste e uma definição verificável de pronto'
description: 'Transforme WCAG 2.x em decisões de implementação e testes, entendendo níveis de conformidade, contraste, zoom e tamanho de alvo.'
date: '2026-10-16'
category: 'Acessibilidade'
tags:
  - WCAG 2.x
  - Contraste
  - Design
---

Uma tela não se torna acessível porque recebeu atributos [ARIA](https://www.w3.org/WAI/ARIA/apg/) ou passou por uma ferramenta. O ponto de partida é a tarefa: uma pessoa consegue entender, operar e concluir o fluxo usando os recursos de que precisa?

[WCAG](https://www.w3.org/WAI/standards-guidelines/wcag/) fornece critérios verificáveis para avaliar esse resultado. Este guia usa [WCAG 2.2](https://www.w3.org/TR/WCAG22/) como referência técnica, consultada em outubro de 2026; o requisito aplicável ao seu projeto deve especificar versão, nível e escopo.

**WCAG** significa *Web Content Accessibility Guidelines*: diretrizes de acessibilidade para conteúdo na web. Elas organizam critérios que podemos verificar, como legibilidade, uso por teclado e compreensão de erros. **Contraste** é a diferença de luminosidade entre cores, por exemplo entre o texto e seu fundo; gostar da combinação não garante que ela seja legível.

## O que muda entre 2.0, 2.1 e 2.2?

As versões da família 2.x evoluem os requisitos. A 2.1 acrescentou critérios à 2.0; a 2.2 acrescentou outros e removeu o critério 4.1.1, Parsing, que ficou obsoleto. Não misture um relatório de uma versão com uma declaração de outra sem conferir as diferenças.

Os quatro princípios são conteúdo perceptível, operável, compreensível e robusto. Os níveis A, AA e AAA indicam conjuntos cumulativos: atender AA exige atender também os critérios de nível A aplicáveis.

Conformidade considera páginas completas e processos completos, não somente o componente que foi inspecionado. Os exemplos desta série cobrem parte dos critérios; não são uma certificação de conformidade do blog. Consulte o [texto normativo da WCAG 2.2](https://www.w3.org/TR/WCAG22/) para requisitos e condições de conformidade.

## Traduza o requisito para uma tarefa

Em vez de “melhorar acessibilidade do cadastro”, defina verificações como:

- Todos os campos têm rótulo persistente e nome programático coerente.
- A pessoa consegue enviar, identificar erros, corrigi-los e reenviar usando teclado.
- O indicador de foco permanece visível durante o fluxo.
- O sucesso pode ser percebido sem depender exclusivamente da cor.

Ligue cada achado ao critério correspondente e guarde os passos de reprodução. O [Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/) permite filtrar versão e nível, mas uma checklist curta não cobre todos os critérios.

## Contraste de texto: meça a combinação real

No nível AA, o critério 1.4.3 exige ao menos **4,5:1 para texto comum** e **3:1 para texto grande**, com exceções previstas pelo critério. Texto grande corresponde a pelo menos 18 pt, cerca de 24 CSS px, ou 14 pt em negrito, cerca de 18,67 CSS px.

O tamanho real e o peso importam: um título de 20 px sem negrito não se enquadra automaticamente como texto grande. Não arredonde um resultado inferior ao limite para declarar aprovação. Essas definições estão na [explicação de contraste mínimo](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

Meça texto e fundo efetivos, incluindo transparência, imagens e gradientes. Confira links, placeholders, ajuda, mensagens e estados de hover/foco nos dois temas. Uma marca não cria uma exceção geral para texto de interface.

## Contraste não textual e uso de cor

O critério 1.4.11 trata de informações visuais necessárias para identificar componentes, seus estados e partes relevantes de gráficos. Em geral, exige 3:1 contra cores adjacentes, observadas suas exceções. Não significa que toda borda decorativa precisa desse contraste. Veja a [explicação de contraste não textual](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).

Um campo inválido não deve ser indicado apenas por vermelho. Acrescente texto que identifique o problema e associe esse texto ao campo. Um item estudado pode usar check e texto, além da mudança de cor.

## Zoom, reflow e alvos de interação

Teste zoom de 200% sem perda de conteúdo ou função. Para reflow, avalie a largura equivalente a 320 CSS px, por exemplo com uma janela de 1280 CSS px a 400% de zoom. Conteúdo que realmente exige duas dimensões, como certas tabelas de dados, tem tratamento específico; não estenda essa exceção à página inteira.

WCAG 2.2 acrescenta o critério AA 2.5.8 para tamanho de alvo: 24 × 24 CSS px ou atendimento a uma das exceções, como espaçamento suficiente. Não é uma regra universal de 44 px para todo controle; 44 × 44 está ligado ao critério aprimorado AAA 2.5.5. Como decisão de usabilidade, áreas maiores podem ser desejáveis. Confira as [regras e exceções de tamanho mínimo](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

## Uma definição de pronto para um fluxo

Vincule cada critério aplicável a uma evidência e registre as lacunas. O [roteiro de avaliação com teclado, leitor de tela e axe](./acessibilidade-testes-screen-readers-axe.md) concentra os passos de execução e a interpretação dos resultados. A decisão de conformidade exige avaliar o processo inteiro, não apenas os itens de contraste demonstrados aqui.

## Próximos passos

- [HTML semântico, ARIA e nomes acessíveis](./acessibilidade-html-semantico-aria-nomes.md)
- [Teclado e gerenciamento de foco](./acessibilidade-teclado-foco.md)
- [Leitores de tela e axe](./acessibilidade-testes-screen-readers-axe.md)
