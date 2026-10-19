---
title: 'Documentos e notificações: segurança e processamento além da requisição'
description: 'Desenhe geração assíncrona, download autorizado e entrega de eventos, avaliando polling, SSE e WebSocket com reconciliação e limites.'
date: '2026-10-16'
category: 'System Design'
tags:
  - Documentos
  - Notificações
  - Filas
  - SSE
---

Imagine pedir um extrato e continuar navegando enquanto ele é gerado. A **fila** guarda a solicitação e um **worker** executa o trabalho em segundo plano. A interface pode consultar o estado e avisar quando terminar. Separar esses momentos exige explicar também como a pessoa descobre uma falha, acompanha a espera ou recupera um aviso perdido.

Gerar um extrato pode levar segundos. Enviar uma notificação depende de outros serviços. Manter a requisição original esperando por tudo aumenta a chance de timeout e pode consumir recursos sem necessidade.

No portal hipotético, vamos separar solicitação, processamento e entrega, sem presumir que uma fila resolve sozinha consistência ou segurança.

## Geração assíncrona de documentos

```text
1. Cliente pede geração de documento
2. API autentica, autoriza e registra a solicitação
3. Trabalho é disponibilizado para processamento
4. Worker gera o arquivo e atualiza o estado
5. Cliente consulta o estado ou recebe uma indicação de mudança
6. API autoriza o download do arquivo concluído
```

Uma resposta inicial pode fornecer um ID e estado `processing`. Defina também falha, expiração e possibilidade de tentar novamente. Não mantenha um spinner eterno sem uma política de acompanhamento.

Registrar no banco e publicar na fila são duas ações que podem falhar separadamente. Uma estratégia de **outbox transacional** registra a mensagem pendente na mesma transação que cria a solicitação no banco, para publicá-la depois. Isso pode reduzir a janela entre confirmar a solicitação e disponibilizar o trabalho; ela ainda exige publicação, reprocessamento e monitoramento.

## Filas normalmente exigem consumidores tolerantes a repetição

Uma mensagem pode ser entregue novamente. O worker precisa reconhecer a operação e evitar efeitos duplicados indesejados. Estabeleça limite de tentativas, separação de mensagens problemáticas e procedimento de reprocessamento.

Se o trabalho já concluiu, uma repetição não deve criar outra versão incompatível sem regra explícita. Correlacione solicitação, objeto produzido e estado publicado.

## Download sem atravessar todos os bytes pelo BFF

Após verificar autorização, a API pode emitir uma URL assinada curta para um objeto privado. O navegador baixa do armazenamento ou de uma camada autorizada, reduzindo tráfego no [BFF](https://learn.microsoft.com/en-us/azure/architecture/patterns/backends-for-frontends).

Uma URL assinada funciona como uma capacidade de acesso enquanto válida: quem a possui pode conseguir usá-la. Evite registrá-la em analytics, mensagens e logs; limite prazo, método e objeto. Expiração e revogação dependem do provedor e das credenciais usadas. Consulte o [modelo de URLs pré-assinadas do S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html) para um exemplo concreto.

O arquivo não deve ser público só porque a aplicação verifica login antes de mostrar o link. Em uploads, valide tamanho, formato e conteúdo; trate arquivos potencialmente maliciosos antes de disponibilizá-los. Uma extensão no nome não é validação.

## Notificação é uma indicação, não a fonte de verdade

Um evento “documento pronto” pode atualizar um aviso e provocar uma consulta autenticada ao estado atual. O evento não precisa carregar o documento ou informações pessoais completas.

Use IDs e versões para lidar com duplicação e ordem quando necessário. Após uma reconexão, reconcilie o estado: uma conexão aberta não garante que nenhum evento foi perdido.

## Polling, SSE ou WebSocket?

| Técnica | Adequada quando | Custo a considerar |
| --- | --- | --- |
| Polling | Atualizações ocasionais com simplicidade operacional | Chamadas mesmo sem mudança |
| [SSE](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) | Servidor envia atualizações para o cliente | Conexões duradouras, proxies e reconexão |
| [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) | Há comunicação bidirecional frequente | Protocolo, autenticação, limites e operação da conexão |

Não escolha WebSocket apenas porque a palavra “tempo real” apareceu. Defina a latência aceitável. Notificações ocasionais podem ser atendidas com polling controlado e pausa em abas ocultas.

Depois de escolher o transporte, use o [guia de EventSource e WebSocket no navegador](./navegador-websocket-sse.md) para implementar conexão, tratamento de mensagens e encerramento. Neste desenho de sistema, o contrato precisa dizer como recuperar atualizações perdidas e consultar o estado atual após reconexão.

## Estime o custo antes de escolher a frequência

Com 20 mil abas ativas consultando a cada 30 segundos, são aproximadamente 667 consultas/s, mesmo que não exista novidade. Abas sincronizadas podem concentrar ainda mais as chamadas. Use variação de tempo e limites quando apropriado.

Uma conexão persistente reduz consultas vazias, mas mantém sockets, memória e infraestrutura de reconexão. Não compare as soluções olhando apenas a quantidade de requisições.

## Experiência e teste de falha

Atualize badges e regiões de status sem interromper toda a leitura a cada evento. Reserve anúncios urgentes para situações realmente urgentes. O conteúdo importante precisa continuar disponível na área de documentos, mesmo que o aviso não apareça.

Teste trabalho repetido, worker indisponível, documento expirado, logout durante download e reconexão após eventos perdidos. Meça tempo até conclusão e idade do trabalho pendente, não apenas se a API respondeu 202.

## Continue estudando

- [Mensagens acessíveis com aria-live](./acessibilidade-formularios-erros-aria-live.md)
- [Retry e idempotência](./system-design-erros-retry-pagamentos.md)
- [Disponibilidade e operação](./system-design-disponibilidade-observabilidade.md)
