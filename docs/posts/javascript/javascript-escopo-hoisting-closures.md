---
title: 'Escopo, hoisting e closures: de onde vêm as variáveis?'
description: 'Aprenda como JavaScript encontra variáveis, por que a ordem das declarações importa e como funções preservam acesso ao escopo.'
date: '2026-10-16'
category: 'JavaScript'
tags:
  - Scope
  - Hoisting
  - Closures
---

Quando uma função usa uma variável, JavaScript precisa encontrar a declaração correspondente. Escopo, [hoisting](https://developer.mozilla.org/en-US/docs/Glossary/Hoisting) e [closures](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures) explicam partes diferentes dessa busca.

Pense numa variável criada dentro de uma função: outra função pode usá-la? Ela continua disponível depois que a primeira chamada termina? Vamos responder a essas perguntas com exemplos pequenos. Para experimentar, use um ambiente JavaScript como o console do navegador e execute cada bloco separadamente, principalmente os que demonstram erros.

## Escopo é a região onde um nome está disponível

Há escopos globais, de módulo, de função e de bloco. `let` e `const` respeitam blocos como os de `if` e `for`. `var` pertence à função que o contém, ou ao escopo superior quando não está dentro de uma função.

```js
function prepararMensagem() {
  const nome = 'Caio'

  if (nome) {
    const mensagem = `Olá, ${nome}`
    console.log(mensagem)
  }

  console.log(nome)
}

prepararMensagem()
```

O bloco do `if` consegue acessar `nome`, declarado no escopo externo. `mensagem`, porém, só existe dentro daquele bloco. Tentar acessá-la depois do `if` produz `ReferenceError`.

## Escopo léxico: importa onde a função foi criada

```js
const ambiente = 'produção'

function mostrarAmbiente() {
  console.log(ambiente)
}

function executar() {
  const ambiente = 'teste'
  mostrarAmbiente()
}

executar()
```

O resultado é `produção`. A função procura nomes seguindo o ambiente em que foi definida, não as variáveis locais de quem a chamou. A variável `ambiente` de `executar` é outra declaração, que apenas usa o mesmo nome.

## Hoisting não significa mover linhas de código

“Hoisting” descreve comportamentos observáveis da preparação das declarações antes da execução. Diferentes declarações se comportam de formas diferentes:

| Declaração | Acesso antes da linha da declaração |
| --- | --- |
| `function` em um escopo normal de função ou módulo | A função já pode ser chamada |
| `var` | O nome existe e começa com `undefined` |
| `let` e `const` | O nome existe no escopo, mas ainda não foi inicializado: acesso lança `ReferenceError` |

```js
console.log(total)
var total = 10
```

Imprime `undefined`, pois a atribuição de `10` só acontece quando aquela linha executa.

```js
const categoria = 'global'

function demonstrar() {
  console.log(categoria)
  const categoria = 'local'
}

demonstrar()
```

Este segundo exemplo lança `ReferenceError`. A declaração local já determina a resolução daquele nome dentro da função, mas ainda está na **[Temporal Dead Zone](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let#temporal_dead_zone_tdz)**, ou TDZ: o intervalo anterior à inicialização. JavaScript não ignora a declaração local para procurar a global.

Uma função guardada em `const` também segue essa regra. Não confunda uma declaração `function somar() {}` com uma atribuição `const somar = () => {}`.

## Closure: a função mantém acesso ao ambiente externo

```js
function criarContador() {
  let total = 0

  return function incrementar() {
    total += 1
    return total
  }
}

const contador = criarContador()
console.log(contador())
console.log(contador())
```

A saída é `1` e `2`. A chamada de `criarContador` terminou, mas a função retornada continua acessando a variável `total` daquele ambiente.

A closure não guarda uma fotografia congelada do valor. Ela mantém acesso à variável, que pode mudar. Uma nova chamada de `criarContador` cria outro ambiente e, portanto, outro contador independente.

## O exemplo clássico dos loops

```js
const callbacks = []

for (let indice = 0; indice < 3; indice += 1) {
  callbacks.push(() => indice)
}

console.log(callbacks.map(callback => callback()))
```

O resultado é `[0, 1, 2]`. Nesse loop, `let` cria um vínculo próprio para cada iteração. Se trocar `let` por `var`, os callbacks compartilham a mesma variável; depois do loop, o resultado será `[3, 3, 3]`.

Isso aparece em **callbacks** — funções passadas para outra parte do código executar — de temporizadores, eventos e funções criadas durante uma repetição.

## Onde isso ajuda na prática?

Closures permitem criar funções configuradas, encapsular estado e preservar contexto para callbacks. Uma função de [debounce](https://developer.mozilla.org/en-US/docs/Glossary/Debounce), por exemplo, precisa lembrar o timer da chamada anterior.

Também há uma consequência de memória: enquanto uma função acessível precisar de dados do ambiente externo, esses dados podem continuar alcançáveis. Closure não é um vazamento por si só; o problema aparece quando mantemos funções e dados vivos por mais tempo do que o necessário.

## Encapsular estado com uma closure

Uma closure também pode expor operações sem entregar diretamente a variável interna:

```js
function criarSaldo(valorInicial) {
  let saldo = valorInicial

  return {
    consultar() {
      return saldo
    },
    depositar(valor) {
      if (!Number.isFinite(valor) || valor <= 0) {
        throw new Error('Informe um valor positivo e finito.')
      }

      saldo += valor
      return saldo
    },
  }
}

const carteira = criarSaldo(10)
carteira.depositar(5)
console.log(carteira.consultar())
console.log(carteira.saldo)
```

As saídas são `15` e `undefined`: `saldo` pertence ao ambiente da função e não é uma propriedade pública do objeto retornado. Neste exemplo, o valor inicial deve ser um número válido; uma aplicação real também deve validá-lo.

Esse encapsulamento ajuda a proteger regras de alteração do estado no código cliente. Ele não é um mecanismo de segurança para segredos ou regras financeiras: dados e decisões sensíveis precisam ser protegidos no servidor.

## Erros comuns

- Achar que `const` torna o conteúdo de um objeto imutável. Ele impede reatribuir o vínculo.
- Esperar que uma variável local do chamador altere o escopo léxico de outra função.
- Acreditar que closures só existem quando uma função é retornada. Callbacks e outras funções também podem formar closures.
- Usar o mesmo nome em muitos escopos e dificultar a leitura.

## Continue estudando

- [Closures — MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures)
- [Hoisting — MDN](https://developer.mozilla.org/en-US/docs/Glossary/Hoisting)
- Veja também: [debounce e throttle com closures](./javascript-debounce-throttle.md).
