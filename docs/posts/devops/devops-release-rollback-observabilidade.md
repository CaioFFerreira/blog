---
title: "Publicação e rollback: conferir uma versão e preparar a volta"
description: "Verifique o site no endereço real, identifique a versão publicada e planeje como restaurar uma entrega compatível."
date: '2026-10-16'
category: 'DevOps'
tags:
  - Deploy
  - Rollback
  - Observabilidade
  - Releases
---

**Release** é uma versão preparada para uso; **deploy** é sua colocação em um ambiente; **rollback** é voltar a uma versão anterior quando isso é viável. Pense numa publicação em que a página inicial abre, mas um link interno falha. Verificar a entrega exige percorrer o caminho que a pessoa realmente vai usar.

Um job verde pode significar apenas que o comando terminou com código zero. A entrega só está comprovada quando a versão correta atende o fluxo esperado pelo endereço público.

Os conceitos de [SLI](https://sre.google/sre-book/service-level-objectives/), SLO e sinais de observabilidade estão no [guia de disponibilidade do portal](./system-design-disponibilidade-observabilidade.md). Aqui, vamos aplicá-los à operação de uma release.

## Registre o que foi publicado

Associe commit, pipeline, artefato ou digest, configuração pública, ambiente e horário. Inclua um identificador público de versão no diagnóstico da aplicação, sem credenciais ou dados pessoais.

Um erro de carregamento deve poder ser relacionado a uma release. Em source maps e ferramentas de erro, preserve a correspondência com o bundle exato; mapas de outra compilação podem apontar linhas erradas.

## Verificação mínima no destino real

Confirme a página inicial e uma rota interna acessada diretamente. Verifique um recurso estático, um caminho inexistente e as ações críticas do produto. Quando houver login, teste também sessão expirada e falha de uma API opcional num ambiente autorizado.

Um endpoint de health do servidor pode confirmar que o processo responde. Um readiness check pode indicar se deve receber tráfego. Nenhum dos dois comprova sozinho que o navegador inicializa e a jornada funciona; uma verificação sintética pode cobrir outra parte desse risco.

Use uma conta de teste e operações não destrutivas ou sandbox para os fluxos adequados. Uma verificação breve dos fluxos essenciais em produção, chamada *smoke test*, não deve gerar pagamentos reais sem um procedimento explícito.

## Um roteiro de incidente por camada

```text
Usuário vê erro
    │
    ├── Qual release e qual jornada?
    ├── DNS e HTTPS chegam ao destino esperado?
    ├── CDN entrega HTML e assets compatíveis?
    ├── Servidor responde com status e conteúdo corretos?
    ├── Navegador inicializa sem erro de módulo ou política?
    └── APIs e dependências permitem concluir a ação?
```

Compare uma requisição pública com a origem autorizada para identificar divergência de cache ou roteamento. No navegador, um script que recebe HTML pode indicar fallback incorreto, não necessariamente um bug no componente.

Examine mudanças recentes como hipóteses, não como prova automática de culpa. Registre evidência antes de reiniciar processos ou invalidar tudo.

## Prepare rollback antes de precisar dele

Mantenha artefatos anteriores e um procedimento que restaure uma versão conhecida. Reconstruir um commit antigo no meio de um incidente pode produzir dependências, configurações ou resultado diferente.

Restaure também a configuração compatível quando necessário. Um front-end anterior pode não funcionar com uma API alterada de forma incompatível. Uma reversão de arquivos não desfaz migrações de dados nem pagamentos já processados.

Documente quem decide, como interromper uma publicação em curso e como verificar a recuperação. Um rollback sem conferência pública é apenas outra tentativa de deploy.

## Publicação gradual e feature flags

Quando a plataforma permite, reduzir a parcela inicial de tráfego pode limitar impacto. Defina sinais e critérios de parada. Porcentagens sem identificação de versão e observação da jornada não ajudam a decidir.

Uma feature flag pode desacoplar entrega de código e ativação de funcionalidade. Ela não é autorização: código e dados enviados ao cliente continuam expostos. Flags temporárias precisam de dono e retirada para não criar combinações permanentes difíceis de testar.

## Cuide de abas abertas e operações pendentes

Uma nova release pode coexistir com clientes antigos. Garanta a janela de compatibilidade acordada e uma recuperação apropriada para chunks ausentes. Evite forçar reload enquanto existe uma operação com resultado desconhecido.

O [caso de retry e pagamentos](./system-design-erros-retry-pagamentos.md) explica a reconciliação. Na operação do deploy, o importante é não confundir “precisa atualizar a página” com “pode reenviar a transação”.

## Um ensaio de operação

Em staging, publique uma versão identificável, provoque uma falha controlada e execute a volta. Confira tempo para localizar versão, evidências disponíveis e funcionamento da release restaurada.

Depois ajuste o **runbook**, o roteiro operacional usado pela equipe, com o que realmente funcionou. Observabilidade útil reduz incerteza e orienta uma ação; dashboards sem relação com os fluxos críticos não encerram essa preparação.
