---
title: "CI/CD: do código alterado ao site publicado"
description: "Acompanhe as etapas de verificação, build e publicação, distinguindo arquivos gerados, cache e permissões do pipeline."
date: '2026-10-16'
category: 'DevOps'
tags:
  - CI/CD
  - GitHub Actions
  - GitLab CI
---

Depois de alterar um arquivo, você pode precisar conferir tipos, executar testes, gerar o site e publicá-lo. Um **pipeline** organiza essas etapas; cada **job** executa uma parte. **CI** é integração contínua, com verificações frequentes das mudanças; **CD** trata da entrega ou implantação contínua. Vamos acompanhar os arquivos produzidos e as permissões usadas em cada etapa.

Integração contínua oferece feedback automatizado sobre mudanças frequentes. Entrega contínua mantém uma versão publicável disponível; deploy contínuo publica automaticamente as mudanças que passam pelas condições definidas. Aprovações e ambientes fazem parte da política de entrega.

## O caminho tem alternativas

```text
push → CI → verificações → build → artefato versionado
                                      │
                      ┌───────────────┴──────────────┐
                      ▼                              ▼
                arquivos estáticos            imagem Docker
                      │                              │
                      ▼                              ▼
                 CDN / hosting                registry → servidor
                      └───────────────┬──────────────┘
                                      ▼
                               verificação da release
```

[Docker](https://docs.docker.com/get-started/) não é uma etapa obrigatória de todo front-end. Este blog já gera arquivos estáticos e possui um workflow de GitHub Pages. Os exemplos abaixo ensinam validação e empacotamento; não substituem nem executam seu deploy atual.

## Verificações devem corresponder ao projeto

Uma aplicação pode ter lint, checagem de tipos, testes unitários, testes de integração e build. Aqui, `npm run build` já executa a checagem TypeScript e o build do VitePress. O projeto não tem scripts de lint ou suíte de testes configurados; não apresente essas etapas como se estivessem rodando.

Quando houver uma suíte, execute-a antes de aprovar o artefato e trate falhas como falhas. `continue-on-error` ou `|| true` não devem esconder um check obrigatório.

## Um exemplo mínimo de GitHub Actions

Este YAML poderia viver em um workflow separado de validação. Ele pressupõe o Node definido em `.nvmrc` e o lockfile presente:

```yaml
name: Validar blog
on:
  pull_request:
  push:
    branches: [main]
permissions:
  contents: read
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: blog-static
          path: docs/.vitepress/dist
          include-hidden-files: true
          if-no-files-found: error
```

As tags de actions tornam o exemplo legível, mas são referências mutáveis. Em uma política de maior controle, fixe SHAs completos verificados e mantenha atualizações revisadas. O caminho de saída fica sob um diretório oculto; confira o conteúdo do artefato e nunca habilite arquivos ocultos de todo o repositório indiscriminadamente.

## A mesma ideia no GitLab CI

Exemplo de `.gitlab-ci.yml` para empacotar os mesmos arquivos:

```yaml
image: node:22-alpine
stages:
  - validate
validate:
  stage: validate
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - docs/.vitepress/dist/
    expire_in: 7 days
```

Esse job exige um runner compatível. Ele não publica em GitLab Pages nem cria imagem Docker. Use a [referência de configuração do GitLab](https://docs.gitlab.com/ci/yaml/) para regras de execução, jobs e mecanismos de ambiente da instalação utilizada.

## Cache acelera; artefato identifica uma saída

Cache de dependências evita parte do download, sem substituir [`npm ci`](https://docs.npmjs.com/cli/v11/commands/npm-ci). Um **artefato** é a saída guardada de uma execução, como os arquivos do site. Ele pode ser enviado a outro job ou inspecionado antes da publicação. Não faça deploy reconstruindo casualmente o que foi validado se a intenção é promover exatamente o mesmo resultado.

Registre commit e configuração junto da saída. A [documentação de artefatos do GitHub](https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts) detalha armazenamento e compartilhamento.

## Confiança e permissões

Código de um PR não confiável pode executar durante build e testes. Não ofereça credenciais de produção a esse contexto. Separe validação sem privilégios de publicação autorizada, restrinja permissões e proteja ambientes.

Não use `pull_request_target` para executar código do PR com acesso privilegiado sem um desenho de segurança explícito. Consulte as [orientações de segurança do Actions](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions).

## Como verificar

Provoque um erro de tipo numa branch de teste e confirme o bloqueio. Inspecione o artefato, abra uma rota interna e confira o caminho base da hospedagem. Se uma falha bloqueia o build mas o deploy ainda acontece, o encadeamento precisa ser corrigido.

## Continue estudando

- [Docker e registry](./devops-docker-registry.md)
- [Secrets e configuração](./devops-env-secrets.md)
