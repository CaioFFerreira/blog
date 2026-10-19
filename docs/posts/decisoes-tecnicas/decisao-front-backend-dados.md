---
title: 'Isso pertence ao Front ou Backend? Autoridade, experiência e exposição de dados'
description: 'Distribua apresentação e regras autoritativas num fluxo de desconto, e revise um endpoint para não enviar informação que a interface apenas esconde.'
date: '2026-10-16'
category: 'Decisões técnicas'
tags:
  - Front-end
  - Backend
  - Exposição de dados
  - Segurança
---

Pense num desconto mostrado no carrinho: o navegador pode calcular uma prévia para responder rápido, mas o servidor precisa decidir o valor aceito na compra. Aqui, **autoridade** é a parte responsável pela decisão final, e **contrato** é o acordo sobre os dados e comportamentos da integração. Esconder um dado na tela não impede que ele seja lido se já foi enviado.

“Conseguimos calcular no navegador” não responde quem deve ser a autoridade. Também não significa que todo detalhe visual precisa de uma chamada ao servidor. Separe experiência local de decisões que precisam permanecer corretas fora daquela interface.

## O caso: simulação de desconto numa compra

A pessoa seleciona itens e vê uma estimativa. Desconto depende da conta, promoção vigente e limites de uso. A proposta precisa continuar válida se outra aplicação fizer a compra ou se a requisição for alterada manualmente.

| Parte da experiência | Responsabilidade sugerida |
| --- | --- |
| Abrir painel e organizar entradas | Cliente |
| Validação imediata de formato | Cliente, com validação correspondente no servidor |
| Estimativa não autoritativa | Cliente, se o contrato permitir |
| Elegibilidade e valor autorizado | Servidor |
| Persistência e prevenção de efeitos duplicados | Servidor e suas integrações |

Uma mensagem deve distinguir estimativa de confirmação. O backend recalcula ou verifica os valores conforme a regra, sem confiar no preço enviado pelo cliente como fato.

## Duplicar validação pode ter propósito; duplicar autoridade, não

Checar um campo obrigatório no navegador melhora o feedback. Checá-lo no servidor protege a entrada de todos os consumidores. Já manter duas versões divergentes de uma regra comercial pode produzir promessas que a compra não cumpre.

Se compartilhar um pacote de regras fizer sentido, preserve a responsabilidade do servidor pela decisão final e a compatibilidade entre versões. Um cliente antigo pode continuar usando uma regra antiga depois do deploy.

## O endpoint está expondo informação demais?

Imagine que a página precisa de nome e plano do cliente, mas a API devolve também observações internas, limites privados e identificadores de outros sistemas. O fato de o template não renderizar esses campos não protege o conteúdo: ele já chegou ao navegador.

Defina um contrato de saída por finalidade e permissão. Para o exemplo, construa uma projeção explícita:

```ts
interface InternalCustomer {
  id: string
  displayName: string
  planName: string
  internalNotes: string
}

interface PublicCustomerSummary {
  id: string
  displayName: string
  planName: string
}

function toCustomerSummary(customer: InternalCustomer): PublicCustomerSummary {
  return {
    id: customer.id,
    displayName: customer.displayName,
    planName: customer.planName,
  }
}
```

O nome `PublicCustomerSummary` significa permitido para o público definido pelo caso, não necessariamente uma rota anônima. A autorização deve acontecer antes da projeção e considerar campos permitidos nesse contexto.

Retornar `{ ...customer }` com um tipo de retorno mais estreito não remove propriedades durante a execução. O [guia de utility types](./typescript-utility-mapped-types.md) explica a diferença. Para o risco de ler ou escrever campos sem permissão, consulte a [orientação OWASP sobre autorização por propriedade](https://owasp.org/API-Security/editions/2023/en/0xa3-broken-object-property-level-authorization/).

## Entrada também exige uma lista explícita de valores permitidos

Não transforme todo JSON recebido num patch de entidade. A pessoa pode tentar enviar campos como perfil de acesso ou limites. Selecione o que a operação admite, valide e autorize cada alteração necessária.

Isso precisa valer em REST, [GraphQL](https://graphql.org/learn/), jobs e interfaces administrativas. Mover uma lógica para o [BFF](https://learn.microsoft.com/en-us/azure/architecture/patterns/backends-for-frontends) não dispensa a regra no domínio responsável quando existem outros caminhos de entrada.

## Como verificar a decisão

Teste duas identidades com permissões distintas e inspecione o conteúdo da mensagem real. Tente enviar campos não editáveis e valores modificados. Confira o efeito persistido, não só a mensagem da UI.

Um teste relevante falha se o campo restrito reaparecer numa resposta após refatoração. A proteção não pode depender de um snapshot do componente que nunca chega a renderizá-lo.

## Continue estudando

- [Servidor, gateway e regra de negócio](./backend-requisicao-rest-gateway.md)
- [Autorização e sessão](./system-design-autenticacao-seguranca.md)
- [Escolher a fronteira do teste](./testes-estrategia-risco.md)
