---
title: "Build e migração Angular: preparar o código para publicar e evoluir"
description: "Entenda como o Angular prepara os arquivos para publicação e como migrar uma aplicação por etapas, conferindo o que mudou."
date: '2026-10-16'
category: 'Angular'
tags:
  - AOT
  - Monorepo
  - Migração
---

Quando você desenvolve, trabalha com vários arquivos e recursos do Angular. O **build** prepara esse material para publicação: o compilador transforma o código e os templates, e o **bundler** organiza os módulos em arquivos que serão carregados. Se componentes e imports ainda são novos para você, comece pelo [guia de componentes](./angular-componentes-comunicacao.md).

Preparar a publicação envolve mais que reduzir o tamanho dos arquivos, processo chamado minificação. O compilador Angular analisa componentes e templates; o bundler organiza módulos e produz recursos estáticos. Os imports e os pontos de entrada, por onde começa a análise do código, influenciam o que será carregado em cada rota.

## AOT e tree shaking resolvem problemas distintos

[AOT](https://angular.dev/tools/cli/aot-compiler), de *Ahead-of-Time*, significa compilação antecipada: compila os templates antes de a página ser executada e permite detectar erros no build, reduzindo a necessidade de compilação de templates no navegador. Ele não remove todo o ambiente de execução Angular nem prova que a aplicação funciona corretamente.

Tree shaking elimina código não necessário quando as relações entre módulos e seus efeitos colaterais permitem. Um efeito colateral é uma ação além de disponibilizar um valor, como registrar algo globalmente ao importar o arquivo. Imports estáticos que a ferramenta consegue analisar, metadados corretos desses efeitos (*side effects*) e bibliotecas bem empacotadas ajudam. Não marque uma biblioteca como livre de efeitos se ela registra comportamentos globais durante import: uma otimização baseada nessa informação incorreta pode quebrar a versão publicada.

Lazy loading adia código; tree shaking remove código não utilizado. São mecanismos diferentes. Veja a análise independente de framework em [bundles e code splitting](./performance-bundle-code-splitting-tree-shaking.md).

## Monorepo não deve significar bundle único

Um repositório compartilhado organiza código e ferramentas; não obriga o navegador a baixar todos os produtos. Separe bibliotecas por domínio e contratos públicos. Evite imports profundos em detalhes internos e dependências circulares entre funcionalidades.

Um **barrel** é um arquivo que reexporta itens de outros módulos, frequentemente chamado `index.ts`. Ele não impede automaticamente o tree shaking. O problema concreto pode ser reexportar módulos com efeitos colaterais ou carregar imediatamente código que deveria ser adiado. Inspecione o grafo e o bundle gerado em vez de proibir arquivos `index.ts` como regra universal.

Compartilhe primitivas estáveis; não uma biblioteca central que conhece pagamentos, autenticação e relatórios. Os vantagens e custos organizacionais estão em [monorepos](./arquitetura-monorepos.md).

## Migração standalone por etapas

Em um projeto Angular compatível, atualizado e com árvore de trabalho preservada, a migração oficial oferece etapas para converter declarações, remover NgModules desnecessários e migrar o bootstrap, isto é, a inicialização da aplicação:

```sh
ng generate @angular/core:standalone
```

Execute no projeto Angular, não neste blog VitePress. Leia o diff de cada etapa. Componentes [standalone](https://angular.dev/guide/components/importing) podem interoperar com NgModules, permitindo migrar uma funcionalidade sem reescrever o produto inteiro.

Depois de converter um componente, confira seus imports de template. Antes de remover um módulo, verifique [providers](https://angular.dev/guide/di/dependency-injection-providers), inicialização e rotas; mover um provider pode mudar a quantidade de instâncias de um serviço. Bootstrap e configuração de [HTTP](https://www.rfc-editor.org/rfc/rfc9110.html), router e animações precisam manter o comportamento esperado.

## Critérios de conclusão

Valide o build de produção, as rotas com carregamento adiado, a injeção de dependências (DI), os formulários e as jornadas críticas. Compare o tamanho inicial e os arquivos divididos (*chunks*) por rota antes/depois; uma migração de sintaxe não garante ganho de performance. Mantenha mudanças funcionais fora da mesma etapa para facilitar diagnóstico e rollback.

Se o legado funciona e a migração não resolve uma restrição real, ela pode esperar. O plano incremental está alinhado ao estudo de [migração de legado](./decisao-migracao-legado.md), sem duplicar sua estratégia.

Referências: [AOT](https://angular.dev/tools/cli/aot-compiler) e [migração standalone](https://angular.dev/reference/migrations/standalone).
