---
title: 'Linux e Nginx para front-end: servir arquivos e localizar a camada que falhou'
description: 'Leia processos, portas, permissões e respostas HTTP e configure rotas estáticas sem transformar qualquer arquivo ausente em sucesso com HTML.'
date: '2026-10-16'
category: 'DevOps'
tags:
  - Linux
  - Nginx
  - Diagnóstico
---

Um **processo** é um programa em execução; uma **porta** identifica um ponto de comunicação no computador. O **Nginx** é um servidor que pode entregar arquivos pela web. Quando o site falha, verificar essas partes separadamente ajuda a distinguir “o programa não iniciou”, “não consigo alcançá-lo” e “ele não encontrou o arquivo solicitado”.

Quando uma página não abre, comece distinguindo processo, porta, servidor [HTTP](https://www.rfc-editor.org/rfc/rfc9110.html), arquivos e borda. Reiniciar tudo antes de observar pode apagar evidências e não corrigir a causa.

## Um roteiro de inspeção no host

Em um ambiente Linux de laboratório, conforme ferramentas e permissões disponíveis:

```sh
pwd
ls -la
ps -ef
ss -ltn
df -h
curl -I http://127.0.0.1:8080/
```

Confira diretório, processo, portas em escuta, espaço em disco e resposta HTTP. `curl -I` usa HEAD; se o comportamento relevante depende de GET ou do corpo, faça também essa verificação. `127.0.0.1` dentro de um container representa o próprio container, não qualquer serviço do host.

A [referência de ps](https://man7.org/linux/man-pages/man1/ps.1.html) ajuda a interpretar processos. Saídas de processos e logs podem conter dados sensíveis; compartilhe apenas o necessário e com dados sensíveis removidos.

## Permissões e caminhos têm efeito real

O usuário do servidor precisa ler os arquivos e atravessar seus diretórios. Corrija o proprietário dos arquivos e as permissões apropriadas; `chmod 777` não é uma solução geral. Linux diferencia maiúsculas e minúsculas, então um import que funciona em outro sistema de arquivos pode falhar no servidor.

Verifique também se o processo escreve onde há permissão e se a porta esperada está realmente publicada. Um processo saudável numa porta interna não prova que a internet consegue alcançá-lo.

## Servindo o build estático do blog

Este exemplo de `nginx.conf` é compatível com o laboratório [Docker](https://docs.docker.com/get-started/) da série. Ele deve ocupar um arquivo de server no diretório de configuração apropriado, não substituir todo `nginx.conf` principal sem considerar seu contexto.

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location /assets/ {
        try_files $uri =404;
    }

    location / {
        try_files $uri $uri.html $uri/ =404;
    }
}
```

O VitePress gera HTML por página. Procurar a extensão `.html` permite atender uma URL sem ela, e `=404` preserva a falha quando não existe recurso. A [documentação de try_files](https://nginx.org/en/docs/http/ngx_http_core_module.html#try_files) explica a resolução.

Não adicione automaticamente `/index.html` como último destino. Isso pode ser adequado a certas SPAs com roteamento no cliente, mas faria um caminho inválido de site multipágina virar a página inicial. Um arquivo JavaScript ausente também não deve receber HTML com status 200.

O exemplo atende conteúdo estático na raiz e não implementa [TLS](https://developer.mozilla.org/en-US/docs/Web/Security/Transport_Layer_Security) ou proxy de API. Para uma subpasta, alinhe a URL pública, o build e a configuração de serviço; um `base` errado não é corrigido por um fallback genérico.

## Antes de recarregar uma configuração

Execute a validação de configuração no ambiente correto, como `nginx -t`, e só recarregue se ela passar. A forma de recarregar depende de container, gerenciador de serviço e permissões. Não misture comandos de host com os de uma imagem sem saber qual processo está atendendo.

Confira access log e error log nos destinos configurados. Em containers, eles podem estar direcionados a stdout e stderr; em hosts, podem estar em arquivos ou integrados ao serviço. Identifique o destino antes de procurar num caminho fixo.

## Diagnóstico por sintoma

| Sintoma | Verificação inicial |
| --- | --- |
| Connection refused | Processo, endereço e porta |
| Timeout | Rede, firewall, carga e dependências |
| 403 em arquivo estático | Caminho, permissões e regra de acesso |
| 404 numa rota válida | Saída do build, caminho base e try_files |
| JS recebe HTML | Fallback ou roteamento incorreto |
| Origem correta, site público errado | CDN, domínio, cache e release |

Cada item é uma hipótese inicial, não um diagnóstico conclusivo. Compare origem e endereço público para localizar a diferença.

## Continue estudando

- [Publicação com DNS e CDN](./devops-cloud-dns-cdn.md)
- [Releases e diagnóstico após deploy](./devops-release-rollback-observabilidade.md)
