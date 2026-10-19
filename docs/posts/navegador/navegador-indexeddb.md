---
title: 'IndexedDB: dados estruturados, transações e persistência no navegador'
description: 'Guarde registros sem serializar tudo em Web Storage, entendendo versão do banco, conclusão da transação, bloqueios entre abas e limites de persistência.'
date: '2026-10-16'
category: 'Navegador'
tags:
  - IndexedDB
  - Armazenamento
  - Transações
---

Imagine um editor que mantém rascunhos no navegador. O IndexedDB permite guardar registros estruturados e consultá-los sem converter tudo numa única string. Uma **object store** é uma coleção de registros; um **índice** ajuda a procurar por um campo; uma **transação** agrupa operações. Para acompanhar os callbacks do exemplo, ajuda conhecer [eventos do DOM](./javascript-dom-elementos-eventos.md).

Uma preferência pequena pode caber em Web Storage. Rascunhos, registros consultáveis e dados estruturados podem justificar [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API), uma API assíncrona com bancos, object stores, índices e transações.

Para [cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies), [`localStorage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) e [`sessionStorage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage), use o [guia já existente de armazenamento](./javascript-localstorage-sessionstorage-cookies.md). Aqui vamos trabalhar com o que é específico do IndexedDB.

## Quando ele ajuda?

IndexedDB armazena valores compatíveis com clonagem estruturada e permite buscar por chaves e índices. Ele não é um banco SQL e não é uma sincronização automática com o servidor.

Dados continuam sujeitos à política de armazenamento, quota e limpeza do navegador. Uma cópia local não deve ser a única cópia de informação essencial. A [documentação da API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) apresenta o modelo e suas limitações.

## Abrir um banco e preparar a primeira versão

Execute este exemplo em uma página de teste servida por [HTTP](https://www.rfc-editor.org/rfc/rfc9110.html) local ou HTTPS. Ele cria um banco didático `estudos-demo`, separado do progresso deste blog.

```js
function abrirBanco() {
  return new Promise((resolve, reject) => {
    const pedido = indexedDB.open('estudos-demo', 1)

    pedido.onupgradeneeded = () => {
      const banco = pedido.result
      if (!banco.objectStoreNames.contains('notas')) {
        banco.createObjectStore('notas', { keyPath: 'id' })
      }
    }

    pedido.onsuccess = () => {
      const banco = pedido.result
      banco.onversionchange = () => banco.close()
      resolve(banco)
    }

    pedido.onerror = () => reject(pedido.error)
    pedido.onblocked = () => {
      console.warn('Feche a conexão antiga em outra aba para concluir a atualização.')
    }
  })
}
```

Criar ou alterar stores e índices acontece durante a transação de upgrade. Uma aba com conexão antiga aberta pode bloquear a atualização. `onversionchange` permite encerrar essa conexão; `onblocked` informa a espera, não significa que a abertura já terminou.

Uma aplicação precisa de feedback adequado se essa espera impedir uma tarefa, além de estratégia para migração e versões antigas do cliente.

## Gravar: espere a transação concluir

Depois de definir `abrirBanco`, acrescente:

```js
function salvarNota(banco, nota) {
  return new Promise((resolve, reject) => {
    const transacao = banco.transaction('notas', 'readwrite')
    transacao.oncomplete = () => resolve()
    transacao.onabort = () => reject(transacao.error ?? new Error('Gravação abortada'))
    transacao.objectStore('notas').put(nota)
  })
}

function lerNota(banco, id) {
  return new Promise((resolve, reject) => {
    const transacao = banco.transaction('notas', 'readonly')
    const pedido = transacao.objectStore('notas').get(id)
    transacao.oncomplete = () => resolve(pedido.result ?? null)
    transacao.onabort = () => reject(transacao.error ?? new Error('Leitura abortada'))
  })
}

async function demonstrarNotas() {
  const banco = await abrirBanco()

  try {
    await salvarNota(banco, { id: 'dom', texto: 'Revisar renderização' })
    console.log(await lerNota(banco, 'dom'))
  } finally {
    banco.close()
  }
}

demonstrarNotas().catch(erro => console.error('Falha ao usar o banco:', erro))
```

A saída contém o registro com `id: 'dom'`. Executar novamente substitui o registro com essa chave. O sucesso de um pedido individual não prova sozinho que a transação inteira foi confirmada; por isso, a gravação resolve em `oncomplete`.

O exemplo pressupõe registros válidos e uma store existente. Erros de clonagem, fechamento da conexão, quota ou outras falhas precisam de tratamento na experiência real.

## Não mantenha a transação aberta enquanto espera a rede

Uma transação pode ficar inativa e concluir quando não há mais trabalho elegível. Fazer `await fetch(...)` no meio de uma sequência não garante que ela continuará aberta para a gravação seguinte.

Prepare os dados antes de iniciar a transação e faça nela as operações locais relacionadas. IndexedDB não oferece uma transação distribuída com sua API remota. Se houver sincronização, defina conflitos, versões e operações pendentes separadamente.

## Persistência não significa cofre

Scripts autorizados a executar na mesma origem podem acessar dados conforme o modelo do navegador. IndexedDB não protege tokens contra [XSS](https://owasp.org/www-community/attacks/xss/). Dados locais também exigem limpeza ou isolamento quando a pessoa sai da conta.

## Exercício de verificação

Na aba Application do DevTools, inspecione a store e o registro. Recarregue e leia novamente. Teste atualização de versão com outra aba aberta e uma falha de gravação controlada. Confira se a UI distingue “salvo localmente” de “sincronizado no servidor”.

Para desenhar uma sessão segura, siga o [guia de autenticação](./system-design-autenticacao-seguranca.md), em vez de escolher IndexedDB apenas por ser assíncrono.
