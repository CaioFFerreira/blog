---
title: 'Publicação em AWS ou Azure: conectar origem, CDN, domínio e HTTPS'
description: 'Escolha um destino adequado ao build, entenda o papel de DNS e certificados e publique uma versão sem confundir serviços de cloud com requisitos obrigatórios.'
date: '2026-10-16'
category: 'DevOps'
tags:
  - AWS
  - Azure
  - DNS
  - CDN
---

Para abrir um site, o navegador precisa encontrar seu endereço de rede e buscar o conteúdo. **DNS** relaciona nomes, como `exemplo.com`, a informações usadas nessa localização. Uma **CDN** distribui conteúdo por servidores para aproximá-lo dos visitantes. A **origem** é o servidor ou serviço que fornece o conteúdo por trás dessa distribuição.

O primeiro passo é reconhecer a saída da aplicação. Um site estático precisa servir arquivos; um servidor SSR precisa executar código por requisição; um [BFF](https://learn.microsoft.com/en-us/azure/architecture/patterns/backends-for-frontends) precisa de execução e acesso a dependências. Essas cargas não usam automaticamente a mesma hospedagem.

Este blog gera arquivos estáticos e já tem uma opção de GitHub Pages. A série descreve alternativas; nenhuma conta cloud, distribuição ou domínio foi configurado aqui.

## Um caminho estático na AWS

Um desenho possível combina um bucket S3 como origem de objetos e [CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html) como distribuição. Com uma origem S3 apropriada, Origin Access Control pode restringir leitura ao caminho autorizado pela distribuição.

O endpoint de website do S3 tem propriedades diferentes de uma origem de bucket normal: não copie a configuração de OAC para ele presumindo equivalência. A [documentação de origem privada do CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html) explica os requisitos.

Ainda é necessário definir resolução de URLs para páginas, HTTPS, cabeçalhos, cache e upload da versão. Um bucket com todos os arquivos certos não prova que `/posts/artigo.html` está acessível no domínio final.

## Um caminho no Azure

[Azure Static Web Apps](https://learn.microsoft.com/en-us/azure/static-web-apps/overview) oferece uma opção gerenciada para aplicações web estáticas, com recursos e limites conforme a configuração e o plano. Consulte sua [visão geral oficial](https://learn.microsoft.com/en-us/azure/static-web-apps/overview).

Para outras topologias de borda, Azure Front Door pode participar de roteamento global e entrega. Ele não deve ser acrescentado apenas para espelhar um diagrama de outra cloud; confira origem, necessidade e custo na [documentação de Front Door](https://learn.microsoft.com/en-us/azure/frontdoor/front-door-overview).

Aplicações com execução no servidor precisam de um destino compatível, gerenciado ou em containers. Escolha pelo ambiente de execução, conexões, região, escala, limites e operação. Um nome de serviço não substitui verificar esses contratos.

## DNS aponta; não publica seu código

No [caminho da URL até a página](./navegador-url-renderizacao.md), [DNS](https://developer.mozilla.org/en-US/docs/Glossary/DNS) é a resolução de nome. No deploy, precisamos configurar registros compatíveis com o destino e comprovar a posse do domínio quando exigido.

Um CNAME relaciona um nome a outro; A e AAAA apontam endereços. O tratamento do domínio raiz depende do serviço DNS e das opções suportadas. O TTL (*Time to Live*) indica por quanto tempo uma resposta DNS pode ser mantida em cache. Por isso, clientes podem observar a mudança em momentos diferentes.

DNS não escolhe sozinho o certificado nem o host que a origem serve. Configure HTTPS para o domínio, os nomes aceitos e a conexão da borda à origem. Um site funcionar no endereço do provedor não comprova que o domínio próprio está correto.

## Publique recursos estáticos antes do HTML que os referencia

Uma sequência possível para estáticos é disponibilizar recursos estáticos versionados, conferir sua presença e só então promover o HTML correspondente. Preserve uma janela de recursos estáticos antigos para abas já abertas.

O controle exato de atomicidade depende do destino. Não declare um upload de pasta como atômico se clientes podem enxergar uma mistura de versões durante a transferência. Diretórios de release e troca de referência podem ajudar quando suportados.

As diretivas [HTTP](https://www.rfc-editor.org/rfc/rfc9110.html) e a identidade dos dados estão no [guia de cache](./performance-cache-memoization.md). Aqui, verifique se a CDN entrega os cabeçalhos esperados e se as regras da borda respeitam a origem. Uma invalidação ampla não é necessária em toda release quando recursos estáticos têm URLs novas, e não substitui uma política correta para o HTML.

## Valide do endereço que a pessoa usa

Confira certificado, redirecionamentos, caminho base, rota interna aberta diretamente e 404 verdadeiro. Compare HTML e recursos estáticos por versão e inspecione status e cabeçalhos públicos, não apenas a resposta da origem.

Para uma API autenticada, revise também [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS), [cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies) e cache antes de trocar domínio. Um deploy que muda origem pode alterar essas políticas mesmo quando o JavaScript não mudou.

## Custos e vantagens e custos

Inclua armazenamento, requisições, transferência, execução, logs e manutenção na comparação. Não escolha SSR ou containers para um site estático sem uma necessidade que justifique a operação extra. Preços e limites mudam; confirme no provedor antes de dimensionar uma solução real.

## Continue estudando

- [CORS e origens](./navegador-same-origin-cors.md)
- [Verificação de release e rollback](./devops-release-rollback-observabilidade.md)
