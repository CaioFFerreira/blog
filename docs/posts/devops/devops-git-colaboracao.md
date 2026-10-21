---
title: 'Git na prática: bons commits e boas práticas de colaboração'
description: 'Aprenda a preparar commits focados, escrever mensagens claras, revisar alterações e colaborar com branches, merge e rebase.'
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

## Como fazer um bom commit

Imagine que você corrigiu a validação de senha e também reorganizou as cores da tela. Se essas mudanças entrarem juntas, quem revisar precisará entender dois problemas ao mesmo tempo. Se a mudança visual precisar ser desfeita, a correção ficará envolvida na mesma reversão.

Um commit deve ter um propósito que você consiga explicar em uma frase. A correção pode incluir implementação e teste: esses arquivos fazem parte da mesma intenção. O tamanho em linhas é uma pista, mas a relação entre as mudanças é o critério principal.

Para praticar, use um repositório de estudo com Git instalado, identidade de autor configurada e uma alteração em um arquivo já rastreado. No terminal, dentro desse repositório:

```sh
git status
git diff
git add -p
git diff --staged
git commit -m "fix(login): rejeita senha vazia"
git show --stat HEAD
```

O [git add -p](https://git-scm.com/docs/git-add) apresenta blocos de alterações para seleção: `y` inclui o bloco, `n` deixa para depois e `s` tenta dividi-lo. Arquivos novos precisam ser adicionados explicitamente, por exemplo com `git add caminho/do/arquivo`. O diff com `--staged` mostra o conteúdo selecionado; revise esse resultado antes de confirmar o commit. Execute também os testes e verificações relevantes do projeto antes de registrá-lo.

O [git commit](https://git-scm.com/docs/git-commit) registra o conteúdo preparado. Se você editar novamente um arquivo após adicioná-lo, a edição posterior fica fora do commit até outro `git add`. O último comando mostra o resumo do commit criado; mudanças deixadas de fora continuam disponíveis no diretório de trabalho.

Experimente alterar dois trechos independentes e preparar apenas um. Confira que somente ele aparece em `git diff --staged`, enquanto o outro permanece em `git diff`.

## Escreva mensagens que ajudem a entender o histórico

Uma mensagem como `ajustes` não informa qual comportamento mudou. Prefira um título direto e específico. Quando a motivação não estiver evidente, acrescente um corpo separado por uma linha em branco:

```text
fix(login): rejeita senha vazia

A validação permitia enviar o formulário sem uma senha,
gerando uma chamada que seria recusada pelo servidor.
Agora o formulário informa o erro antes do envio.
```

O título resume o efeito. O corpo registra o problema e a razão da solução. Para escrever uma mensagem com várias linhas, execute `git commit` sem `-m` e use o editor configurado no Git.

A convenção [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/) organiza o título no formato `tipo(escopo): descrição`. O escopo é opcional. A tabela mostra usos comuns:

| Tipo | Quando usar | Exemplo |
| --- | --- | --- |
| `feat` | Adicionar uma funcionalidade | `feat(produtos): adiciona filtro por categoria` |
| `fix` | Corrigir um defeito | `fix(carrinho): corrige soma das quantidades` |
| `docs` | Alterar documentação | `docs: explica como executar o projeto` |
| `refactor` | Reorganizar código preservando o comportamento esperado | `refactor(frete): extrai cálculo para função` |
| `test` | Adicionar ou ajustar testes | `test(login): cobre senha vazia` |
| `chore` | Fazer manutenção de ferramentas ou configuração | `chore: atualiza configuração do lint` |

`feat` e `fix` têm significado definido pela especificação; os demais tipos dependem da convenção adotada pela equipe. Uma quebra de compatibilidade deve ser indicada com `!` antes dos dois-pontos ou com um rodapé `BREAKING CHANGE:` explicando o impacto e a migração. Prefixos sozinhos não garantem mensagens úteis nem automatizam releases: isso depende das ferramentas configuradas.

## Hábitos para o dia a dia

- Revise o conteúdo preparado antes de cada commit. `git add .` pode incluir arquivos e alterações que você não pretendia registrar.
- Use o `.gitignore` para arquivos locais e gerados, conforme o projeto. Ele não deixa de rastrear um arquivo que já foi versionado.
- Mantenha credenciais fora do histórico. Consulte o guia de [variáveis de ambiente e segredos](./devops-env-secrets.md) para entender os limites de um arquivo `.env`.
- Dê nomes descritivos às branches, como `fix/senha-vazia`, seguindo a convenção da equipe.
- Antes de enviar para revisão, confira os testes, a documentação afetada e se o conjunto de commits conta uma história compreensível.

Fazer commits locais frequentes ajuda a registrar etapas do trabalho. Antes da integração, organize essas etapas conforme a política da equipe, coordenando qualquer reescrita de histórico já compartilhado.

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
