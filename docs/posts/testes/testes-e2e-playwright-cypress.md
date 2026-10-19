---
title: 'E2E com Playwright e Cypress: proteger jornadas e fronteiras reais'
description: 'Teste acesso por URL e API, prepare identidades controladas e distinga um fluxo com backend real de uma demonstração com respostas interceptadas.'
date: '2026-10-16'
category: 'Testes'
tags:
  - E2E
  - Playwright
  - Cypress
  - Autorização
---

**E2E** significa *end-to-end*, ou teste de ponta a ponta: percorrer uma jornada através das partes integradas do sistema. Imagine entrar com uma conta limitada e tentar abrir um documento protegido. Antes de copiar os exemplos, prepare a aplicação de teste, as contas e os dados indicados; Playwright e Cypress são ferramentas usadas para automatizar essas interações no navegador.

E2E é valioso quando o risco depende da colaboração entre partes reais: sessão, roteamento, resposta da API e interface. Ele custa mais para preparar e diagnosticar, por isso priorize jornadas que justificam essa confiança.

Os endpoints, textos e contas abaixo são contratos fictícios de um portal. Não existem neste blog. Os exemplos exigem um ambiente de teste próprio, com backend e dados controlados.

## Prepare uma identidade com uma limitação real

Crie uma conta de teste autenticada que não tenha acesso ao documento `private-document`, pertencente a outra organização. O seed precisa garantir essa relação e não depender de dados de produção.

No [Playwright](https://playwright.dev/docs/intro), configure `baseURL` e um storage state dessa conta, por exemplo `playwright/.auth/restricted.json`, gerado por um procedimento de autenticação de teste. Esse arquivo pode conter credenciais de sessão e deve ficar fora do Git e de artefatos públicos.

Não simule uma negação na API quando o objetivo é demonstrar que a autorização real funciona.

## Playwright: abra diretamente o recurso protegido

```ts
import { expect, test } from '@playwright/test'

test.use({ storageState: 'playwright/.auth/restricted.json' })

test('nega o documento a uma sessão de outra organização', async ({ page }) => {
  const response = await page.request.get('/api/documents/private-document')
  expect(response.status()).toBe(403)

  await page.goto('/documents/private-document')
  await expect(page.getByRole('heading', { name: 'Acesso negado' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Baixar documento' })).toHaveCount(0)
})
```

`page.request` compartilha o armazenamento de [cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies) do contexto de página, adequado ao modelo de sessão em cookie deste exercício. Se a aplicação autentica a API de outra forma, a fixture precisa representá-la corretamente.

O contrato do exemplo escolhe 403; uma aplicação pode usar 404 para não revelar existência, desde que isso esteja definido. Além do status, uma suíte de segurança pode verificar que o corpo e eventuais URLs de download não expõem conteúdo protegido.

Não repita toda a matriz da regra de acesso nesse nível. Alguns fluxos representativos comprovam a integração; a variedade de combinações pode ficar nos testes mais rápidos da fronteira correta.

## Cypress: o mesmo contrato de negação

Neste exemplo, um comando de suporte `cy.loginAsRestrictedUser()` deve autenticar a conta controlada pelo ambiente, e `baseUrl` precisa estar configurado. O comando não é uma API nativa do [Cypress](https://docs.cypress.io/app/get-started/why-cypress): sua implementação e, em TypeScript, sua declaração de tipo pertencem ao laboratório.

```ts
describe('documento protegido', () => {
  beforeEach(() => {
    cy.loginAsRestrictedUser()
  })

  it('nega o recurso na API e orienta a pessoa na página', () => {
    cy.request({
      url: '/api/documents/private-document',
      failOnStatusCode: false,
    }).its('status').should('eq', 403)

    cy.visit('/documents/private-document')
    cy.contains('h1', 'Acesso negado').should('be.visible')
    cy.get('[data-testid="download-document"]').should('not.exist')
  })
})
```

`failOnStatusCode: false` permite inspecionar a rejeição esperada; não transforma qualquer status em sucesso do teste, pois a asserção exige 403. O test ID pressupõe esse contrato no produto; ele é útil quando a identificação precisa ser independente de texto.

## Sincronize pelo resultado, não pelo relógio

Evite sleeps fixos como “aguardar dois segundos”. Prefira asserções que aguardam um estado observável e limites de tempo coerentes. Um teste que passa apenas num computador rápido não está estável.

Playwright oferece asserções com retry automático para locators; Cypress tem regras próprias de reexecução de queries e assertions. Nem todo comando ou efeito é repetido da mesma forma. Consulte [asserções do Playwright](https://playwright.dev/docs/test-assertions) e [boas práticas do Cypress](https://docs.cypress.io/app/core-concepts/best-practices).

## Interceptar a rede muda a evidência

Uma resposta 403 interceptada é útil para testar como a UI apresenta uma negação. Não demonstra que o servidor protege o documento. Nomeie o cenário de acordo com a fronteira e mantenha os testes reais necessários.

Para provedores de identidade e pagamento externos, use sandbox ou adapters de teste nas fronteiras apropriadas. Não faça uma suíte de PR depender de cobranças reais ou logins de terceiros sem contrato de automação.

## Continue estudando

- [Isolamento e boas práticas — Playwright](https://playwright.dev/docs/best-practices)
- [Mocks e fronteiras](./testes-mocks-contratos-assincronismo.md)
- [Release e smoke tests](./devops-release-rollback-observabilidade.md)
