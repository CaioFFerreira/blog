---
title: 'Service Workers: ciclo de vida, escopo e cache offline controlado'
description: 'Entenda quando um worker controla a página, implemente um fallback público de navegação e evite misturar cache offline com respostas autenticadas.'
date: '2026-10-16'
category: 'Navegador'
tags:
  - Service Workers
  - Cache API
  - Offline
---

Pense na mensagem exibida quando um site perde a conexão. Um Service Worker pode participar da escolha de uma resposta alternativa já armazenada, chamada **fallback**. Ele é registrado pelo site e passa por etapas de instalação e ativação. O exemplo é um laboratório separado: não instale uma política de cache ampla sem entender quais páginas ela poderá controlar.

Um [Service Worker](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) pode intermediar requisições de páginas sob seu controle e implementar comportamentos como fallback offline. Ele é um worker orientado a eventos, sem acesso direto ao [DOM](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model), e seu processo pode ser encerrado pelo navegador quando estiver ocioso.

Não use variáveis globais dele como armazenamento durável. Para dados persistentes, escolha uma API adequada, como [Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache) ou [IndexedDB](./navegador-indexeddb.md).

## Registro não significa controle imediato

O ciclo inclui instalação, ativação e controle de clientes. Uma versão nova pode aguardar enquanto a anterior ainda controla páginas abertas. `skipWaiting` e `clients.claim` mudam esse fluxo; não os aplique sem considerar compatibilidade entre página, worker e recursos estáticos.

O script e seu escopo definem quais páginas ele pode controlar. Em geral, o registro exige contexto seguro; `localhost` tem exceção de desenvolvimento. Confira os detalhes na [documentação de Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API).

## Um laboratório limitado a /demo/

Os próximos trechos são exemplos para um projeto de teste. **Nenhum worker é registrado por estes posts no blog.** Crie `/demo/sw.js` e `/demo/offline.html`, sendo o segundo uma página pública simples, sem dados de usuário.

No JavaScript de uma página dentro de `/demo/`:

```js
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/demo/sw.js', { scope: '/demo/' })
    .catch(erro => console.error('Não foi possível registrar o worker:', erro))
}
```

Os caminhos pressupõem publicação na raiz; adapte-os se houver uma subpasta de hospedagem.

## Fallback público para falha de rede

Conteúdo de `sw.js`:

```js
const cacheName = 'estudos-demo-offline-v1'
const offlineUrl = new URL('offline.html', self.registration.scope).href

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(cacheName).then(cache => cache.add(offlineUrl)),
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names => Promise.all(
      names
        .filter(name => name.startsWith('estudos-demo-offline-') && name !== cacheName)
        .map(name => caches.delete(name)),
    )),
  )
})

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || event.request.mode !== 'navigate') return

  event.respondWith((async () => {
    try {
      return await fetch(event.request)
    } catch {
      const cache = await caches.open(cacheName)
      return await cache.match(offlineUrl)
        ?? new Response('Sem conexão. Tente novamente.', { status: 503 })
    }
  })())
})
```

O exemplo guarda apenas a página pública de fallback. Ele não coloca respostas de navegação ou APIs pessoais no cache. Se a instalação não consegue obter o fallback, ela falha; não declare disponibilidade offline sem confirmar essa etapa.

[HTTP](https://www.rfc-editor.org/rfc/rfc9110.html) 404 ou 500 não faz `fetch` rejeitar automaticamente. Nesses casos, a resposta original é retornada. O fallback trata falhas de rede observadas pelo fetch, não prova que todo erro significa ausência de conexão.

## Cache API e cache HTTP não são a mesma camada

Cache API é controlada pelo código; políticas HTTP não substituem a lógica de inclusão, expiração e exclusão que você programou ali. Um worker que armazena respostas pessoais sem uma política correta pode mantê-las acessíveis depois do logout.

Os fundamentos dos cabeçalhos estão no [guia de cache HTTP](./performance-cache-memoization.md). Antes de adicionar um cache offline, defina conteúdo permitido, versão, descarte e comportamento com usuários diferentes.

## Como testar sem mascarar o resultado

Confira registro, escopo e cliente controlado em Application. Abra ou recarregue uma página após ativação quando necessário. Teste online, offline, atualização de versão e duas abas, observando qual worker atende cada uma.

Mudar para Offline no DevTools não testa todas as falhas possíveis da rede. Inspecione respostas e versões. Ao terminar o laboratório, remova o registro de `/demo/` e os caches com o prefixo usado, sem apagar indiscriminadamente dados de outras aplicações da origem.

Uma PWA confiável também precisa de atualização e recuperação previsíveis; funcionar offline uma vez não encerra o projeto.
