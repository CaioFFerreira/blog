---
title: 'Por onde começar: um caminho para estudar desenvolvimento web'
description: 'Entenda o vocabulário básico, escolha uma ordem de leitura e aprenda a experimentar os exemplos sem precisar dominar todos os assuntos de uma vez.'
date: '2026-10-19'
tags:
  - Iniciantes
  - Estudos
  - Desenvolvimento web
---

Você abre um artigo para entender uma dúvida e encontra outras dez palavras desconhecidas. Isso é comum no começo: desenvolvimento web junta linguagem, navegador, interface, servidor e ferramentas. Este roteiro ajuda a separar essas peças e escolher o próximo passo.

Não é necessário ler o blog inteiro em sequência. Escolha uma tarefa pequena, estude a base que ela exige e experimente antes de avançar.

## Primeiro, entenda as peças de uma página

- **HTML** descreve a estrutura e o significado do conteúdo: título, parágrafo, link, botão e campo de formulário.
- **CSS** define a apresentação, como cores, espaçamentos e disposição dos elementos.
- **JavaScript** executa a lógica, como reagir ao clique e atualizar um resultado.
- **Navegador** é o programa que interpreta esses recursos e permite usar a página.
- **Front-end** é a parte da aplicação com a qual a pessoa interage.
- **Backend** é a parte que executa no servidor e pode aplicar regras, guardar dados e integrar outros serviços.
- **API** é uma interface de comunicação entre partes do sistema. Numa aplicação web, ela frequentemente recebe pedidos pela rede e devolve respostas.

Essas peças colaboram. Um formulário pode ser descrito em HTML, apresentado com CSS e enviado por JavaScript a uma API. O servidor confere os dados e responde; a interface precisa explicar o resultado à pessoa.

Se HTML, CSS e variáveis ainda forem novos para você, o [guia de aprendizagem da MDN](https://developer.mozilla.org/pt-BR/docs/Learn_web_development) oferece uma base mais gradual. Os artigos daqui aprofundam problemas específicos e não substituem um curso inicial completo.

## Uma ordem de leitura possível

| Etapa | O que praticar | Primeiro artigo da trilha |
| --- | --- | --- |
| 1. JavaScript | Trabalhar com dados, funções, eventos e operações assíncronas | [Valores, cópias e imutabilidade](./javascript-valores-imutabilidade-memoria.md) |
| 2. Acessibilidade | Criar controles compreensíveis e concluir tarefas pelo teclado | [HTML semântico](./acessibilidade-html-semantico-aria-nomes.md) |
| 3. TypeScript | Descrever dados e verificar contratos | [Inferência, interfaces e tipos](./typescript-inferencia-interfaces-types.md) |
| 4. Angular | Construir componentes, formulários, estado e integrações | [Componentes e comunicação](./angular-componentes-comunicacao.md) |
| 5. Navegador | Entender carregamento, comunicação, armazenamento e segurança | [Da URL à renderização](./navegador-url-renderizacao.md) |
| 6. Boas práticas | Separar responsabilidades numa mudança pequena | [Menos responsabilidades, mais clareza](./menos-responsabilidades-mais-clareza.md) |
| 7. Testes | Escolher comportamentos importantes e verificar resultados | [Estratégia de testes por risco](./testes-estrategia-risco.md) |
| 8. Backend | Acompanhar requisições, banco e trabalho em segundo plano | [O caminho de uma requisição](./backend-requisicao-rest-gateway.md) |
| 9. Performance | Investigar antes de otimizar | [Diagnóstico com as ferramentas do navegador](./performance-devtools-network-waterfall.md) |
| 10. Arquitetura | Organizar funcionalidades e suas dependências | [Responsabilidades e fronteiras](./arquitetura-features-domain-boundaries.md) |
| 11. System Design | Planejar como as partes colaboram num sistema | [O desenho de um portal](./system-design-portal-escala.md) |
| 12. DevOps | Acompanhar uma versão do Git à publicação | [Git e colaboração](./devops-git-colaboracao.md) |
| 13. Decisões técnicas | Comparar alternativas conforme o contexto | [Escopo, custo e crescimento](./decisao-escopo-custo-crescimento.md) |

Esta é a sequência mostrada nas [trilhas da página inicial](/#trilhas). No fim de cada artigo, **Próxima leitura** leva à etapa seguinte da sequência: primeiro os outros artigos do tópico, depois a próxima trilha. Você pode escolher outro tópico a qualquer momento; Angular, por exemplo, só precisa entrar no seu caminho se você quiser estudar esse framework.

Você pode voltar a uma etapa enquanto estuda outra. Acessibilidade, por exemplo, faz parte da interação desde o primeiro botão.

## Como ler um exemplo de código

Antes de executar, procure quatro informações: em qual ambiente o código entra, o que ele recebe, o que faz e qual resultado você deve observar.

Este exemplo é JavaScript independente. Pode ser executado no console das ferramentas de desenvolvimento do navegador:

```js
function calcularTotal(preco, quantidade) {
  return preco * quantidade
}

console.log(calcularTotal(10, 3))
```

`function` declara a função. `preco` e `quantidade` são parâmetros: nomes para as entradas recebidas. `return` devolve o resultado da multiplicação, representada por `*`. `console.log` apresenta o resultado no console. A saída esperada é `30`.

Troque a quantidade de `3` para `2` e tente prever o resultado antes de executar. Depois experimente uma entrada inadequada e observe o comportamento. O exemplo não valida as entradas nem implementa uma regra completa de preço; serve para acompanhar a chamada de uma função.

Nos demais artigos, um **trecho** pode depender de declarações anteriores ou de uma aplicação preparada. Código de Angular precisa de um projeto Angular; TypeScript pode precisar de compilação; comandos SQL precisam do banco indicado. Não cole todos esses exemplos no console do navegador esperando o mesmo resultado.

## Quando avançar para outros assuntos?

Se você já consegue criar uma interação pequena, escolha um caminho conforme o problema que quer resolver:

- **TypeScript:** comece por [inferência, interfaces e tipos](./typescript-inferencia-interfaces-types.md); depois avance para unions, generics e transformações de tipos.
- **Angular:** comece por [componentes e comunicação](./angular-componentes-comunicacao.md), siga para injeção de dependências, formulários e rotas. Signals e RxJS ficam mais concretos quando você já reconhece os dados e eventos de uma tela.
- **Performance:** comece pelo [diagnóstico com as ferramentas do navegador](./performance-devtools-network-waterfall.md). Observe um problema antes de escolher uma otimização.
- **Publicação:** comece por [Git e colaboração](./devops-git-colaboracao.md) e acompanhe o caminho até o [pipeline de entrega](./devops-ci-cd-actions-gitlab.md).
- **Arquitetura e sistemas:** depois de acompanhar uma requisição completa, estude [estado e seus responsáveis](./arquitetura-state-management.md) e o [portal hipotético](./system-design-portal-escala.md). As escolhas ficam mais claras quando você conhece o problema que elas procuram resolver.

## Transforme a leitura em uma tarefa pequena

Por exemplo: crie uma lista de três artigos com um campo de busca. Primeiro filtre os dados com uma função. Depois ligue a função ao campo, teste pelo teclado e mostre uma mensagem quando não houver resultados.

Ao terminar, explique com suas palavras: onde estão os dados, qual ação os consulta ou altera e como você sabe que o resultado está correto. Se uma dessas respostas estiver confusa, volte ao trecho correspondente e faça uma experiência menor. O próximo assunto pode esperar até essa relação ficar clara.
