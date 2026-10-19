---
title: 'Chrome DevTools: investigar Performance e network waterfall'
description: 'Reproduza um problema, leia a linha do tempo e conecte dependências de rede com trabalho no thread principal antes de alterar código.'
date: '2026-10-16'
category: 'Performance'
tags:
  - Chrome Performance Profiler
  - Network waterfall
  - Diagnóstico
---

As **DevTools** são as ferramentas de desenvolvimento do navegador. O painel **Network** mostra requisições e seus tempos; o painel **Performance** registra trabalho e atualizações da página. Um **waterfall**, ou gráfico em cascata, mostra quando cada requisição começou e terminou. Um **trace** é uma gravação das atividades ao longo do tempo para investigar o que ocorreu. Vamos usá-los para transformar a impressão de lentidão numa hipótese que possa ser conferida.

“A página está lenta” ainda não identifica um problema técnico. Uma investigação útil começa com uma ação reproduzível: abrir uma rota, digitar na busca ou expandir uma lista.

Vamos usar um cenário hipotético: abrir um catálogo e selecionar um filtro. Os nomes dos controles do DevTools podem variar conforme a versão e o idioma do Chrome.

## Prepare uma comparação confiável

Use um build de produção ou preview equivalente ao que será publicado. O modo de desenvolvimento pode incluir verificações, transformações e ferramentas ausentes em produção.

Anote rota, versão, dispositivo, configuração de rede e CPU. Compare cache frio e aquecido separadamente. Extensões, processos em segundo plano e aquecimento do dispositivo interferem nos resultados.

Execute o mesmo fluxo mais de uma vez e compare a distribuição ou a mediana das execuções de laboratório. Uma execução isolada não prova uma melhoria, e essa mediana não substitui o percentil de campo.

## Network: leia dependências, não só o tamanho dos arquivos

No painel **[Network](https://developer.chrome.com/docs/devtools/network)**, limpe o histórico e recarregue. Use a opção de desativar cache para o cenário frio, lembrando que ela atua enquanto o DevTools está aberto; [service workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) podem exigir investigação adicional.

O waterfall mostra quando cada requisição começa e quanto tempo ocupa. Para um recurso importante, examine **Timing**, **Initiator**, prioridade e tamanho transferido.

| Observação | Hipótese a verificar |
| --- | --- |
| Imagem principal começa muito depois do documento | Descoberta depende de CSS, JavaScript ou dados |
| Espera longa pelo primeiro byte | Latência, conexão ou processamento no servidor; não conclua apenas “backend lento” |
| Download longo | Muitos bytes ou baixa vazão |
| Requisições em sequência | Dependência real ou sequência evitável |
| Mesmo recurso solicitado repetidamente | Chave variável, política de cache ou inicialização repetida |

**Exemplo:** documento → bundle → API → imagem. Se a imagem só é conhecida no fim dessa cadeia, ela não compete desde o início. Priorizar o download sem mudar sua descoberta pode ser insuficiente.

Não busque paralelizar tudo. Muitas requisições não críticas podem disputar banda com o recurso principal. O painel ajuda a localizar a cadeia; a decisão depende da prioridade do conteúdo.

## Performance: grave o comportamento que está ruim

Faça uma gravação de carregamento para investigar a abertura. Para uma interação, inicie a gravação, execute o filtro uma vez e pare. Gravações curtas facilitam ligar causa e efeito.

Localize a interação e aproxime o intervalo. No fluxo principal de execução, procure tarefas extensas e a composição do trabalho: scripting, cálculo de estilos, layout e pintura.

Uma flame chart mostra chamadas ao longo do tempo. Em **Bottom-up**, procure funções com alto tempo próprio; em **Call tree**, veja o caminho que levou a elas. Tempo total inclui descendentes; tempo próprio se refere ao trabalho da própria função. Confundir os dois pode levar a otimizar o chamador errado.

Use source maps para relacionar o bundle ao código de origem. A instrumentação também tem custo: compare gravações com configurações equivalentes e evite tratar cada duração como uma constante universal.

## Junte a evidência de rede e CPU

No nosso catálogo, há pelo menos duas hipóteses diferentes:

- A resposta do filtro demora porque a requisição depende de outra que poderia começar antes.
- A resposta já chegou, mas transformar os dados e atualizar milhares de elementos bloqueia a interface.

Na primeira, reduzir o número de componentes pode não mudar o gargalo. Na segunda, comprimir JSON pode não resolver o trabalho de renderização. Siga a linha do tempo até o atraso que a pessoa percebe.

## Registre a conclusão de forma revisável

Um registro útil contém cenário, evidência, hipótese, alteração e comparação. Por exemplo:

> Ao abrir o filtro no catálogo de teste, o trace mostra uma atualização de lista dominando o fluxo principal de execução. Vamos limitar a quantidade de elementos montados e repetir o mesmo fluxo.

Esse texto propõe um experimento; não promete uma porcentagem de ganho sem medição. Depois da mudança, confirme também que teclado, seleção e resultados continuam corretos.

## Checklist de saída

- A ação lenta foi reproduzida com passos claros?
- Rede e execução foram separadas na hipótese?
- O teste anterior e o posterior usam as mesmas condições?
- O benefício aparece em várias execuções e não apenas no melhor resultado?
- A melhoria foi acompanhada em produção quando havia dados de campo?

## Referências e continuidade

- [Analisar performance de execução — Chrome](https://developer.chrome.com/docs/devtools/performance)
- [Referência do painel Network — Chrome](https://developer.chrome.com/docs/devtools/network/reference)
- [Bundle analysis e divisão de código](./performance-bundle-code-splitting-tree-shaking.md)
- [Virtualização e renderização](./performance-virtualizacao-renderizacao.md)
