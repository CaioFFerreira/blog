---
title: "Mocks e outros dublês: controlar dependências sem esconder o problema"
description: "Aprenda o que substituir num teste e como representar espera, falhas e respostas sem perder o comportamento importante."
date: '2026-10-16'
category: 'Testes'
tags:
  - Mocks
  - Contratos
  - Assincronismo
---

Imagine testar uma tela sem enviar um pagamento real: podemos substituir a integração por uma versão controlada. Essa substituição é chamada de **dublê de teste** (*test double*). O importante é escolher o que simular e o que continua real, incluindo a espera e os erros, para que o teste ainda represente o comportamento que queremos proteger.

Um double é uma substituição usada no teste. Ele pode oferecer respostas, registrar interações ou implementar uma versão simples de uma dependência. Os nomes stub, spy, fake e mock ajudam a discutir a intenção, mas variam conforme a ferramenta.

O critério útil é o contrato: o que foi substituído e o que esse teste ainda consegue demonstrar?

## Substitua a borda, preserve a colaboração que quer verificar

Para testar um formulário, mantenha inputs, validação e comportamento reais; controle a gravação externa. Para testar um adaptador [HTTP](https://www.rfc-editor.org/rfc/rfc9110.html), exerça serialização e tratamento de status, substituindo o transporte no limite adequado. Para verificar autorização da API, use identidade e regra reais do ambiente.

Mockar o próprio módulo cuja lógica deveria ser testada pode fazer um teste verde dizer apenas que o mock devolveu o valor programado. Mockar todos os filhos também pode esconder um erro na comunicação entre componentes.

O [exemplo de integração com Testing Library](./testes-integracao-testing-library.md) substitui apenas `save` e deixa a interação do formulário real.

## Um resultado imediatamente resolvido não representa uma espera

Se a gravação usa [`mockResolvedValue`](https://vitest.dev/api/mock.html#mockresolvedvalue), talvez o cenário não permita observar um estado pendente importante. Para controlar a conclusão, uma [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) adiada pode ajudar num laboratório [Vitest](https://vitest.dev/guide/):

```ts
interface Deferred<Value> {
  promise: Promise<Value>
  resolve: (value: Value) => void
  reject: (reason: unknown) => void
}

function deferred<Value>(): Deferred<Value> {
  let resolve!: (value: Value) => void
  let reject!: (reason: unknown) => void

  const promise = new Promise<Value>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })

  return { promise, resolve, reject }
}
```

O executor da Promise é síncrono, então os callbacks são atribuídos antes do retorno. As assertions de atribuição definida se apoiam nessa garantia específica, não numa suposição de que qualquer inicialização assíncrona terá terminado.

## Um teste de resultado que depende dessa conclusão

Depois do helper, em um arquivo de teste com Vitest:

```ts
import { expect, it } from 'vitest'

it('não confirma antes da dependência concluir', async () => {
  const request = deferred<string>()
  const events: string[] = []

  async function submit() {
    events.push('enviando')
    const result = await request.promise
    events.push(result)
  }

  const submission = submit()
  expect(events).toEqual(['enviando'])

  request.resolve('confirmado')
  await submission
  expect(events).toEqual(['enviando', 'confirmado'])
})
```

Esse teste ensina controle de conclusão. Numa aplicação, substitua a função didática pela unidade real e observe o efeito relevante, como o feedback pendente ou a ausência de uma confirmação prematura. Testar esse helper sozinho não comprova o comportamento de uma tela.

Para falha, rejeite a Promise e aguarde o resultado que a aplicação promete, ou uma asserção de rejeição quando esse for o contrato. Não deixe uma rejeição sem observador: ela pode escapar do teste.

## Relógio, timers e concorrência

[Fake timers](https://vitest.dev/guide/mocking/timers) podem controlar debounce ou timeout sem uma espera real. Eles não simulam automaticamente rede, layout e todo o Event Loop. Restaure o relógio após o cenário e confira como a ferramenta avança timers e Promises.

Em uma busca, controle a ordem: resposta de uma consulta antiga chega depois da nova. A asserção útil é qual resultado permanece na tela, não apenas quantas vezes uma função foi chamada. O mecanismo de execução está no [guia de Event Loop](./javascript-event-loop-promises-async-await.md).

## Um mock pode desatualizar junto da expectativa

Uma **fixture** é um conjunto de dados preparado para o teste. Se a API muda e você atualiza fixture e asserção com a mesma suposição incorreta, o teste local continua verde. Documente contratos, valide conteúdos das mensagens na borda e mantenha testes de integração que detectem divergência com o provedor.

Para retry e pagamentos, observe efeitos e idempotência conforme o [contrato de operação](./system-design-erros-retry-pagamentos.md). Não programe o mock para “só cobrar uma vez” e trate isso como prova da implementação real.

## Referências

- [Mocks no Vitest](https://vitest.dev/guide/mocking)
- [Testes assíncronos no Jest](https://jestjs.io/docs/asynchronous)
- [Contratos de API](./system-design-bff-contratos-api.md)
