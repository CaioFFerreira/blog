---
title: 'WebSocket e SSE no navegador: conexão, mensagens e encerramento'
description: 'Experimente EventSource e WebSocket, valide o conteúdo recebido e entenda reconexão, autenticação e consumo de mensagens sem duplicar o desenho de infraestrutura.'
date: '2026-10-16'
category: 'Navegador'
tags:
  - WebSockets
  - SSE
  - EventSource
---

Uma página pode perguntar periodicamente se há novidades (**polling**) ou manter uma conexão para receber atualizações. Em **SSE** (*Server-Sent Events*), o servidor envia eventos para o navegador; em **WebSocket**, os dois lados podem trocar mensagens. O objetivo aqui é entender como abrir, usar e fechar essas conexões, incluindo falhas e retomadas.

Os critérios para escolher polling, [SSE](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) ou [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) e o custo de milhares de clientes estão no [caso de documentos e notificações](./system-design-documentos-notificacoes.md). Aqui, o foco é operar as APIs do navegador e encerrar seus recursos corretamente.

Os exemplos pressupõem endpoints de demonstração no servidor. Eles não existem neste blog estático, e os trechos não estabelecem conexões apenas por aparecerem no artigo.

## SSE: receber eventos com EventSource

Um endpoint SSE responde com `Content-Type: text/event-stream`. Um evento nomeado pode ter este formato, terminado por uma linha em branco:

```text
id: 42
event: document-ready
data: {"documentId":"doc_123"}

```

Na página, um consumidor limitado:

```js
function observarDocumentos(onReady) {
  const source = new EventSource('/api/events')

  source.addEventListener('document-ready', event => {
    try {
      const data = JSON.parse(event.data)
      if (typeof data?.documentId !== 'string') {
        throw new Error('Evento inválido')
      }

      onReady(data.documentId)
    } catch (erro) {
      console.error('Não foi possível tratar o evento:', erro)
    }
  })

  source.addEventListener('error', () => {
    console.info('O fluxo foi interrompido ou não pôde ser aberto.')
  })

  return () => source.close()
}
```

Chame a função com um callback e guarde a limpeza para sair da tela. Eventos nomeados usam o nome informado em `event:`; eventos sem esse campo chegam como `message`.

O [`EventSource`](https://developer.mozilla.org/en-US/docs/Web/API/EventSource) pode tentar reconectar automaticamente. IDs ajudam na retomada quando o servidor implementa esse contrato; não garantem que o cliente terá todo o histórico. Consulte o estado atual após interrupções importantes. A [documentação de SSE](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) apresenta o formato e o comportamento.

## WebSocket: comunicação bidirecional

```js
function conectarCanal(url, onMessage) {
  const socket = new WebSocket(url)

  socket.addEventListener('open', () => {
    socket.send(JSON.stringify({ type: 'subscribe', channel: 'documents' }))
  })

  socket.addEventListener('message', event => {
    if (typeof event.data !== 'string') return

    try {
      const data = JSON.parse(event.data)
      if (data?.type !== 'document-ready'
        || typeof data.documentId !== 'string') return

      onMessage(data.documentId)
    } catch (erro) {
      console.error('Mensagem inválida:', erro)
    }
  })

  socket.addEventListener('error', () => {
    console.info('Falha no canal WebSocket.')
  })

  return () => socket.close(1000, 'Tela encerrada')
}
```

O chamador fornece uma URL de teste compatível, como `wss://` em uma aplicação HTTPS. A assinatura `subscribe` é um protocolo fictício que o servidor precisaria reconhecer. A versão acima não implementa reconexão nem confirmação da assinatura.

O servidor precisa autenticar a conexão e autorizar os canais e mensagens, sem confiar no nome solicitado. Como [cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies) podem participar do handshake, valide também origens permitidas conforme o modelo de autenticação; não presuma que regras [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS) de fetch protegem WebSocket da mesma forma.

## Volume e reconexão precisam de uma política

A API WebSocket tradicional não oferece backpressure automática para impedir que mensagens recebidas mais rapidamente que seu processamento consumam recursos excessivos. Limite volume e tamanho no protocolo, agrupe atualizações quando fizer sentido e monitore filas. `bufferedAmount` informa dados de saída ainda enfileirados, não a fila de entrada.

Ao reconectar, use limites e [jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/) (variação aleatória no atraso para evitar que todos os clientes tentem ao mesmo tempo), além de uma estratégia de recuperação. Cancelar a tela deve cancelar também timers de reconexão. Não mantenha várias conexões por acidente após cada montagem do componente. Consulte a [referência de WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket).

## Credenciais e validade do evento

Os construtores nativos não oferecem um parâmetro genérico de cabeçalhos [HTTP](https://www.rfc-editor.org/rfc/rfc9110.html) de autenticação. Defina uma solução compatível com sua sessão e não coloque bearer tokens duradouros em URLs para contornar essa limitação.

Uma mensagem “documento pronto” é um aviso para consultar um recurso autorizado, não prova suficiente para revelar dados. Repetições e mensagens fora de ordem precisam ser tratadas pelo contrato da aplicação.

## Como verificar

Confira o fluxo SSE ou os frames WebSocket no Network. Simule desconexão, saída da tela, login expirado e mensagens inválidas. Verifique que não há crescimento de conexões ou listeners e que a recuperação consulta o estado correto.

Uma conexão aberta não prova entrega, processamento ou autorização corretos. Defina esses resultados de forma observável.
