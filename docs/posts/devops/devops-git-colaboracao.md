---
title: 'Git para entrega: revisar mudanças, integrar branches e desfazer com segurança'
description: 'Entenda working tree, stage e histórico, escolha merge ou rebase conforme o contexto e preserve rastreabilidade entre commit e release.'
date: '2026-10-16'
category: 'DevOps'
tags:
  - Git
  - Code review
  - Versionamento
---

Git guarda o histórico de versões dos arquivos. Um **commit** registra uma versão com seu contexto no histórico; uma **branch** permite organizar uma linha de trabalho; **push** envia referências e objetos ao repositório remoto. Antes de escolher um comando, vamos entender qual estado ele altera e como conferir o resultado.

[Git](https://git-scm.com/doc) conecta uma mudança revisável a uma versão entregue. Saber qual commit está em produção e como desfazer uma alteração é tão importante quanto conseguir fazer push.

Os comandos deste artigo são exemplos para um repositório de estudo. Não foram executados no histórico deste projeto.

## Working tree, stage e commit são estados diferentes

A working tree contém seus arquivos de trabalho. O stage, também chamado index, descreve o conteúdo preparado para o próximo commit. O commit registra um retrato do conteúdo dos arquivos (*snapshot*) e sua relação com o histórico.

Antes de registrar uma mudança:

```sh
git status --short
git diff
git diff --cached
```

`git diff` mostra alterações rastreadas ainda fora do stage; `git diff --cached` compara o conteúdo preparado com o commit atual. Arquivos novos não rastreados aparecem no status, mas não nesse diff comum.

Selecione arquivos ou trechos relacionados à tarefa. Uma revisão pequena facilita verificar intenção, riscos e testes. Não misture formatação ampla, atualização de dependências e regra de negócio sem necessidade.

## Branch curta e integração frequente

Uma branch guarda uma referência de histórico, não uma cópia isolada das permissões ou dependências do ambiente. Mantenha mudanças focadas, atualize com a base conforme a política da equipe e execute as verificações relevantes antes da integração.

Pedidos de integração, chamados **pull requests (PRs)** ou **merge requests** conforme a plataforma, ajudam a registrar problema, solução e evidências. A integração dos históricos é feita por operações como [merge](https://git-scm.com/docs/git-merge). A aprovação humana e os checks protegem coisas diferentes: um teste verde não prova que o contrato do produto está correto.

## Merge ou rebase?

Merge integra históricos e pode preservar um commit explícito de junção. [Rebase](https://git-scm.com/docs/git-rebase) reaplica commits em outra base, produzindo novos identificadores para os commits reescritos. A escolha depende da política e de quem compartilha o histórico.

Em uma branch pessoal ainda não consumida por outras pessoas, rebase pode ajudar a preparar uma sequência legível. Em histórico publicado e compartilhado, reescrever sem coordenação pode quebrar o trabalho alheio. A [explicação oficial de rebasing](https://git-scm.com/book/en/v2/Git-Branching-Rebasing) mostra o mecanismo e os cuidados.

Conflito não é resolvido só removendo marcadores. Entenda as intenções dos dois lados e teste o comportamento combinado. A ausência de conflito textual também não garante compatibilidade semântica.

## Desfazer sem apagar o contexto

Para uma alteração já compartilhada, `git revert` cria um novo commit que procura desfazer a mudança escolhida. Isso preserva o histórico; pode exigir resolução de conflitos ou tratamento específico quando o alvo é um merge.

`git reset --hard` pode descartar alterações rastreadas locais e mover referências. Ele não é o equivalente seguro de “cancelar meu último deploy”. Diferencie editar o histórico local, criar um commit de reversão e restaurar um artefato em produção.

Se um secret foi publicado, apagar a linha em um novo commit não elimina a exposição no histórico. Revogue ou rotacione a credencial e siga o procedimento de limpeza e investigação da equipe.

## Do commit ao artefato

Uma release deve permitir responder: qual commit, qual pipeline, qual configuração pública e qual artefato foram usados? Uma tag de imagem chamada `latest` não fornece sozinha essa rastreabilidade.

Registre o identificador completo do commit no pipeline e associe-o ao artefato. Se o mesmo código foi reconstruído com outra configuração, o resultado pode ser diferente; o commit não é toda a identidade da release.

## Exercício prático

Num repositório descartável, faça duas branches alterarem o mesmo comportamento. Integre, resolva o conflito e compare o resultado com o esperado. Depois crie uma reversão e verifique o diff antes de registrar.

O objetivo é explicar o efeito de cada operação antes de executá-la. Comandos decorados sem compreender referências e snapshots tornam incidentes mais arriscados.

## Continue estudando

- [Git: desfazendo alterações](https://git-scm.com/book/en/v2/Git-Basics-Undoing-Things)
- [Pipeline com Actions e GitLab CI](./devops-ci-cd-actions-gitlab.md)
- [Release e rollback](./devops-release-rollback-observabilidade.md)
