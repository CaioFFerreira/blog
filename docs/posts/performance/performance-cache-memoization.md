---
title: "Cache e memoização: reutilizar resultados sem mostrar dados antigos"
description: "Aprenda o que pode ser reaproveitado, como definir validade e quando guardar um resultado pode causar um erro."
date: '2026-10-16'
category: 'Performance'
tags:
  - Caching
  - Memoization
  - Cache-Control
---

Pense em guardar a resposta de uma busca para não repeti-la imediatamente. Isso é **cache**. **Memoização** é guardar o resultado de um cálculo para reutilizá-lo com entradas equivalentes. **Invalidar** significa deixar de considerar esse resultado reutilizável. O desafio é definir quando a informação guardada ainda representa a realidade.

Reutilizar um resultado evita repetir trabalho. A pergunta essencial é: **quando esse resultado deixa de ser válido?** Sem essa resposta, cache pode transformar uma melhoria de velocidade em um bug difícil de reproduzir.

## Existem diferentes camadas

| Camada | O que reutiliza | Decisão principal |
| --- | --- | --- |
| Cache [HTTP](https://www.rfc-editor.org/rfc/rfc9110.html) do navegador ou CDN | Respostas HTTP | Validade, revalidação e compartilhamento |
| Cache de dados da aplicação | Resultado de consultas | Chave, expiração e atualização após alterações |
| Memoization | Resultado de um cálculo | Dependências completas e limite de memória |

[`localStorage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) não é automaticamente um cache HTTP. Você pode construir um cache nele, mas precisará definir formato, validade e limpeza, além de considerar o custo síncrono da API.

## Cache HTTP: três políticas que não são equivalentes

Os exemplos seguintes são cabeçalhos de resposta configurados no servidor ou na hospedagem. Não são JavaScript nem políticas já aplicadas a este blog.

Para um recurso estático público com hash no nome, cujo conteúdo nunca muda naquele endereço:

```http
Cache-Control: public, max-age=31536000, immutable
```

Uma nova versão precisa de outra URL. Já um HTML que deve ser revalidado pode usar:

```http
Cache-Control: no-cache
```

`no-cache` permite armazenamento, mas exige validação antes da reutilização. Com um validador como [`ETag`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/ETag), o servidor pode responder `304 Not Modified`, evitando reenviar o corpo. A requisição de validação ainda tem custo.

Para uma resposta que não deve ser armazenada por caches HTTP:

```http
Cache-Control: no-store
```

`private` restringe o armazenamento a caches privados, mas não é sinônimo de `no-store`. Conteúdo personalizado não deve ser marcado como público sem um desenho explícito que evite compartilhar dados entre pessoas. As regras detalhadas estão no [guia de cache HTTP da MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching).

## Invalidação começa na chave

Uma chave identifica quais entradas podem compartilhar o mesmo resultado. Liste todas as dependências antes de definir a chave: omitir uma delas permite reutilização incorreta; incluir dados que não alteram o resultado pode reduzir o aproveitamento sem necessidade. O [caso do portal autenticado](./system-design-cache-estado-performance.md) concentra o exemplo de isolamento por usuário e organização.

Uma expiração por tempo limita a idade do resultado, mas não garante atualização imediata. Para uma alteração de perfil, invalidar a entrada após salvar pode ser necessário.

No navegador, confirme status, cabeçalhos e origem da resposta no [Network](https://developer.chrome.com/docs/devtools/network). Teste visita inicial, repetição e deploy novo separadamente. Um [service worker](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) pode manter outra camada de cache com regras próprias.

## Memoization: evitar repetir um cálculo puro

Considere uma função cujo resultado depende apenas de uma string. Esta implementação mantém no máximo uma quantidade definida de entradas e remove a mais antiga por ordem de inserção:

```js
function memoizarTexto(calcular, limite = 100) {
  if (!Number.isInteger(limite) || limite < 1) {
    throw new Error('O limite deve ser um inteiro positivo.')
  }

  const cache = new Map()

  return function executar(texto) {
    if (cache.has(texto)) return cache.get(texto)

    const resultado = calcular(texto)
    cache.set(texto, resultado)

    if (cache.size > limite) {
      const primeiraChave = cache.keys().next().value
      cache.delete(primeiraChave)
    }

    return resultado
  }
}

const normalizar = memoizarTexto(texto =>
  texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(),
)

console.log(normalizar('Árvore'))
console.log(normalizar('Árvore'))
```

As duas saídas são `arvore`; na segunda chamada, o cálculo é reutilizado. Este é um exemplo didático: normalizar uma string curta pode ser tão barato que manter o cache não compensa. O contrato espera strings, e a política é FIFO, não LRU.

## Quando memoization dá errado?

Uma função que consulta horário, usuário global ou estado mutável tem dependências além do argumento. Usar só a string como chave pode devolver um resultado antigo.

Chaves baseadas em identidade de objeto também exigem cuidado: alterar o mesmo objeto não muda sua identidade. Guardar um objeto como resultado ainda permite que alguém o modifique e corrompa o valor reutilizado.

`JSON.stringify` não é uma chave universal para qualquer função: há tipos não suportados, perda de informação e custo de serialização. Defina o contrato antes de escolher a chave.

## Como comprovar que vale a pena

Meça quantas chamadas repetem entradas, o custo do cálculo e o crescimento de memória. Compare o fluxo real com e sem cache. Se há poucas repetições, o custo de procurar e reter resultados pode superar o benefício.

Ao usar Vue, um `computed` já mantém um valor derivado ligado às dependências reativas. Ele não cria automaticamente um cache de todos os argumentos possíveis. Comece com a ferramenta nativa antes de acrescentar memoization manual.

## Continue estudando

- [Armazenamento no navegador](./javascript-localstorage-sessionstorage-cookies.md)
- [Referências e imutabilidade](./javascript-valores-imutabilidade-memoria.md)
- [Investigar retenção de memória](./performance-memory-leaks.md)
