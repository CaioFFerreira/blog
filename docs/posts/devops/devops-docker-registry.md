---
title: "Docker: empacotar o site e entender imagens, containers e registry"
description: "Veja como gerar uma imagem para servir o blog e quais verificações ainda faltam entre construir um pacote e publicar uma versão."
date: '2026-10-16'
category: 'DevOps'
tags:
  - Docker
  - Registry
  - Multi-stage build
---

Uma **imagem Docker** é um pacote com arquivos e instruções para iniciar um processo. Um **container** é uma execução dessa imagem, com isolamento configurado. Um **registry** armazena e distribui imagens. Neste laboratório, vamos empacotar os arquivos estáticos do blog e um servidor para entregá-los; gerar o pacote ainda não significa publicar um site acessível.

Imagem é um pacote de camadas e metadados para executar um processo. Container é uma instância em execução a partir dessa imagem. Registry armazena e distribui imagens. Uma imagem não inclui automaticamente tudo o que existe na máquina onde foi construída.

Para um blog estático, [Docker](https://docs.docker.com/get-started/) é uma opção de empacotamento, não um requisito. Os arquivos também podem ir direto para uma hospedagem estática ou CDN.

## Um laboratório com dois estágios

O exemplo abaixo pressupõe um `Dockerfile`, um `nginx.conf` como o do [guia de Linux e Nginx](./devops-linux-nginx.md) e um `.dockerignore` no contexto de build. Esses arquivos aparecem como conteúdo didático; não foram adicionados à infraestrutura real deste projeto.

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:stable-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/docs/.vitepress/dist /usr/share/nginx/html
EXPOSE 80
```

O primeiro estágio instala e gera o site. O segundo recebe apenas a saída e a configuração de serviço; não precisa de Node nem de dependências de desenvolvimento. A [documentação de multi-stage builds](https://docs.docker.com/build/building/multi-stage/) explica a separação entre estágios.

As tags usadas são mutáveis. Para entregas controladas, fixe e atualize digests conforme a política, avalie vulnerabilidades e registre o resultado efetivamente construído. O exemplo também não aplica medidas adicionais de proteção (*hardening*), como execução sem o usuário administrador (`root`), sistema de arquivos somente leitura e proteção da comunicação com [TLS](https://developer.mozilla.org/en-US/docs/Web/Security/Transport_Layer_Security). Essas decisões exigem configuração compatível com o ambiente de execução.

## Limite o contexto com .dockerignore

```text
node_modules
dist
docs/.vitepress/dist
docs/.vitepress/cache
docs/.vitepress/.temp
.git
.env
.env.*
*.log
```

Isso evita copiar saídas antigas e arquivos de ambiente usuais para o contexto. Ainda revise outros caminhos de credenciais da aplicação. Não use `.dockerignore` como único controle se o próprio build busca ou gera um secret.

Copiar primeiro os manifests permite reaproveitar a camada de instalação quando o código muda sem alterar dependências. A validade do cache depende das entradas, não de uma promessa de que toda reconstrução será rápida.

## Construir e conferir localmente

Num diretório de laboratório com os arquivos anteriores e Docker disponível:

```sh
docker build -t front-end-notes:local .
docker run --rm -p 8080:80 front-end-notes:local
```

O processo fica em primeiro plano; encerre-o ao terminar. Em outro terminal, verifique a página inicial, uma URL interna e um arquivo inexistente. Não use `vite preview` como substituto automático de um servidor de produção.

## Registry e identidade da release

Um pipeline autorizado pode enviar a imagem a um registry privado ou público. O acesso deve usar credenciais apropriadas ao job, sem colocar senhas em argumentos que acabem em histórico e logs.

Tags associadas ao commit ajudam a localizar uma versão, mas podem ser sobrescritas se o registry permitir. Um digest identifica o conteúdo da imagem; registre o digest promovido e as plataformas para as quais foi construído.

Promover o mesmo digest entre ambientes reduz diferenças de empacotamento. Entretanto, se a URL da API foi embutida durante o build, o conteúdo já está ligado àquela configuração. Veja a [diferença entre build-time e runtime](./devops-env-secrets.md).

## Persistência e dependências externas

O container pode ser removido ou substituído. Dados duráveis não devem depender de uma alteração manual no seu sistema de arquivos. Um front-end estático deve tratar a imagem como saída imutável; configurações externas precisam de contrato explícito.

Instalar Docker não configura automaticamente [DNS](https://developer.mozilla.org/en-US/docs/Glossary/DNS), HTTPS, balanceamento, health checks ou rollback. Esses elementos pertencem à estratégia de publicação e operação.

## Como verificar

Inspecione os arquivos da imagem final e confirme que dependências de build e arquivos de ambiente não foram copiados. Compare o digest executado ao registrado no pipeline e teste a versão em seu endereço real antes de considerá-la entregue.
