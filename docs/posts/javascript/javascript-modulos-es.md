---
title: 'Módulos ES: organizar código com import e export'
description: 'Entenda escopo de módulo, exports nomeados, default, vínculos vivos e carregamento dinâmico sem depender de um framework.'
date: '2026-10-16'
category: 'JavaScript'
tags:
  - Módulos ES
  - Arquitetura
---

Dividir arquivos ajuda quando cada parte expõe uma responsabilidade clara. Os [módulos ES](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) oferecem o mecanismo da linguagem para declarar essas fronteiras com `import` e `export`.

Quando o projeto cresce, separar arquivos só ajuda se ficar claro o que cada um oferece e usa. Um **módulo** faz essa separação: `export` disponibiliza partes de um arquivo e `import` permite utilizá-las em outro. Nos exemplos, observe tanto o nome exportado quanto o caminho do arquivo; os dois participam da ligação.

## Um módulo tem seu próprio escopo

Variáveis declaradas no topo de um módulo não são automaticamente expostas como propriedades de `window`. Para compartilhar algo, você precisa exportar; para consumir, importar.

Crie `preco.js`:

```js
export function calcularTotal(preco, quantidade) {
  return preco * quantidade
}

export function formatarPreco(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor)
}
```

Depois, em `main.js`:

```js
import { calcularTotal, formatarPreco } from './preco.js'

const total = calcularTotal(25, 3)
console.log(formatarPreco(total))
```

A saída representa R$ 75,00, com o espaçamento definido pelo formatador do ambiente. As duas funções têm nomes que explicam o contrato do módulo.

## Como executar no navegador

```html
<script type="module" src="./main.js"></script>
```

Sirva os arquivos por [HTTP](https://www.rfc-editor.org/rfc/rfc9110.html) com um servidor local, em vez de abrir o HTML por `file://`. Imports relativos precisam de caminhos válidos; no navegador sem bundler, normalmente inclua a extensão `.js`.

Imports como `import { ref } from 'vue'` usam um nome de pacote. No projeto, o Vite resolve esse nome. Um navegador sem bundler precisa de uma configuração como import map para entendê-lo.

## Exports nomeados e default

Exports nomeados permitem publicar várias funções ou valores. O import usa o nome exportado, com a opção de criar um alias:

```js
import { calcularTotal as calcularTotalDoPedido } from './preco.js'
```

Um módulo também pode ter um único export default:

```js
export default function criarCarrinho() {
  return []
}
```

Quem importa escolhe o nome local: `import criarCarrinho from './carrinho.js'`. Ambos os estilos são válidos. Para utilitários, exports nomeados costumam deixar explícito o que está sendo consumido; siga uma convenção coerente no projeto.

## Imports são vínculos vivos

Um import não é uma cópia independente do valor exportado. Ele acompanha o vínculo mantido pelo módulo de origem.

Em `contador.js`:

```js
export let total = 0

export function incrementar() {
  total += 1
}
```

Em outro módulo:

```js
import { total, incrementar } from './contador.js'

console.log(total)
incrementar()
console.log(total)
```

As saídas são `0` e `1`. O consumidor não pode fazer `total = 10`: o vínculo importado é somente leitura para ele. Isso não torna objetos exportados imutáveis; suas propriedades ainda podem ser alteradas se o objeto permitir.

## Carregamento estático e dinâmico

Imports estáticos declaram dependências que as ferramentas podem analisar antes da execução. Já [`import()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import) devolve uma [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) e permite carregar um módulo quando ele for necessário:

```js
async function mostrarRelatorio() {
  const { gerarRelatorio } = await import('./relatorio.js')
  return gerarRelatorio()
}
```

O exemplo pressupõe um arquivo `relatorio.js` que exporta `gerarRelatorio`. A importação pode falhar, por exemplo por erro de rede; quem chama a função deve tratar essa rejeição.

Para usar essa fronteira como estratégia de carregamento, veja o [exemplo de code splitting e sua validação no build](./performance-bundle-code-splitting-tree-shaking.md). Aquele guia trata de chunks e custo inicial; aqui, `import()` é o mecanismo da linguagem.

## Efeitos colaterais e ciclos

Em condições normais, um módulo é avaliado uma vez por identidade resolvida dentro do mesmo ambiente. Importá-lo de vários arquivos não significa repetir sua inicialização a cada import.

Código no topo, como registrar um evento global, executa durante essa avaliação. Prefira inicializações explícitas quando houver recursos que precisam ser encerrados depois.

Evite ciclos como `usuario.js → pedido.js → usuario.js` quando puder reorganizar responsabilidades. Ciclos são suportados, mas ler um vínculo antes da inicialização pode causar `ReferenceError`. Extrair um contrato ou função compartilhada para um terceiro módulo pode resolver a dependência.

## Erros comuns

- Tratar módulos como se fossem arquivos que compartilham todas as variáveis globais.
- Acreditar que exportar um objeto o torna imutável.
- Colocar inicializações com efeitos colaterais em todo módulo utilitário.
- Criar um arquivo que reexporta tudo sem avaliar ciclos e dependências. Tree-shaking depende da análise do bundler e dos efeitos colaterais; não é uma garantia automática de qualquer organização de arquivos.

## Continue estudando

- [Módulos JavaScript — MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- Veja também: [valores, referências e imutabilidade](./javascript-valores-imutabilidade-memoria.md).
