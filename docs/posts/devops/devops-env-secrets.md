---
title: "Configuração e segredos: o que pode chegar ao navegador?"
description: "Entenda a diferença entre gerar e executar o código e por que uma variável de ambiente pode acabar em arquivos públicos."
date: '2026-10-16'
category: 'DevOps'
tags:
  - Variáveis de ambiente
  - Secrets
  - OIDC
---

Uma **variável de ambiente** fornece configuração a um processo, como o endereço de uma API. Um **segredo** é uma credencial que precisa ficar restrita, como uma senha. **Build-time** é o momento de gerar os arquivos; **runtime**, o momento de executar o programa. Essa diferença explica por que colocar uma senha num `.env` não a protege se ela acabar no código público.

Uma variável chamada `SECRET` não é secreta se seu valor foi incluído no JavaScript enviado ao navegador. A fronteira relevante é quem recebe o resultado, não o nome do arquivo ou da variável.

## Build-time e runtime são momentos diferentes

No [Vite](https://vite.dev/guide/), variáveis expostas como `import.meta.env.VITE_*` podem ser substituídas durante o build e entram no código cliente quando utilizadas. A [documentação de ambiente do Vite](https://vite.dev/guide/env-and-mode) explica o prefixo padrão, modos e arquivos de configuração.

```js
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL
```

Uma URL pública de API pode ser apropriada. Chave privada, senha de banco e credencial de deploy não são. Mudar o prefixo de exposição não transforma o valor em segredo se ele continua no bundle.

Este blog usa `BASE_PATH` no processo de build para configurar caminhos. Esse valor não é uma credencial. Ele também não é uma configuração que muda magicamente ao iniciar um servidor de arquivos estáticos depois do build.

## Uma variável do container não reescreve o arquivo já gerado

Se você inicia uma imagem estática com outra variável de ambiente, o JavaScript pronto continua com os valores que recebeu no build, a menos que exista um mecanismo explícito de configuração durante a execução.

Uma estratégia possível é carregar um arquivo público de configuração ou um endpoint antes de iniciar a aplicação. Esse contrato exige validação, política de cache, comportamento de falha e cuidado com serialização. O arquivo continua público; não coloque secrets nele.

Escolha entre construir por ambiente ou promover o mesmo artefato com configuração pública externa. Registre a decisão e sua relação com testes e rollback.

## Onde secrets pertencem?

Credenciais de deploy ficam no contexto autorizado do pipeline ou em uma integração de identidade, com acesso mínimo ao destino. Secrets de aplicação pertencem ao processo servidor ou serviço que precisa usá-los, não ao front-end distribuído.

Arquivo `.env` ignorado pelo [Git](https://git-scm.com/doc) evita um caminho de publicação, mas não impede exposição por logs, artefato, imagem ou comando de build. Um secret copiado para uma camada [Docker](https://docs.docker.com/get-started/) pode permanecer acessível mesmo se uma camada posterior apagar o arquivo.

Para um build que precisa autenticar em um registry de dependências, mecanismos de secrets do [BuildKit](https://docs.docker.com/build/buildkit/) podem montar o valor temporariamente. O comando ainda não deve copiá-lo para a saída nem registrá-lo. Veja os [build secrets do Docker](https://docs.docker.com/build/building/secrets/).

## OIDC para o pipeline: menos credenciais duradouras

Uma federação pode permitir que o job apresente sua identidade e obtenha credenciais temporárias na cloud. Isso exige confiança configurada dos dois lados, com emissor, audiência e condições restritas a repositório, branch ou ambiente esperado.

Dar `id-token: write` no [GitHub Actions](https://docs.github.com/en/actions) permite solicitar um token [OIDC](https://openid.net/specs/openid-connect-core-1_0.html); não concede sozinho uma função na AWS ou Azure. O provedor precisa aceitar a identidade dentro da política definida. A [documentação de OIDC do Actions](https://docs.github.com/en/actions/concepts/security/openid-connect) descreve essa relação.

Não reutilize uma política de produção para qualquer PR. Código não confiável que alcança uma credencial temporária ainda pode abusar dela enquanto válida.

## Rotação e investigação

Se uma credencial vaza, revogue ou rotacione na origem, examine uso e remova referências expostas conforme o procedimento. Substituir uma variável no painel não apaga valores que já entraram em builds públicos, logs ou caches.

Mascaramento de logs não é uma garantia universal: transformações e combinações podem escapar da máscara. Evite imprimir secrets e não dependa de uma ferramenta para reconhecer todo formato possível.

## Exercício verificável

Use um marcador público fictício no build e localize-o nos arquivos de saída para entender a fronteira. Depois verifique se o artefato contém somente os arquivos esperados. Nunca faça esse experimento com uma credencial real.

O desenho da sessão de usuário é outra responsabilidade: para isso, siga o [guia de autenticação no BFF](./system-design-autenticacao-seguranca.md).
