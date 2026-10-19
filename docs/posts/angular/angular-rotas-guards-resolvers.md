---
title: 'Router Angular: lazy loading, guards e resolvers com propósito'
description: 'Modele navegação e carregamento sem confundir proteção de interface com autorização no servidor.'
date: '2026-10-16'
category: 'Angular'
tags:
  - Router
  - Lazy loading
  - Guards
---

Uma **rota** liga um endereço, como `/clientes/42`, a uma parte da aplicação. O **Router** coordena essa navegação. Um **guard** decide se a navegação pode prosseguir segundo uma regra do cliente; um **resolver** obtém dados antes de ativar a rota. Vamos separar esses papéis para evitar telas travadas e falsas garantias de segurança.

O Router relaciona URLs a views e permite navegação sem recarregar o documento inteiro. A URL deve representar estado navegável: uma página de cliente ou filtros compartilháveis, não apenas uma variável interna. Back, forward e links diretos precisam funcionar.

## Carregue a funcionalidade quando ela for necessária

```ts
import { Routes } from '@angular/router'

export const routes: Routes = [
  {
    path: 'customers',
    loadComponent: () => import('./customers/customer-page')
      .then(module => module.CustomerPage),
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'customers',
  },
]
```

O exemplo assume um arquivo que exporta um componente [standalone](https://angular.dev/guide/components/importing) `CustomerPage`. Registre as rotas com `provideRouter(routes)` no bootstrap e importe `RouterOutlet` no componente que contém `<router-outlet />`. Para um conjunto de rotas de funcionalidade, use `loadChildren` retornando sua configuração.

O import dinâmico cria uma oportunidade de separar bundles. Importar a mesma funcionalidade ansiosamente em outro caminho pode reduzir o benefício. Lazy loading diminui JavaScript inicial, mas introduz espera na primeira navegação; preloading seletivo pode equilibrar os dois custos.

## Guard não é um firewall

[`CanActivate`](https://angular.dev/guide/routing/route-guards) decide se uma rota pode ser ativada. `CanDeactivate` pode confirmar saída com edição pendente. `CanMatch` controla a elegibilidade de uma configuração e pode permitir que o Router tente outra rota quando retorna falso.

Para redirecionar, retorne `UrlTree` ou a alternativa suportada pela sua versão, em vez de chamar navegação e retornar falso como dois efeitos separados. O backend deve validar autenticação e autorização em cada operação: o usuário controla o código que roda no navegador.

Um interceptor atua sobre requisições [HTTP](https://www.rfc-editor.org/rfc/rfc9110.html); um guard atua sobre navegação. Usar um não elimina o outro. Uma API pode responder 403 mesmo que o guard tenha permitido entrar, por mudança de permissão entre os dois momentos.

## Resolver: dados antes de ativar, com custo explícito

Um resolver busca dados necessários antes da ativação. Isso simplifica a view quando a tela não faz sentido sem uma entidade. Em contrapartida, a navegação espera. Defina feedback durante a transição, timeout e o destino quando a entidade não existe ou a rede falha.

Não resolva antecipadamente todos os gráficos secundários. Renderize a estrutura principal e carregue conteúdo não essencial separadamente. Um [Observable](https://rxjs.dev/guide/observable) que nunca oferece resultado útil pode deixar a navegação esperando; fontes de eventos contínuos não são automaticamente bons resolvers.

## Checklist de produção

Teste acesso direto à URL, usuário sem permissão, entidade inexistente, botão voltar e falha ao carregar o chunk após um deploy. Em hospedagem de SPA, configure fallback para o documento da aplicação sem transformar requisições de recursos estáticos ausentes em HTML. A política difere de um site pré-renderizado.

Referências: [rotas](https://angular.dev/guide/routing/define-routes), [guards](https://angular.dev/guide/routing/route-guards) e [resolvers](https://angular.dev/guide/routing/data-resolvers).
