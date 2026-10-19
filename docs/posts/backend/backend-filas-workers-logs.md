---
title: "Filas e workers: acompanhar um trabalho até sua conclusão"
description: "Entenda como um pedido aceito vira trabalho em segundo plano, como lidar com repetição e como investigar seu resultado."
date: '2026-10-16'
category: 'Backend'
tags:
  - Filas
  - Workers
  - Logs
---

Pedir um relatório e recebê-lo pronto são momentos diferentes. Uma **fila** guarda mensagens de trabalho; um **worker** é o processo que as consome e executa a tarefa. **Logs** registram acontecimentos para investigação. Neste guia, acompanhe uma solicitação desde a entrada até o resultado, incluindo a possibilidade de uma mensagem chegar mais de uma vez.

Uma API pode aceitar um trabalho e responder antes de executá-lo. Isso reduz o tempo de espera da requisição, mas cria outra responsabilidade: provar que o trabalho foi concluído, falhou ou ainda precisa de atenção.

O [caso de documentos e notificações](./system-design-documentos-notificacoes.md) já mostra o fluxo do produto. Aqui, vamos examinar a operação do consumidor e os sinais necessários para acompanhá-lo.

## Quem faz o quê?

O produtor prepara uma mensagem. O broker a recebe conforme seu contrato de entrega. O worker consome e executa o trabalho. A aplicação registra um estado consultável para que o cliente não dependa da conexão [HTTP](https://www.rfc-editor.org/rfc/rfc9110.html) original.

Não inclua grandes documentos ou credenciais na mensagem quando uma referência autorizada e durável resolve. Defina ID da operação, formato, versão e metadados necessários ao processamento.

## Confirmação de publicação e confirmação de consumo são diferentes

O produtor pode precisar confirmar que o broker aceitou a mensagem. O consumidor confirma em outro momento que o processamento foi tratado conforme o protocolo. Um desses sinais não substitui o outro.

Se o worker confirmou antes de concluir e caiu, o trabalho pode ser perdido para o fluxo esperado. Se concluiu o efeito, mas caiu antes de confirmar, pode receber a mensagem novamente. A [documentação de confirms e acknowledgements do RabbitMQ](https://www.rabbitmq.com/docs/confirms) descreve essas fronteiras num sistema concreto.

O broker escolhido define detalhes de durabilidade, entrega e reenvio. Não prometa comportamento igual em toda fila apenas porque a API usa `publish` e `consume`.

## Consumidor precisa tolerar repetição

Uma nova entrega não deveria gerar efeitos de negócio duplicados quando o contrato exige uma única operação lógica. Use um identificador estável e uma estratégia coerente na persistência e nas integrações.

O problema de coordenar banco e publicação, incluindo **outbox** — registrar a mensagem pendente na mesma transação da mudança local —, está no [guia de documentos](./system-design-documentos-notificacoes.md). Criar uma linha “processado” sem atomicidade com o efeito local pode apenas mover a janela de falha.

Uma sequência lógica do worker:

```text
receber mensagem → validar versão e dados → reconhecer a operação
       │
       ├── já concluída? → recuperar resultado e confirmar conforme o contrato
       │
       └── pendente → executar com garantias definidas
                         │
                         ├── sucesso → registrar resultado → confirmar
                         └── falha → classificar → política de nova tentativa ou investigação
```

O diagrama representa decisões, não implementa exclusão mútua nem atomicidade. Concorrência e efeitos externos precisam de um desenho próprio.

## Retry precisa ter fim e dono

Falha transitória pode admitir nova tentativa com atraso. Mensagem inválida não melhora por ser repetida mil vezes. Defina limites, destino de investigação e quem pode reprocessar após corrigir a causa.

Uma [dead-letter queue](https://www.rabbitmq.com/docs/dlx) recebe mensagens encaminhadas para tratamento separado conforme as regras do broker, por exemplo após rejeição ou expiração. Ela não resolve o incidente sozinha: alguém precisa observar, entender e agir. Idade da mensagem e tempo até conclusão costumam ser sinais mais úteis que apenas contar consumidores vivos.

O [guia de retry](./system-design-erros-retry-pagamentos.md) concentra backoff e orçamento de tentativas; o worker precisa aplicar essa política sem multiplicar retries já feitos por outros serviços.

## Logs estruturados permitem acompanhar a operação

Exemplo de evento de conclusão, com IDs fictícios:

```json
{
  "level": "info",
  "event": "document_job_completed",
  "jobId": "job_123",
  "requestId": "request_456",
  "attempt": 2,
  "durationMs": 840,
  "result": "ready"
}
```

O contexto liga a chamada inicial ao trabalho assíncrono. IDs devem ser validados e tratados como correlação, não autorização. Não registre tokens, conteúdos das mensagens pessoais ou URLs assinadas para “facilitar o suporte”.

Defina campos estáveis, retenção, acesso e sanitização. Mensagens de log também podem conter entrada não confiável; evite permitir que ela desorganize o formato ou injete eventos aparentes. A [referência de logging da OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html) aborda esses cuidados.

## Como verificar a conclusão de verdade?

Simule queda antes e depois do efeito, mensagem repetida e versão desconhecida. Confira estado final, quantidade de efeitos, confirmação e possibilidade de reprocessamento. Um teste que só vê a mensagem entrar na fila não demonstra que o documento ficou disponível.

Logs ajudam a explicar uma execução, mas métricas e traces complementam a distribuição e o caminho. Essa combinação está no [guia de observabilidade](./system-design-disponibilidade-observabilidade.md).
