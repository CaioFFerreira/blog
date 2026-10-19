---
title: "Dados frequentes no Angular: atualizar a tela sem sobrecarregar o navegador"
description: "Separe recebimento de eventos, cálculos e atualizações visuais; entenda quando usar um Web Worker e como limitar filas."
date: '2026-10-16'
category: 'Angular'
tags:
  - Web Workers
  - Telemetria
  - Performance
---

**Telemetria** são dados enviados para acompanhar o que acontece, como posições de um veículo. O navegador recebe esses dados, processa e atualiza a tela, mas cada etapa pode ter um ritmo diferente. Um **Web Worker** executa JavaScript separado do fluxo principal da interface e pode ajudar quando os cálculos, e não a rede, causam o atraso.

Receber cem posições por segundo não significa que a tela deva redesenhar cem vezes. Antes de otimizar, defina dois requisitos diferentes: quantos eventos precisam ser preservados e quantas atualizações visuais são úteis. Um mapa pode mostrar a posição recente enquanto auditoria exige preservar toda a trajetória.

## Separe três ritmos

1. **Ingestão:** geolocalização, [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) ou outra fonte recebe eventos.
2. **Processamento:** valida, agrega e calcula dados derivados.
3. **Apresentação:** publica um estado resumido na frequência necessária.

[`auditTime`](https://rxjs.dev/api/operators/auditTime) pode limitar atualizações mostrando o último valor de uma janela. [`debounceTime`](https://rxjs.dev/api/operators/debounceTime) espera silêncio e pode não emitir durante uma fonte permanentemente ativa. Nenhum deles deve descartar os únicos registros de um fluxo que exige histórico completo. Persistência e visualização podem precisar de pipelines separados.

## Worker para CPU, não para qualquer operação

Um [Web Worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API) executa processamento fora da fluxo principal de execução, mas não acessa o [DOM](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model). Requests assíncronos já aguardam rede sem bloquear o JavaScript; colocar um fetch simples em worker não resolve automaticamente um gargalo.

No projeto Angular, `ng generate web-worker telemetry` cria a estrutura de integração. Exemplo do lado da UI, em código executado somente no navegador:

```ts
const telemetryWorker = new Worker(new URL('./telemetry.worker', import.meta.url))

telemetryWorker.onmessage = ({ data }: MessageEvent<{ averageSpeed: number }>) => {
  console.log(data.averageSpeed)
}

telemetryWorker.postMessage({ speeds: [10, 20, 30] })
```

No arquivo do worker:

```ts
addEventListener('message', ({ data }: MessageEvent<{ speeds: number[] }>) => {
  const total = data.speeds.reduce((sum, speed) => sum + speed, 0)
  postMessage({ averageSpeed: data.speeds.length ? total / data.speeds.length : 0 })
})
```

O resultado esperado é `20`. É um exemplo didático de comunicação, não justificativa para criar worker para três números. Em produção, valide mensagens, trate falhas e considere o custo de cópia. ArrayBuffers transferíveis podem evitar cópia, mas o remetente perde acesso ao buffer transferido.

## Não troque travamento por fila infinita

Defina tamanho máximo de lote, capacidade da fila e quantidade de jobs em andamento. Se o processamento atrasar, escolha explicitamente entre backpressure (reduzir o ritmo da origem), agregação, descarte permitido ou persistência para processar depois. Use IDs de job para não apresentar uma resposta antiga sobre um estado mais recente.

Em aplicações baseadas em Zone.js, registrar uma fonte muito frequente com `NgZone.runOutsideAngular` pode evitar verificações desnecessárias; publique apenas o resumo necessário de volta. Em [zoneless](https://angular.dev/guide/zoneless), esse escape não substitui a política de atualização: [signals](https://angular.dev/guide/signals) e marcações continuam definindo quando a UI muda.

## Limpeza de recursos e validação

Ao destruir a funcionalidade, execute `clearWatch` para geolocalização, feche assinaturas e conexões de sua propriedade e chame `terminate()` no worker. SSR não oferece `window`, geolocalização ou Worker: proteja a criação no contexto de navegador e defina fallback.

Teste carga sustentada, fila limitada e troca de tela durante processamento. O critério é manter interação responsiva e preservar os dados exigidos, não apenas baixar o número de change detections.

Referências: [workers no Angular](https://angular.dev/ecosystem/web-workers) e [long tasks](./performance-long-tasks.md).
