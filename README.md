# Caio / Front-end Notes

Blog estático com VitePress, Vue 3 e TypeScript. Artigos em Markdown organizados por tema, com busca, filtro por categoria, identidade verde e temas claro/escuro.

A busca consulta título, resumo, tópico, tags e o conteúdo completo dos artigos, incluindo exemplos de código. Ignora maiúsculas e acentos e permite combinar palavras, mantendo o filtro de tópico selecionado. O índice é gerado a partir dos arquivos Markdown no build.

A listagem mostra 12 artigos por página, com navegação anterior, próxima e por número. A busca consulta todos os artigos antes de paginar, e alterar a busca ou o tópico retorna à primeira página.

A página inicial destaca o roteiro **Comece por aqui**, com primeiros passos e trilhas por tópico. Cada artigo oferece leitura anterior e próxima na sequência sugerida. A ordem editorial fica em `docs/.vitepress/theme/reading-paths.ts`; posts novos entram automaticamente ao fim da trilha correspondente, e tópicos novos ganham sua própria trilha. A listagem principal continua ordenada por data.

## Significados durante a leitura

Nos posts, palavras com sublinhado pontilhado e `?` abrem uma explicação ao clicar ou pressionar Enter/Espaço com o termo focado. Escape, um novo clique na palavra ou um clique fora fecham a explicação. O glossário é aplicado automaticamente à primeira ocorrência de até oito termos por artigo, preservando links, títulos e exemplos de código.

O vocabulário compartilhado fica em `docs/.vitepress/theme/glossary.ts`. Para dar um significado específico ao contexto ou incluir um termo novo sem alterar código, acrescente `glossary` ao cabeçalho Markdown do próprio artigo:

```yaml
glossary:
  token: 'Neste artigo, é a chave usada pelo Angular para localizar uma dependência, e não uma credencial de login.'
```

Para marcar uma ocorrência específica, use o componente diretamente no parágrafo:

```md
O <TermDefinition term="token" definition="Aqui, é a chave que identifica a dependência solicitada ao Angular." /> identifica a dependência.
```

As explicações ajudam na consulta rápida e complementam a definição no texto. Não substitua explicações importantes apenas por tooltips.

Cada artigo termina com um quiz de duas perguntas específicas, com explicações após o envio e novas tentativas sem limite. É preciso acertar todas na mesma tentativa para receber o estado **Validado** no cabeçalho e no card. O link **Fazer quiz** leva diretamente às perguntas. Refazer um quiz para revisão não remove uma aprovação já conquistada.

As aprovações ficam no `localStorage` deste navegador, isoladas pelo caminho base do site e sincronizadas na mesma aba e entre abas. Limpar os dados do navegador apaga o progresso; ele não é compartilhado entre dispositivos. Se o armazenamento estiver bloqueado, a aprovação funciona durante a visita e o quiz avisa que não foi salva. Marcações manuais da versão anterior não são convertidas em aprovações. Alterar as perguntas, as opções ou o gabarito invalida a aprovação anterior daquele artigo.

O banco editorial fica em `docs/.vitepress/theme/quiz-bank.json`, com uma entrada por nome de arquivo sem `.md`. Ao criar um post, inclua pelo menos duas perguntas com `question`, `options`, `answer` (índice da alternativa correta, começando em zero) e `explanation`. As perguntas devem avaliar conceitos ou decisões explicados no texto. O build rejeita posts sem quiz, opções duplicadas, respostas fora das opções e perguntas sem explicação. `npm run test:quiz` verifica correção, validação dos dados e versionamento das aprovações.

## Desenvolvimento

O menu principal oferece **Música**, um player independente do Pomodoro, disponível no desktop e no menu mobile. Ele reproduz o arquivo local `src/assets/audio/Just One More Drink -- Jazz Noir - Pop Studio.mp3`, em MP3 estéreo. O volume do player fica em 100%, com ajuste pelo computador ou dispositivo.

O áudio carrega apenas após clicar em **Reproduzir som**, toca em loop e retoma da posição atual após uma pausa. Fechar o painel, recolher o menu e navegar pelos artigos não interrompe a reprodução. Recarregar a página mantém o player pausado. O Vite publica o arquivo com uma URL própria, compatível com o caminho base da hospedagem. A desmontagem pausa e libera o recurso de mídia. `npm run test:audio` verifica reprodução, pausa, retomada, liberação e falhas de carregamento.

O áudio atual tem aproximadamente 8,4 MiB, abaixo do limite de tamanho por arquivo do GitHub, e é incluído no build pelo Vite.

O Pomodoro fica disponível em um painel recolhível no canto inferior, na página inicial e nos artigos. O padrão é 25 minutos de foco, 5 de pausa e uma meta de 4 ciclos por dia. Em **Ajustar tempos e meta**, é possível escolher foco de 1 a 120 minutos, pausa de 1 a 60 e meta de 1 a 20 ciclos. Ajustes só são aplicados quando não há um ciclo em andamento ou pausado; reiniciar descarta apenas o tempo parcial.

Somente um ciclo de foco concluído conta para a meta; pausas e reinícios não contam. Cada etapa seguinte começa manualmente. A contagem usa o horário de término, mantendo o prazo ao navegar, recarregar ou voltar de uma aba em segundo plano. Ao reabrir o site depois do prazo, apenas o ciclo iniciado é concluído, com crédito no dia local do término. A meta renova à meia-noite do dispositivo. O estado e os ciclos ficam no `localStorage`, isolados por caminho base e sincronizados entre abas; limpar o armazenamento apaga os dados. Sem acesso ao armazenamento, o painel informa que o progresso vale só durante a visita. `npm run test:pomodoro` verifica contagem, pausa, retomada, conclusão e virada do dia.

Use Node.js 22 ou superior:

```sh
nvm use
npm ci
npm run dev
```

`npm run typecheck` valida TypeScript e rejeita variáveis e parâmetros sem uso. `npm run build` valida e gera HTML estático em `docs/.vitepress/dist`. `npm run preview` serve o resultado localmente.

## Publicar um artigo

Crie um arquivo na pasta do tema, por exemplo `docs/posts/javascript/javascript-meu-artigo.md`:

```md
---
title: 'Título do artigo'
description: 'Resumo para a listagem e os buscadores.'
date: '2026-10-16'
tags:
  - TypeScript
  - Front-end
---

Seu conteúdo em **Markdown** começa aqui.

## Uma seção

Use listas, links e blocos de código normalmente.
```

Os metadados do exemplo são obrigatórios; `category` é opcional para artigos dentro de uma pasta temática. Mantenha a data entre aspas em `AAAA-MM-DD`. O título já é exibido pelo layout; não precisa repeti-lo no texto. O artigo entra automaticamente na listagem, ordenada por data. A pasta diretamente dentro de `docs/posts/` define automaticamente o tópico clicável e agrupa seus artigos. O campo `category` não precisa ser preenchido nesses posts.

```text
docs/posts/
├── javascript/
├── typescript/
├── angular/
├── testes/
├── performance/
├── acessibilidade/
├── arquitetura/
├── system-design/
├── navegador/
├── devops/
├── backend/
├── decisoes-tecnicas/
└── boas-praticas/
```

Use nomes únicos com o prefixo do tema. Os rewrites do VitePress removem a pasta temática da URL pública: `posts/javascript/javascript-meu-artigo.md` gera `/posts/javascript-meu-artigo.html`. Assim, os endereços e o progresso de estudo anteriores são preservados. Crie temas novos com uma pasta diretamente dentro de `posts/`, sem alterar o código. Por exemplo, `docs/posts/react/meu-artigo.md` cria o tópico **React**. Pastas vazias também aparecem no próximo build (reinicie o servidor local caso necessário); para preservá-las no Git, adicione um arquivo `.gitkeep`. No site publicado, as mudanças aparecem após o próximo build e deploy.

Links entre artigos usam os caminhos públicos reescritos, mesmo quando estão em temas diferentes: `[Outro artigo](./performance-core-web-vitals.md)`. Não inclua a pasta temática nesses links. Templates ficam em `templates/`, fora da pasta publicada; copie `templates/post.md` para começar. Depois de adicionar arquivos, se a listagem local não atualizar, reinicie `npm run dev`.

## Evitar conteúdo redundante

Antes de criar um post, procure o conceito e seus exemplos nos artigos existentes. Amplie o artigo atual quando a pergunta e a profundidade forem as mesmas. Crie outro quando houver uma decisão, exercício ou cenário diferente; nesse caso, resuma o pré-requisito e faça um link para a explicação original.

Mantenha os fundamentos da linguagem em JavaScript, modelagem e transformação de tipos em TypeScript, estratégia e automação de verificações em Testes, mecanismos da plataforma e políticas de segurança em Navegador, medição e otimização em Performance, contratos de interação em Acessibilidade, organização do código e das equipes em Arquitetura, integração e operação dos serviços em System Design, fundamentos de servidor e persistência em Backend, e entrega e operação de releases em DevOps. Casos de refatoração ficam em Boas práticas. Esses limites orientam o foco, sem impedir referências entre temas.

Ao consolidar conteúdo, preserve URLs sempre que o artigo ainda tiver uma finalidade própria. Verifique links e exemplos após remover seções; as marcações de estudo dependem das URLs.

## Convenções editoriais

- Apresente o problema antes da solução e explique siglas e termos no primeiro uso relevante.
- Use um exemplo concreto para introduzir o conceito e prefira palavras familiares no restante do texto. Preserve os nomes técnicos necessários para reconhecer APIs, ferramentas e documentação, explicando seu significado no contexto.
- Para assuntos avançados, explicite os pré-requisitos e vincule os artigos de base. O [roteiro para iniciantes](docs/posts/boas-praticas/por-onde-comecar.md) sugere uma ordem de leitura, sem tratar todos os temas como introdutórios.
- Depois de cada exemplo, explique o papel das entradas, os passos essenciais e o resultado observável. Dê espaço para experimentar uma mudança pequena antes de introduzir outra abstração.
- Vincule os termos técnicos à documentação oficial, especificação ou fonte original. Para APIs da plataforma, use MDN e os padrões correspondentes; para padrões arquiteturais, cite a proposta original quando disponível.
- Prefira links no contexto da explicação. Não transforme todas as repetições da mesma palavra em links e não modifique exemplos de código para inserir referências.
- Informe os pré-requisitos, a versão quando importar e o resultado esperado de cada exemplo. Diferencie recortes didáticos de arquivos completos e de funcionalidades realmente instaladas no blog.
- Reutilize os guias de fundamentos por links internos, em vez de publicar a mesma explicação em vários temas.
- Antes de publicar, execute `npm run build` e verifique links locais, fontes externas e as jornadas afetadas. Um build verde não executa automaticamente os exemplos dos artigos.

### Perguntas pessoais

`src/data/questions.json` contém apenas as seis perguntas pessoais de preparação para entrevistas, com respostas em inglês e traduções disponíveis em `translations.pt`. Esse arquivo não é importado pelo tema nem incluído no bundle do blog. O conteúdo técnico fica nos artigos Markdown de `docs/posts/`.

O código ativo do site fica em `docs/`. Templates, configuração TypeScript, lockfile e workflow de publicação fazem parte da estrutura atual. A saída é gerada em `docs/.vitepress/dist/`.

Em `decisoes-tecnicas/`, publique estudos de caso com premissas, alternativas, recomendação condicionada e forma de validação. Faça links para os mecanismos já explicados nos demais temas, sem repetir o tutorial. Use `templates/decision.md` para preparar uma comparação antes do registro final da escolha.

## Estrutura

A série `angular/` reúne os guias de Angular em Markdown. Comece por componentes, siga por injeção de dependências, reatividade, formulários e rotas; depois avance para performance, renderização e testes. Os exemplos destinam-se a um projeto Angular moderno com componentes standalone, não ao runtime Vue deste blog. Confirme a compatibilidade das APIs com a versão do seu aplicativo. Os fundamentos compartilhados continuam nas categorias originais, referenciados pelos artigos.

- `docs/posts/`: artigos Markdown organizados por tema.
- `docs/.vitepress/config.ts`: título, descrição, idioma e caminho base.
- `docs/.vitepress/theme/components/`: cabeçalho, listagem, card e artigo.
- `docs/.vitepress/theme/posts.data.ts`: carregamento e validação dos metadados no build.
- `docs/.vitepress/theme/types.ts`: contrato dos artigos.
- `docs/.vitepress/theme/style.css`: identidade visual e responsividade.
- `src/data/questions.json`: perguntas pessoais para entrevistas, com respostas e traduções disponíveis, fora do bundle do blog.

As perguntas mantêm `id`, `category`, `topic`, `question` e `answer`. Quando disponível, `translations.pt` contém a pergunta e a resposta em português.

## GitHub Pages

1. Envie o projeto para um repositório no GitHub na branch `main`.
2. Em **Settings → Pages → Build and deployment**, selecione **GitHub Actions**.
3. Faça um push em `main` ou execute o workflow manualmente na aba **Actions**.

O workflow faz a checagem TypeScript, gera o site e publica no Pages. O caminho base vem da configuração do Pages, incluindo repositórios em subpastas. Para outra hospedagem estática, publique `docs/.vitepress/dist`; configure `BASE_PATH=/nome-do-repositorio/` se necessário. Nenhuma publicação foi feita nesta refatoração.

## Por que VitePress?

[VitePress](https://vitepress.dev/guide/what-is-vitepress) combina Markdown e Vue, gera HTML estático e permite um [tema personalizado](https://vitepress.dev/guide/custom-theme). Aproveita a stack existente e simplifica a edição do conteúdo.

[Astro](https://docs.astro.build/en/guides/markdown-content/) também atende bem blogs, especialmente projetos novos. Aqui, VitePress mantém os componentes Vue sem adicionar outra arquitetura. A escolha considera a adequação ao projeto, não um ranking de popularidade.
