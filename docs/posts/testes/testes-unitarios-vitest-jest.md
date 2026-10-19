---
title: 'Unitários com Vitest e Jest: proteger regras, não detalhes internos'
description: 'Teste uma decisão de acesso por casos significativos, escolha o runner conforme a base e mantenha clara a diferença entre regra isolada e segurança do endpoint.'
date: '2026-10-16'
category: 'Testes'
tags:
  - Unit
  - Vitest
  - Jest
---

Um **teste unitário** verifica uma unidade pequena de comportamento, como a função que decide se alguém pode editar um documento. Ele fornece entradas e compara o resultado ao esperado. Vitest e Jest oferecem recursos para executar esses testes. Antes de escolher a ferramenta, escreva os exemplos de permissão e negação que a regra precisa atender.

Unitários são úteis para regras com entradas e resultados claros. Eles oferecem feedback rápido e ajudam a localizar falhas, desde que não dependam de reproduzir cada chamada interna da implementação.

## Uma regra pequena de acesso

Em um laboratório TypeScript, crie `document-access.ts`:

```ts
export interface DocumentAccess {
  authenticated: boolean
  userOrganizationId: string
  documentOrganizationId: string
  permissions: readonly string[]
}

export function canReadDocument(access: DocumentAccess): boolean {
  return access.authenticated
    && access.userOrganizationId === access.documentOrganizationId
    && access.permissions.includes('documents:read')
}
```

A política fictícia exige sessão, mesma organização e permissão explícita. Tipos não validam IDs nem autenticam a pessoa; a função apenas decide sobre dados que recebe.

Se usada no front-end para apresentação, ela não substitui a autorização real do servidor. Se um backend adotar a regra, precisa fornecer identidade verificada e testá-la na fronteira da API.

## Uma matriz pequena e informativa

Em `document-access.test.ts`, com [Vitest](https://vitest.dev/guide/) configurado:

```ts
import { describe, expect, it } from 'vitest'
import { canReadDocument, type DocumentAccess } from './document-access'

const allowedAccess: DocumentAccess = {
  authenticated: true,
  userOrganizationId: 'org_1',
  documentOrganizationId: 'org_1',
  permissions: ['documents:read'],
}

describe('acesso ao documento', () => {
  it('permite a leitura na organização autorizada', () => {
    expect(canReadDocument(allowedAccess)).toBe(true)
  })

  it.each([
    { reason: 'sem sessão', patch: { authenticated: false } },
    { reason: 'sem permissão', patch: { permissions: [] } },
    { reason: 'outra organização', patch: { documentOrganizationId: 'org_2' } },
  ])('nega leitura: $reason', ({ patch }) => {
    expect(canReadDocument({ ...allowedAccess, ...patch })).toBe(false)
  })
})
```

Cada caso corresponde a uma condição que, se removida, deveria ser detectada. O caso positivo também importa: uma implementação que sempre nega não satisfaz o contrato.

Trocar a expressão booleana por `if`s não deveria exigir reescrever os testes. O que eles protegem é a decisão, não a forma de calculá-la.

## Vitest ou Jest?

Vitest integra-se ao ecossistema Vite; [Jest](https://jestjs.io/docs/getting-started) é uma opção consolidada com seu próprio ecossistema de configuração e transformação. Escolha considerando a base existente, ambientes de execução, suporte a módulos e custo de migração, não apenas semelhança de sintaxe.

O exemplo usa imports explícitos do Vitest. No Jest, APIs equivalentes podem vir de `@jest/globals`, mas configuração de TypeScript, ESM e mocks precisa ser verificada; não assuma que trocar um import migra a suíte inteira. Consulte [Vitest](https://vitest.dev/guide/) e [Jest](https://jestjs.io/docs/getting-started) nas versões utilizadas.

## Dependências controladas, não um mock para cada linha

Uma função pura como essa não precisa de mocks. Se uma regra usa horário ou aleatoriedade, forneça um relógio ou gerador controlável quando essa fronteira fizer sentido. Para integrações, use doubles com um contrato claro.

Verificar que uma função interna foi chamada três vezes costuma ser frágil. Em contraste, verificar que uma operação de cobrança não foi enviada após rejeição é uma observação de efeito relevante.

## Como confirmar que o teste detecta o defeito?

Em uma branch de laboratório, remova a verificação de organização e rode os casos. O caso correspondente deve falhar. Faça o mesmo com a permissão e o caminho positivo, restaurando o código depois.

Esse exercício aproxima o raciocínio de [mutation testing](https://stryker-mutator.io/docs/mutation-testing-elements/mutant-states-and-metrics/): não basta que o teste execute a linha; ele precisa distinguir uma implementação incorreta relevante. Não transforme o exercício em alterações publicadas na regra real.

## Limite do resultado

Mesmo todos esses casos passando, ainda falta provar que um endpoint nega acesso e não vaza bytes. Essa verificação fica na [integração e E2E de autorização](./testes-e2e-playwright-cypress.md).

Os arquivos são exemplos didáticos. Este blog não passa a ter Vitest ou Jest instalado por conter os trechos.
