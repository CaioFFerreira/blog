---
title: 'localStorage, sessionStorage e cookies: onde guardar cada dado?'
description: 'Compare duração, isolamento e envio ao servidor, e implemente uma preferência local com validação e tratamento de falhas.'
date: '2026-10-16'
category: 'JavaScript'
tags:
  - localStorage
  - sessionStorage
  - Cookies
  - Web APIs
---

O check de “Estudado” deste blog continua marcado quando você recarrega a página porque o progresso é salvo no [`localStorage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage). Mas esse mecanismo não é adequado para qualquer tipo de dado.

Pense numa preferência de tema: ela pode ser lembrada no próprio navegador. **Armazenar** um dado significa guardá-lo para leitura posterior. `localStorage`, `sessionStorage` e cookies têm regras diferentes de duração, acesso e envio ao servidor. Primeiro vamos entender essas diferenças; depois, escolher onde cada informação faz sentido.

## Compare pela necessidade

| Recurso | Duração e compartilhamento | Enviado automaticamente em requisições? |
| --- | --- | --- |
| `localStorage` | Persiste entre sessões; compartilhado por páginas da mesma origem | Não |
| [`sessionStorage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage) | Vinculado à origem e à sessão da aba; sobrevive ao reload | Não |
| [Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies) | Podem ser de sessão ou ter expiração; envio depende de domínio, caminho e políticas | Sim, quando as regras do cookie permitem |

Origem combina protocolo, host e porta. `http://localhost:5173` e `http://localhost:5174` têm armazenamentos web diferentes. Caminhos como `/blog/` e `/portfolio/` na mesma origem compartilham `localStorage`; use chaves com prefixos para evitar colisões.

Persistir não é garantir permanência: a pessoa pode limpar os dados, políticas do navegador podem removê-los e navegação privada tem regras próprias. Não use armazenamento local como única cópia de informação essencial.

## localStorage: chaves e valores são strings

```js
localStorage.setItem('meu-blog:tema', 'escuro')
console.log(localStorage.getItem('meu-blog:tema'))
localStorage.removeItem('meu-blog:tema')
console.log(localStorage.getItem('meu-blog:tema'))
```

Em uma página com armazenamento disponível, as saídas são `escuro` e `null`. Para objetos ou arrays, serialize e valide o que leu.

Evite `localStorage.clear()` para remover apenas os dados do seu recurso: isso apaga todas as chaves daquela área de armazenamento, inclusive de outras aplicações na mesma origem.

## Um exemplo defensivo de preferência

```js
const chaveTema = 'meu-blog:tema:v1'

function lerTema() {
  try {
    const salvo = JSON.parse(localStorage.getItem(chaveTema) ?? 'null')
    return salvo === 'claro' || salvo === 'escuro' ? salvo : 'escuro'
  } catch {
    return 'escuro'
  }
}

function salvarTema(tema) {
  if (tema !== 'claro' && tema !== 'escuro') return false

  try {
    localStorage.setItem(chaveTema, JSON.stringify(tema))
    return true
  } catch {
    return false
  }
}

console.log(salvarTema('claro'))
console.log(lerTema())
```

Com armazenamento disponível, as saídas são `true` e `claro`. Se a gravação estiver bloqueada ou sem espaço, a função retorna `false`. A aplicação pode continuar com a preferência em memória e informar que ela não será lembrada.

`JSON.parse` pode falhar. Mesmo quando funciona, o resultado pode ter formato inesperado: outro código, uma versão antiga ou a própria pessoa pode ter alterado a chave. Validar o conteúdo faz parte da leitura, não apenas da tipagem em TypeScript.

## sessionStorage: dados temporários de uma aba

```js
try {
  sessionStorage.setItem('meu-blog:filtro', 'JavaScript')
  console.log(sessionStorage.getItem('meu-blog:filtro'))
} catch (erro) {
  console.error('Não foi possível guardar o filtro nesta sessão.', erro)
}
```

Esse filtro normalmente continua disponível após recarregar a mesma aba. Outra aba tem sua própria sessão. Uma aba aberta com `opener` pode receber uma cópia inicial do armazenamento da aba de origem; as alterações posteriores permanecem separadas.

Fechar a aba normalmente encerra a sessão, mas mecanismos de restauração podem recuperar seu estado. Não trate esse encerramento como uma garantia de eliminação imediata de dados sensíveis.

## Cookies: participação no protocolo HTTP

Cookies são úteis quando o servidor precisa receber um dado nas requisições. Um servidor pode responder com:

```http
Set-Cookie: sessao=identificador-opaco; HttpOnly; Secure; SameSite=Lax; Path=/
```

Este é um cabeçalho [HTTP](https://www.rfc-editor.org/rfc/rfc9110.html), não um trecho para colar em JavaScript. [`HttpOnly`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#httponly) impede a leitura do cookie por APIs como `document.cookie`; `Secure` restringe seu envio a conexões seguras, com particularidades de desenvolvimento local; [`SameSite`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#samesitesamesite-value) controla contextos de envio entre sites.

Para decidir como esses atributos participam de um login real, siga o [desenho de sessão no BFF](./system-design-autenticacao-seguranca.md), que concentra expiração, logout e proteção da sessão.

Cookies têm limites pequenos e acompanham requisições compatíveis. Evite usá-los para grandes listas de preferências ou conteúdo de cache.

## Sincronizar abas com o evento storage

```js
const controller = new AbortController()

window.addEventListener('storage', event => {
  if (event.storageArea === localStorage
    && (event.key === chaveTema || event.key === null)) {
    console.log('Tema atualizado em outra aba:', lerTema())
  }
}, { signal: controller.signal })
```

Use esse trecho depois das funções de tema. O evento informa mudanças feitas em outros documentos que compartilham a área. Ele não dispara na janela que executou a gravação; atualize também o estado local dessa janela. Para encerrar a observação, chame `controller.abort()`.

O exemplo usa `localStorage`. No caso de `sessionStorage`, o compartilhamento e os eventos ficam restritos à mesma sessão de aba e aos documentos compatíveis dentro dela, como iframes da mesma origem.

## Cuidados práticos

- `localStorage` e `sessionStorage` têm APIs síncronas. Muitas leituras ou serializações grandes podem bloquear a interface; para dados estruturados e acesso assíncrono, veja o [exemplo com IndexedDB e transações](./navegador-indexeddb.md).
- Scripts da mesma origem podem acessar Web Storage. Não o trate como cofre de segredos.
- No build estático e no servidor não há `window` nem `localStorage`. Em Vue, faça a leitura em `onMounted` para preservar a renderização inicial.
- O progresso local não acompanha a pessoa entre dispositivos. Isso exigiria sincronização com uma conta e um serviço.

## Continue estudando

- [Web Storage API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
- [sessionStorage — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage)
- [Usando cookies HTTP — MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies)
