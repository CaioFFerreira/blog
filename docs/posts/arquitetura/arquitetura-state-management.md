---
title: "Gerenciamento de estado: onde guardar os dados e quem pode alterá-los"
description: "Diferencie dados da tela, URL, rascunhos e respostas do servidor para escolher responsáveis e evitar cópias desnecessárias."
date: '2026-10-16'
category: 'Arquitetura Front-end'
tags:
  - State management
  - Ownership
  - Vue
---

**Estado** são os dados que descrevem a situação da aplicação: filtro escolhido, painel aberto, usuário autenticado ou rascunho de formulário. **Gerenciar estado** é decidir onde esses dados vivem, quem pode alterá-los e por quanto tempo são necessários. Vamos começar com essas perguntas antes de escolher uma biblioteca ou tornar tudo global.

Um [store](https://vuejs.org/guide/scaling-up/state-management.html) é um objeto ou módulo que concentra estado e operações de atualização. Torná-lo global pode facilitar o acesso a dados e, ao mesmo tempo, dificultar descobrir quem os altera. A primeira decisão de estado é definir dono, leitores, escritores e duração.

## Classifique o estado pelo comportamento

| Exemplo | Dono inicial possível | Cuidado principal |
| --- | --- | --- |
| Modal aberto | Componente ou funcionalidade | Encerrar e restaurar contexto |
| Filtro compartilhável por link | URL | Parse, validação e voltar/avançar |
| Lista recebida da API | Cache de consultas ou camada de dados | Atualização, erro e invalidação |
| Rascunho de edição | Fluxo de edição | Não modificar o dado confirmado antes de salvar |
| Sessão e permissões apresentadas na UI | Capacidade de sessão | Limpeza por usuário e revalidação |
| Progresso de estudo local | Recurso que persiste o progresso | Versão, origem e sincronização |

Não replique o mesmo valor em três lugares sem uma direção de atualização. Um filtro salvo na URL e em um store precisa de uma fonte de verdade e de regras para sincronização.

## Suba o estado só até onde ele precisa chegar

Se dois componentes irmãos compartilham uma seleção, o ancestral comum pode ser um bom dono. Props e eventos explícitos deixam a comunicação visível. Quando várias partes de uma funcionalidade precisam do estado, um composable ou store da funcionalidade pode reduzir repasses repetidos.

Um store transversal faz sentido para capacidades realmente compartilhadas, não porque importar de qualquer lugar é conveniente. A [documentação de estado do Vue](https://vuejs.org/guide/scaling-up/state-management.html) descreve a progressão entre estado local e compartilhado; a biblioteca escolhida deve servir ao contrato, não defini-lo sozinha.

## Não guarde como estado o que pode ser derivado

Se você já tem itens e seleção por ID, a quantidade selecionada pode ser calculada. Guardar também `selectedCount` exige manter duas representações sincronizadas.

```ts
interface Item {
  id: string
  title: string
}

function selectedItems(items: Item[], selectedIds: Set<string>): Item[] {
  return items.filter(item => selectedIds.has(item.id))
}

const items = [{ id: '1', title: 'Arquitetura' }]
console.log(selectedItems(items, new Set(['1'])).length)
```

A saída é `1`. Em uma camada reativa, uma propriedade computada pode representar essa derivação. O dado continua tendo um dono; o cálculo não precisa virar outra fonte de verdade.

## Dados do servidor têm um ciclo próprio

Defina quem possui o cache de consultas e quem pode invalidá-lo após uma mutação. Evite que cada componente mantenha sua própria cópia editável da mesma resposta. As regras gerais de validade estão no [guia de cache](./performance-cache-memoization.md); o [caso do portal autenticado](./system-design-cache-estado-performance.md) aplica isolamento por identidade.

Uma busca também precisa lidar com respostas fora de ordem. Cancelar a requisição anterior pode economizar trabalho, mas só aceite o resultado que ainda corresponde à consulta atual. Defina a política para erro parcial e para dados antigos enquanto uma atualização acontece.

Um rascunho pertence ao fluxo de edição, enquanto a resposta confirmada pertence à camada de dados. Essa divisão permite cancelar uma edição sem desfazer efeitos em várias telas.

## Modele transições, não combinações impossíveis

Vários booleanos independentes permitem estados como `isLoading` e `isSuccess` verdadeiros ao mesmo tempo, mesmo quando o produto não admite isso. Uma união discriminada pode representar os estados válidos:

```ts
type RequestState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string }

function messageFor<T>(state: RequestState<T>): string {
  switch (state.status) {
    case 'idle': return 'Pronto para começar'
    case 'loading': return 'Carregando'
    case 'success': return 'Dados disponíveis'
    case 'error': return state.message
  }
}
```

Esse modelo não inclui atualização em segundo plano com dados anteriores. Se o produto precisa disso, acrescente estados ou escolha uma modelagem apropriada. Tipagem não decide a experiência sozinha. O [guia de unions discriminadas](./typescript-unions-intersections.md) explica o mecanismo de refinamento e a verificação de exaustividade; aqui, a decisão é quais estados o fluxo precisa representar.

## SSR e escopo por requisição

No servidor, módulos podem ser reutilizados entre requisições. Estado mutável de usuário em um singleton pode vazar entre pessoas. Crie o estado no escopo adequado da aplicação ou requisição e siga o contrato de hidratação da ferramenta utilizada. A [documentação SSR do Vue](https://vuejs.org/guide/scaling-up/ssr) detalha esse risco.

## Checklist de uma proposta de store

Quem pode escrever? Quando ele nasce e é descartado? O dado pode ir para a URL? Precisa sobreviver a reload? O que acontece com duas abas, duas organizações e uma resposta atrasada? Quais transições precisam de teste?

Se essas perguntas estão respondidas, a biblioteca vira uma escolha de implementação muito mais clara.

## Continue estudando

- [Cache e invalidação](./performance-cache-memoization.md)
- [Progresso e armazenamento no navegador](./javascript-localstorage-sessionstorage-cookies.md)
- [Limites entre domínios](./arquitetura-features-domain-boundaries.md)
