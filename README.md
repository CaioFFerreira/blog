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

A interface usa DM Sans, títulos em Space Grotesk e detalhes e exemplos de código em DM Mono, carregadas pelo Google Fonts com `display=swap` e fontes alternativas do sistema. Os filtros da biblioteca se adaptam a desktop, tablet e celular, com controles empilhados e status em duas colunas nas telas menores.

### Login com Google

O cabeçalho oferece **Entrar com Google**, mostra o nome da conta autenticada e permite **Sair** neste navegador. O cliente Supabase é carregado apenas no navegador, restaura a sessão após recarregar e acompanha mudanças de autenticação. Falhas de login aparecem junto ao botão. O retorno OAuth é processado antes de o roteador iniciar; o resultado de `auth.initialize()` é conferido para que erros do provedor não sejam confundidos com uma visita sem login. A interface mostra uma orientação e um código seguro, sem expor tokens nem a URL de callback. `npm run test:auth` verifica esse tratamento. Quizzes e Pomodoro continuam locais. A biblioteca usa a conta para armazenar PDFs e progresso de leitura no Supabase.

As credenciais públicas do projeto ficam em `docs/.vitepress/theme/supabase.ts`. A chave publicável pode integrar o bundle; nunca substitua por `service_role`, `sb_secret_…` ou pelo segredo OAuth do Google. O acesso a tabelas e arquivos deve ser protegido por políticas RLS.

No painel Supabase, habilite o provedor Google e cadastre suas credenciais OAuth. Em **Authentication → URL Configuration**, configure `https://caiofferreira.github.io/blog/` como Site URL e inclua `https://caiofferreira.github.io/blog/`, `https://caiofferreira.github.io/blog/livros.html` e `http://localhost:5173/**` nas Redirect URLs. Se o servidor local usar outra porta, inclua o endereço correspondente. No Google Cloud, a URI de redirecionamento OAuth continua sendo `https://jwnjaaxjsaserwtypphn.supabase.co/auth/v1/callback`.

O login iniciado na biblioteca retorna diretamente para `livros.html`, sem passar pela página inicial nem depender de sessionStorage. O endereço completo precisa estar autorizado no Supabase; para desenvolvimento, `http://localhost:5173/**` inclui a raiz e a biblioteca. Se o retorno não estiver autorizado, o Supabase pode usar o Site URL como destino. Usa o caminho base do VitePress: `/` em desenvolvimento e `/blog/` no Pages. Para testar o caminho publicado localmente, execute `BASE_PATH=/blog/ npm run build` e depois `BASE_PATH=/blog/ npm run preview`; autorize também a URL de preview no Supabase. Teste entrar, recarregar, navegar e sair. Se o aplicativo Google estiver em modo de teste, adicione a conta usada aos usuários de teste no Google Cloud.

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

## Biblioteca privada de PDFs

Acesse **Livros** no menu (`/livros.html`, ou `/blog/livros.html` no Pages). Sem sessão, a rota exibe apenas o convite para entrar, sem buscar o catálogo ou os arquivos. O cabeçalho e a biblioteca compartilham a sessão; o nome da conta e o botão de sair aparecem no cabeçalho. Sair ou trocar de usuário limpa imediatamente catálogo, busca, formulário e leitor; respostas antigas são descartadas. O HTML estático dessa rota contém apenas a estrutura pública da tela, nunca dados de livros.

### Configuração necessária no Supabase

1. No painel do projeto, abra **SQL Editor → New query**.
2. Para um projeto novo, execute primeiro `supabase/migrations/202610280001_private_library.sql`. Depois execute `supabase/migrations/202610280002_library_friends.sql`. Se a biblioteca já estava configurada, execute **somente o arquivo 002**. Não execute novamente o 001 depois do 002: ele restaura políticas antigas. Não exige senhas ou chaves secretas no site.
3. Entre com Google no site, abra **Livros → Adicionar livro**, o modal permite selecionar um PDF e informar título e autor opcional. Ele fecha após salvar, mantém erros de validação dentro da janela e aceita fechamento por botão, Escape ou clique no fundo. Fechar durante o envio não cancela o upload em andamento.

Cada conta tem sua própria estante e pode consultar as estantes de amigos aceitos. O envio é sempre para a própria conta. O bucket aceita PDFs de até 50 MiB em caminhos `<user-id>/<uuid>.pdf`; downloads são autorizados ao dono e a amigos aceitos somente para livros cadastrados. Amigos não recebem acesso de escrita aos arquivos ou metadados do dono. As políticas restritivas também impedem que políticas permissivas de outros buckets liberem esses arquivos. O bucket permanece privado. Sem a migração, a tela mostra falha de carregamento e não expõe dados.

Há busca por título/autor, filtros de status, contadores e listagem em grupos de 12 (até 1.000 registros consultados). Capas tipográficas são geradas em CSS; nenhum PDF é baixado ao listar os livros. Ao abrir um livro, o aplicativo baixa somente aquele PDF com autenticação e cria uma URL temporária no navegador. Fechar o leitor, sair ou trocar de conta revoga essa URL. Arquivos já baixados ou abertos em outra aba pelo usuário não podem ser recolhidos pelo site.

O leitor usa o visualizador de PDF do navegador e oferece uma alternativa para abrir em outra aba, útil em dispositivos sem suporte a PDF embutido. A página é salva manualmente em **Última página → Salvar página**, pois o visualizador nativo não fornece eventos de mudança de página. Abrir um livro ainda não iniciado muda seu status para **Lendo**; o seletor permite marcar **Lido**. As marcações são persistidas na conta. PDFs devem ser adicionados pelo formulário para criar também seu registro no catálogo.

### Amigos e progresso individual

Em **Amigos & estantes → Adicionar amigo**, um modal responsivo reúne seu código, o formulário de convite, solicitações e gerenciamento das amizades. Ele pode ser fechado pelo botão, por Escape ou pelo fundo; mantém o foco dentro da janela, devolve o foco ao botão de abertura e bloqueia a rolagem da página enquanto está aberto. Copie seu código e compartilhe manualmente com um amigo. Ele entra no próprio usuário, cola seu código e envia a solicitação. O destinatário precisa clicar em **Aceitar e compartilhar**. Até esse aceite, não há acesso aos livros. Convites cruzados não aceitam automaticamente a amizade. Não existe busca pública por usuários ou e-mails.

Após aceitar, os dois podem abrir **Ver livros** para ler todos os PDFs atuais e futuros da estante do outro. **Minha estante** retorna aos próprios livros. Cada card e o leitor identificam o dono do PDF. O filtro **Estante** permite escolher a própria conta, um amigo ou **Todas as estantes**, combinando os livros autorizados. O filtro pode ser usado junto da busca e do status de leitura. Não exige migração adicional à 002. A página deixa claro que status e contadores representam a leitura do usuário atual. **Remover** encerra o acesso para ambos; novos downloads e gravações são bloqueados imediatamente pelo banco. Ao retornar à aba, a lista de amizades é atualizada e uma estante que perdeu acesso é fechada. Conteúdo já baixado permanece sujeito à limitação descrita acima.

A migração 002 move o progresso para `library_reading_progress`, cuja chave é `(user_id, book_id)`. Ela preserva status e página dos livros existentes. As colunas antigas continuam na tabela apenas para compatibilidade da migração, mas não podem ser lidas pelo frontend, para impedir que amigos consultem o progresso do dono. Cada pessoa pode ler e gravar somente suas próprias marcações, inclusive em livros de amigos. Elas são preservadas após remover uma amizade, mas ficam inacessíveis enquanto o livro não estiver mais disponível.

As funções RPC validam o usuário autenticado, os participantes e o destinatário do convite; usam `search_path` vazio e não expõem e-mails. Tabelas de códigos e amizades não têm acesso direto pelo cliente. Amizades são uma alteração nas permissões de leitura; faça o deploy do novo frontend junto da migração 002, pois versões antigas consultam as colunas de progresso antigas e deixarão de carregar o catálogo.

`npm run test:sharing` executa as duas migrações em PostgreSQL local via PGlite e testa isolamento entre três contas, aceite exclusivo pelo destinatário, PDFs privados, progresso individual, preservação de dados e revogação, incluindo políticas Storage permissivas de outros buckets. PGlite é uma dependência apenas de desenvolvimento e não integra o bundle. Para validar o projeto real, repita os fluxos com duas contas Google no Supabase, incluindo acesso antes/depois do aceite e da remoção. OAuth e a execução das migrações no projeto hospedado precisam ser validados pelo proprietário.

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
