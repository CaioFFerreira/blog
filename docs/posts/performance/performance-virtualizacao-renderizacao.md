---
title: 'Listas grandes e renderização desnecessária: quando virtualizar?'
description: 'Diferencie cálculos repetidos, atualizações de componentes e excesso de DOM, e escolha entre paginação, estabilidade de dados e virtualização.'
date: '2026-10-16'
category: 'Performance'
tags:
  - Virtualization
  - Renderização desnecessária
  - DOM
  - Vue
---

**Virtualização** é montar apenas a parte visível de uma lista e uma margem próxima dela. A lista pode ter milhares de registros, mas poucos elementos ficam montados ao mesmo tempo. Isso é diferente de **paginação**, que divide os resultados em páginas, e de carregamento incremental, que busca mais dados conforme a navegação avança.

Uma tabela com 50 mil registros pode ter um problema de dados, de cálculo, de componentes ou de quantidade de elementos no [DOM](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model). Aplicar memoization a tudo não resolve necessariamente o custo de montar milhares de linhas.

## Renderizar um componente não equivale a redesenhar a tela inteira

Frameworks podem executar código de atualização e comparar representações antes de alterar o DOM. O navegador ainda precisa processar estilos, layout e pintura quando necessário. São etapas relacionadas, mas diferentes.

No trace, descubra onde está o custo. Há uma função recalculando resultados sem necessidade? Muitos componentes atualizam? Uma alteração pequena dispara layout em uma árvore enorme? A intervenção depende da resposta.

## Comece por estado e dependências bem definidos

Mantenha estado no menor escopo coerente. Evite fazer cada linha depender de um objeto global que muda por razões alheias a ela. Use identificadores estáveis para itens; índice de posição pode associar estado à linha errada quando a lista é reordenada.

No Vue, este é um padrão simples para um resultado derivado:

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'

const busca = ref('')
const itens = ref([
  { id: 1, titulo: 'Event Loop' },
  { id: 2, titulo: 'Core Web Vitals' },
])

const filtrados = computed(() => {
  const termo = busca.value.trim().toLocaleLowerCase('pt-BR')
  return itens.value.filter(item =>
    item.titulo.toLocaleLowerCase('pt-BR').includes(termo),
  )
})
</script>

<template>
  <label>Buscar assunto <input v-model="busca" type="search"></label>
  <ul>
    <li v-for="item in filtrados" :key="item.id">{{ item.titulo }}</li>
  </ul>
</template>
```

O `computed` reutiliza o resultado enquanto suas dependências reativas não mudam. Ele ainda refaz o filtro quando a busca ou os dados utilizados mudam, e não reduz quantas linhas precisam ser montadas.

Esse exemplo pequeno não precisa de virtualização. Ele apenas separa o cálculo derivado do template; otimizações extras exigem evidência.

## Virtualização: montar apenas uma janela da lista

Uma lista virtual mantém no DOM os itens visíveis e uma margem, chamada overscan. Espaçadores preservam a altura de rolagem do conjunto.

Para linhas fixas de 40 px, viewport de 400 px, rolagem de 800 px e overscan de 3, a conta didática é:

```js
const totalItens = 10000
const alturaLinha = 40
const alturaVisivel = 400
const rolagem = 800
const margem = 3

const primeiraVisivel = Math.floor(rolagem / alturaLinha)
const inicio = Math.max(0, primeiraVisivel - margem)
const fim = Math.min(
  totalItens,
  Math.ceil((rolagem + alturaVisivel) / alturaLinha) + margem,
)

console.log({ inicio, fim, quantidadeMontada: fim - inicio })
```

A saída é `{ inicio: 17, fim: 33, quantidadeMontada: 16 }`. O índice final é exclusivo. Em vez de montar 10 mil linhas, essa janela considera 16.

Isso demonstra o intervalo, não implementa um virtualizador de produção. Ainda faltam medidas, espaçadores, eventos, atualização de rolagem e gestão de foco. Alturas variáveis exigem outra estratégia; uma estimativa errada pode produzir saltos.

## Virtualização tem consequências para o produto

Busca nativa na página, impressão, seleção, leitores de tela e navegação por teclado precisam ser testados porque muitos itens não estarão no DOM. Uma linha desmontada pode perder estado local; preserve seleção e edições por ID em um estado com ciclo de vida adequado.

Para uma tabela acessível com linhas de tamanho variável e edição, prefira uma implementação madura compatível com o framework e avalie seus contratos. A [documentação de performance do Vue](https://vuejs.org/guide/best-practices/performance.html) aborda estabilidade de props e listas grandes.

## Paginação, carregamento incremental ou virtualização?

- **Paginação:** limita dados e DOM por página; útil quando dividir resultados é aceitável.
- **Carregamento incremental:** adia a busca, mas o DOM ainda pode crescer indefinidamente se todas as linhas permanecerem montadas.
- **Virtualização:** limita o DOM durante a rolagem; não reduz automaticamente o volume de dados baixados ou mantidos em memória.

As estratégias podem ser combinadas. Uma API paginada com janela virtual atende um caso diferente de baixar a base inteira e filtrar no cliente.

## Roteiro de validação

Compare a mesma base, dispositivo e sequência de ações. Observe montagem inicial, duração da interação, quantidade de nós e memória após rolar por bastante tempo.

Teste foco, reordenação, alteração de tamanho da janela, linhas expandidas e retorno à posição anterior. Não aceite uma rolagem mais rápida que perde seleção ou quebra o teclado.

## Continue estudando

- [Cache e memoization](./performance-cache-memoization.md)
- [Diagnóstico com Performance](./performance-devtools-network-waterfall.md)
- [DOM e eventos](./javascript-dom-elementos-eventos.md)
