---
title: "Pagamento sem resposta: quando consultar e quando tentar novamente"
description: "Entenda resultado desconhecido, idempotência e limites de tentativas para evitar que uma falha de conexão vire cobrança duplicada."
date: '2026-10-16'
category: 'System Design'
tags:
  - Retry
  - Idempotência
  - Pagamentos
  - Tratamento de erros
---

**Retry** é repetir uma tentativa; **timeout** é atingir o limite de espera. **Idempotência** é preservar o efeito previsto quando uma mesma operação é repetida conforme seu contrato. Pense no pagamento cuja resposta não chegou: antes de reenviar, precisamos de uma forma estável de identificar a intenção e consultar o que aconteceu.

O cliente envia um pagamento e a conexão cai antes da resposta. A operação falhou? Talvez não: o servidor pode ter processado e perdido apenas o caminho de volta.

Nesse cenário, “tentar novamente” sem um contrato pode gerar outra cobrança. Timeout descreve o que o cliente observou, não necessariamente o resultado do negócio.

## Modele o resultado desconhecido

Um fluxo didático pode distinguir:

```ts
type PaymentState =
  | { status: 'idle' }
  | { status: 'submitting'; operationKey: string }
  | { status: 'processing'; paymentId: string }
  | { status: 'confirmed'; paymentId: string }
  | { status: 'rejected'; message: string }
  | { status: 'unknown'; operationKey: string }
```

`unknown` significa que a UI não conseguiu determinar o resultado. Ele pede **reconciliação**, isto é, consultar e confrontar os registros do servidor para descobrir o resultado, não uma mensagem categórica de “pagamento não realizado”. `processing` já tem uma operação reconhecida, mas ainda sem conclusão.

Um botão desabilitado evita alguns cliques repetidos na mesma tela; não protege contra refresh, duas abas, reenvio ou repetição entre serviços.

## Idempotência exige participação do servidor

Um contrato hipotético de criação:

```http
POST /api/payments
Content-Type: application/json
Idempotency-Key: operation_7cfe
```

```json
{
  "invoiceId": "invoice_123",
  "paymentMethodId": "method_456"
}
```

O cliente cria uma chave para a intenção de pagamento e a reutiliza nas tentativas da mesma intenção. O servidor precisa definir escopo por identidade, retenção, comparação do conteúdo da mensagem e resposta para duplicatas ou execução concorrente.

Registrar a chave e iniciar o efeito de modo incoerente pode deixar uma janela de duplicação. A estratégia precisa alcançar a integração com o processador, usando seus recursos de idempotência e reconciliação quando disponíveis. A [documentação da Stripe](https://docs.stripe.com/api/idempotent_requests) é um exemplo concreto de contrato; suas regras não são automaticamente iguais às de qualquer provedor.

Uma operação nova e legitimamente diferente precisa de outra intenção. Gerar uma chave nova a cada retry derrota a proteção. A chave também não substitui autorização nem limites de uso.

## Defina como consultar a conclusão

O servidor pode devolver um ID e `202 Accepted` para acompanhamento, ou confirmar conforme a semântica da API. Aceitar processamento não significa concluir pagamento.

Se o envio ficou sem resposta, ofereça um caminho autenticado de consulta pela referência estável prevista no contrato. Se não for possível determinar o resultado, encaminhe para reconciliação e suporte sem afirmar sucesso ou incentivar uma nova cobrança.

## Nem todo erro merece retry

Validação inválida e falta de permissão normalmente exigem outra ação, não mais tentativas iguais. Respostas como 429 ou certos 503 podem admitir retry, respeitando a política e `Retry-After` quando presente.

Até um GET precisa de limites. Uma tempestade de tentativas em navegador, [BFF](https://learn.microsoft.com/en-us/azure/architecture/patterns/backends-for-frontends) e serviço pode multiplicar a carga quando a dependência já está degradada. Escolha uma camada responsável pelo retry e um orçamento total.

A [orientação da AWS sobre timeouts e jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/) destaca esses riscos de amplificação e efeitos colaterais.

## Backoff e jitter: aumente a espera e espalhe as próximas tentativas

**Backoff** aumenta o intervalo entre tentativas; **jitter** acrescenta variação para evitar que vários clientes repitam juntos. Esta função calcula apenas o atraso de uma política didática de full jitter, em milissegundos:

```ts
function retryDelay(attempt: number, random = Math.random): number {
  if (!Number.isInteger(attempt) || attempt < 0 || attempt > 10) {
    throw new Error('Tentativa fora do intervalo permitido.')
  }

  const sample = random()
  if (!Number.isFinite(sample) || sample < 0 || sample >= 1) {
    throw new Error('A amostra deve estar entre 0, inclusive, e 1, exclusive.')
  }

  const ceiling = Math.min(5000, 250 * 2 ** attempt)
  return Math.floor(sample * ceiling)
}

console.log(retryDelay(0, () => 0.5))
console.log(retryDelay(3, () => 0.5))
```

As saídas são `125` e `1000`. Isso não implementa um cliente [HTTP](https://www.rfc-editor.org/rfc/rfc9110.html) nem autoriza dez retries. Uma política real define número pequeno de tentativas, prazo total, erros elegíveis, cancelamento e tratamento de `Retry-After`.

Abortar a espera no navegador não desfaz automaticamente a transação no servidor. Não faça retries de pagamentos sem a garantia de contrato apenas porque a função de atraso existe.

## Teste as falhas no ponto exato

Simule conexão perdida antes e depois do processamento, envio duplicado simultâneo, provedor lento e retorno de webhook repetido. Verifique o número de efeitos reais e a mensagem exibida.

O requisito relevante é a semântica de negócio com reconciliação, não prometer “exactly once” só por adicionar um cabeçalho. Preserve rastreabilidade sem registrar dados sensíveis de pagamento.

## Continue estudando

- [Contratos de API e erros](./system-design-bff-contratos-api.md)
- [Observabilidade e correlação](./system-design-disponibilidade-observabilidade.md)
