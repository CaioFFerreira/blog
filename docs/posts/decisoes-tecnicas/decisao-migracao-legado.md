---
title: 'Migrar legado sem parar produção: fatias, compatibilidade e retirada'
description: 'Escolha um primeiro recorte, mantenha convivência com dono claro dos dados e defina validação e retorno antes de deslocar tráfego.'
date: '2026-10-16'
category: 'Decisões técnicas'
tags:
  - Legado
  - Migração
  - Compatibilidade
  - Risco
---

**Legado** é um sistema existente que precisamos manter ou evoluir; ele não é necessariamente ruim só por ser antigo. **Migração** é trocar parte dessa solução preservando os comportamentos necessários. Pense em renovar uma área de documentos enquanto login e pagamentos continuam funcionando. O desafio é planejar essa convivência e saber quando encerrar o caminho antigo.

“Reescrever com uma stack moderna” descreve uma atividade, não um resultado de negócio. Uma migração precisa preservar o produto enquanto substitui partes e reduz o problema que motivou o investimento.

Este caso complementa o [guia de evolução arquitetural](./arquitetura-evolucao-overengineering.md). O foco é planejar uma convivência verificável, não repetir a estrutura de pastas de uma nova aplicação.

## O cenário e o recorte inicial

Imagine um portal antigo que continua recebendo cadastros e pagamentos. A equipe quer renovar a área de documentos porque seu ciclo de mudança é lento. Login e pagamentos permanecem no sistema anterior na primeira etapa.

Escolha uma rota ou capacidade com limite de dados e responsabilidade claros. Identifique links de entrada, sessão, APIs, analytics e comportamentos de retorno. Trocar apenas o template sem mapear essas dependências pode quebrar o fluxo fora da tela migrada.

O padrão [Strangler Fig](https://martinfowler.com/bliki/StranglerFigApplication.html) descreve substituição progressiva. Ele ajuda a estruturar a migração, mas não fornece automaticamente compatibilidade ou um plano de dados.

## Defina quem é a fonte de verdade durante a convivência

Se documentos continuam pertencendo ao backend antigo, a nova interface usa um contrato controlado para acessá-los. Não copie a persistência para outro sistema apenas para evitar integrar uma API existente.

Quando mudar a escrita for necessário, estabeleça em qual ponto o novo caminho se torna autoritativo e como os clientes antigos são atendidos. Escrita dupla pode falhar parcialmente e gerar divergência; não a trate como uma etapa trivial da migração.

Um adaptador pode traduzir o contrato legado e isolar nomes e formatos históricos. Ele precisa de testes de borda e de um dono, pois uma tradução silenciosamente incorreta pode preservar a aparência e mudar o significado dos dados.

## Uma sequência de entrega possível

```text
Mapear contratos e baseline
           ↓
Introduzir rota e adaptação de dados
           ↓
Verificar o fluxo com contas de teste
           ↓
Liberar para grupo controlado, quando a plataforma permitir
           ↓
Comparar resultados e sinais de erro
           ↓
Ampliar ou retornar conforme o critério
           ↓
Retirar caminho antigo e dependências sem uso
```

Essas etapas são propostas para o cenário. Uma liberação gradual exige mecanismo de roteamento, observação e critérios reais. Uma [feature flag](https://martinfowler.com/articles/feature-toggles.html) permite habilitar ou desabilitar um caminho de código, mas não substitui controle de acesso ao recurso.

## Paridade precisa de exemplos de comportamento

Registre os casos que devem permanecer: documento de outra organização negado, arquivo expirado tratado, sessão renovada conforme o contrato e navegação de volta preservada.

Não copie automaticamente todos os comportamentos do legado, inclusive defeitos. Separe compatibilidade necessária de mudanças de produto aprovadas. Um desvio intencional precisa de decisão, não de um teste atualizado para ficar verde.

Em leituras sem efeito, comparação paralela de respostas pode ajudar se custo, autorização e privacidade permitirem. Nunca espelhe uma operação de pagamento real para o sistema novo só para comparar resultados.

## Retorno é mais que desligar uma flag

Se a nova implementação só leu dados, o retorno pode ser relativamente simples. Se criou dados em um formato que a antiga não entende, desligar a rota talvez não recupere a experiência.

Defina compatibilidade de leitura e escrita e o ponto após o qual retornar exige migração ou intervenção. O [guia de releases e rollback](./devops-release-rollback-observabilidade.md) concentra o procedimento operacional; a decisão de compatibilidade precisa existir antes dele.

## A migração termina quando o caminho anterior deixa de custar

Liste rotas, adapters, flags, jobs e dependências a remover. Confirme que o tráfego e os consumidores suportados foram deslocados, considerando a cobertura da telemetria, antes de eliminar a forma antiga.

Sem plano de retirada, o projeto pode acabar mantendo dois sistemas indefinidamente. A [série Patterns of Legacy Displacement](https://martinfowler.com/articles/patterns-legacy-displacement/) oferece referências para discutir esse tipo de evolução.

## Como decidir entre migrar e corrigir o que existe?

Compare uma melhoria localizada no legado com o recorte novo: esforço, risco, tempo de feedback e custo da convivência. A resposta pode ser modernizar apenas a área que bloqueia mudanças, e não reescrever o portal inteiro.

Registre o resultado esperado e revise após a primeira fatia. Se a convivência custa mais que o benefício observado, ajuste a estratégia antes de ampliar o investimento.
