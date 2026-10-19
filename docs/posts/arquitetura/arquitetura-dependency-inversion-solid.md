---
title: "SOLID e dependências: separar responsabilidades com contratos pequenos"
description: "Entenda como uma parte do código pode pedir o que precisa sem depender de todos os detalhes de outra implementação."
date: '2026-10-16'
category: 'Arquitetura Front-end'
tags:
  - Dependency inversion
  - SOLID
  - Separation of concerns
  - TypeScript
---

Uma **dependência** existe quando uma parte do código precisa de outra para funcionar. Pense numa tela que lista artigos: ela precisa obter artigos, mas não precisa conhecer todos os detalhes da conexão. Um **contrato** descreve o que essa operação recebe e entrega. A inversão de dependências usa essa separação para facilitar mudanças e testes.

Uma regra de exibição não deveria conhecer todos os detalhes da biblioteca [HTTP](https://www.rfc-editor.org/rfc/rfc9110.html), assim como um botão genérico não deveria decidir se uma cobrança pode ser feita. Separar preocupações significa delimitar razões de mudança, não apenas separar extensões `.vue` e `.ts`.

## Dependency inversion: o contrato parte da necessidade

Considere um caso de uso que precisa listar clientes. Ele pode declarar a capacidade de que depende, enquanto um adaptador fornece os detalhes da rede.

O exemplo abaixo cabe em um único arquivo TypeScript para estudo. Em uma aplicação maior, tipos e caso de uso poderiam ficar na funcionalidade, e o adaptador perto da integração correspondente.

```ts
interface Customer {
  id: string
  name: string
}

interface CustomerReader {
  list(signal?: AbortSignal): Promise<Customer[]>
}

function createListCustomers(reader: CustomerReader) {
  return async function listCustomers(signal?: AbortSignal) {
    const customers = await reader.list(signal)
    return customers.filter(customer => customer.name.trim().length > 0)
  }
}

function createHttpCustomerReader(baseUrl: string): CustomerReader {
  return {
    async list(signal) {
      const response = await fetch(`${baseUrl}/customers`, { signal })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const data: unknown = await response.json()
      if (!Array.isArray(data)) throw new Error('Resposta inválida')

      return data.map((item: unknown) => {
        if (typeof item !== 'object' || item === null
          || !('id' in item) || typeof item.id !== 'string'
          || !('name' in item) || typeof item.name !== 'string') {
          throw new Error('Cliente inválido')
        }

        return { id: item.id, name: item.name }
      })
    },
  }
}

const listCustomers = createListCustomers(createHttpCustomerReader('/api'))
```

O exemplo pressupõe uma API `/api/customers` que devolve uma lista com `id` e `name` strings. A regra de ignorar nomes vazios é didática e precisaria ser confirmada com o produto. Não há requisição até chamar `listCustomers`.

O caso de uso depende de `CustomerReader`, não da implementação HTTP. O adaptador satisfaz esse contrato; o ponto de composição escolhe qual implementação usar. Essa direção da dependência é o aspecto relevante, não existir uma classe com nome `Service`.

Injeção de dependência é uma técnica de fornecer essa implementação. Um container não é obrigatório: passar um argumento já resolve o exemplo. A [descrição de Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html) discute a direção das dependências; não é necessário reproduzir todas as camadas para aproveitar a ideia.

## Teste o contrato sem iniciar um servidor

Depois das declarações anteriores:

```ts
const fakeReader: CustomerReader = {
  async list() {
    return [{ id: '1', name: 'Caio' }, { id: '2', name: '   ' }]
  },
}

const listForTest = createListCustomers(fakeReader)
listForTest().then(customers => console.log(customers.length))
```

A saída é `1`. O fake serve ao contrato do caso de uso. Separadamente, testes do adaptador devem verificar status HTTP, validação e erros. Um fake sempre bem-comportado não comprova a integração real.

## Os cinco princípios em decisões concretas

| Princípio | Aplicação no front-end | Exagero a evitar |
| --- | --- | --- |
| Single Responsibility | Separar estado visual, regra e acesso externo quando têm motivos distintos de mudança | Um arquivo para cada linha |
| Open/Closed | Receber uma estratégia de formatação ou composição quando há variações reais | Criar um sistema de plugins para uma opção |
| Liskov Substitution | Implementações preservam o comportamento prometido pelo contrato | Fingir suporte e falhar com “não implementado” |
| Interface Segregation | Uma tela que só lê depende de um contrato de leitura | Exigir um cliente enorme com dezenas de operações |
| Dependency Inversion | Regra consome a capacidade necessária, fornecida por um adaptador | Interfaces sem fronteira ou benefício identificável |

Substituição não é só passar no TypeScript. Se uma implementação respeita cancelamento e outra ignora, o contrato precisa esclarecer essa diferença. Erros, ordenação, consistência e efeitos observáveis também fazem parte das expectativas.

Essas são aplicações práticas dos princípios ao cenário, não regras universais sobre como todo componente deve ser escrito. Funções, composição e tipos pequenos podem atendê-los sem hierarquias de classes.

## Quando não criar essa abstração?

Uma chamada simples e isolada em uma página temporária pode não precisar de uma interface e um caso de uso separado. Considere o custo quando há regras testáveis, dependência volátil, múltiplos consumidores ou necessidade de isolar integração.

Pergunte: qual alteração esperada fica mais segura com esse contrato? Se não consegue responder, uma função explícita pode ser suficiente.

## Continue estudando

- [Fronteiras por funcionalidade](./arquitetura-features-domain-boundaries.md)
- [Composição e Design Systems](./arquitetura-design-system-composicao.md)
- [Reconhecer overengineering](./arquitetura-evolucao-overengineering.md)
