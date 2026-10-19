---
title: 'Design Systems e composição: compartilhar interface sem criar um componente universal'
description: 'Defina níveis de reutilização, contratos de componentes e governança para manter consistência sem acoplar a UI às regras de cada domínio.'
date: '2026-10-16'
category: 'Arquitetura Front-end'
tags:
  - Design Systems
  - Component composition
  - Acessibilidade
---

Imagine três equipes criando formulários para o mesmo produto. Sem acordos, cada uma pode usar botões, mensagens e interações diferentes. Um Design System oferece referências compartilhadas para esse trabalho. **Composição** significa montar algo maior com peças menores, como construir um formulário usando campos e botões, sem obrigar uma única peça a prever todos os casos.

Um [Design System](https://design-system.service.gov.uk/) combina decisões de design, componentes, padrões, documentação e manutenção. Publicar um pacote de botões sem processo de evolução não resolve sozinho a consistência de um produto grande.

## Separe os níveis de reutilização

Tokens representam decisões como cores, espaçamento e tipografia. Primitivos implementam comportamentos e elementos básicos. Componentes compostos organizam esses primitivos em padrões de interface. A funcionalidade aplica as regras de negócio.

Um botão pode conhecer tamanho, variante e estado desabilitado. Não deve consultar se o cliente tem uma dívida. Um `PaymentSummary` pode conhecer pagamentos e viver na funcionalidade; não precisa entrar no Design System porque aparece em duas telas do mesmo domínio.

## Composição evita uma explosão de flags

Um componente como `UniversalCard` tende a acumular propriedades `showActions`, `isPayment`, `isCustomer`, `useCompactFooter` e exceções. Várias combinações nunca são válidas, mas a API permite todas.

Para uma moldura estável com conteúdo variável, [slots](https://vuejs.org/guide/components/slots.html) (regiões que recebem conteúdo do consumidor) podem manter o contrato menor. Exemplo de `Panel.vue`:

```vue
<script setup lang="ts">
defineProps<{ title: string }>()
</script>

<template>
  <section class="panel">
    <header class="panel-header">
      <h2>{{ title }}</h2>
      <div v-if="$slots.actions" class="panel-actions">
        <slot name="actions" />
      </div>
    </header>
    <slot />
  </section>
</template>
```

Um consumidor, em outro arquivo:

```vue
<script setup lang="ts">
import Panel from './Panel.vue'

const emit = defineEmits<{ edit: [] }>()
</script>

<template>
  <Panel title="Dados do cliente">
    <template #actions>
      <button type="button" @click="emit('edit')">Editar cliente</button>
    </template>
    <p>Confira os dados antes de continuar.</p>
  </Panel>
</template>
```

O consumidor decide a ação, enquanto o painel define a estrutura. Os exemplos não incluem o CSS. O nível `h2` pressupõe um contexto adequado de página; se o componente for usado em outros níveis, defina uma política de títulos em vez de ignorar a hierarquia. A [documentação de slots do Vue](https://vuejs.org/guide/components/slots.html) apresenta o mecanismo de composição.

## Compor também exige limites

Um modal não pode oferecer qualquer estrutura arbitrária sem preservar nome, foco e fechamento. Um campo precisa de relações estáveis entre rótulo, ajuda e erro. Dê liberdade onde existe variação legítima e mantenha centralizados os contratos críticos de interação.

Teste as combinações documentadas. Slots não tornam uma API automaticamente simples; é possível esconder dependências demais dentro de conteúdo arbitrário.

## Acessibilidade pertence ao contrato

Defina quais garantias pertencem ao componente e quais dependem do consumidor. Um campo pode criar e associar IDs de ajuda e erro; quem o usa ainda precisa fornecer um rótulo que faça sentido. Um painel pode preservar a estrutura, mas o consumidor precisa escolher um título coerente com a página.

Documente essas obrigações junto da API e teste uma integração real, além do componente isolado. Se cada consumidor precisa reconstruir a mesma relação manualmente, considere incorporá-la ao contrato. Os exemplos de implementação ficam nos guias de [nomes acessíveis](./acessibilidade-html-semantico-aria-nomes.md), [formulários](./acessibilidade-formularios-erros-aria-live.md) e [modais](./acessibilidade-modais-dialog.md).

## Quando um padrão merece entrar no sistema?

Busque evidência de uso, necessidade compartilhada e capacidade de manutenção. Os [critérios de contribuição do GOV.UK Design System](https://design-system.service.gov.uk/community/contribution-criteria/) exemplificam uma avaliação que considera utilidade, consistência e testes, em vez de promover qualquer duplicação a padrão.

Para nossa equipe hipotética, a política pode exigir dois casos reais, documentação, revisão de acessibilidade e um responsável por manutenção. Isso é uma proposta de governança, não uma regra universal de “duas ocorrências”. Uma duplicação temporária pode ser mais barata que uma abstração equivocada.

## Evolua a API sem bloquear os produtos

Defina compatibilidade, depreciação e caminho de migração. Mudar a aparência de todos os botões em um pacote compartilhado pode afetar layout, contraste e testes de várias aplicações. Sem versionamento ou coordenação, “reuso” vira um ponto de falha coletivo.

Registre o que é público e o que é interno. Em um monorepo, uma mudança atômica pode atualizar consumidores juntos, mas isso não dispensa revisão nem validação de todos os fluxos afetados.

## Continue estudando

- [HTML, ARIA e nomes acessíveis](./acessibilidade-html-semantico-aria-nomes.md)
- [Monorepos e regras de dependência](./arquitetura-monorepos.md)
- [SOLID sem excesso de camadas](./arquitetura-dependency-inversion-solid.md)
