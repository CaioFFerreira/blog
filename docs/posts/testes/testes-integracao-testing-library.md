---
title: 'Testing Library: verificar interação, envio e feedback de um formulário'
description: 'Integre componentes reais e encontre controles por seu papel e nome, testando o resultado da ação sem depender de classes, estado privado ou snapshots gigantes.'
date: '2026-10-16'
category: 'Testes'
tags:
  - Integration
  - Testing Library
  - Vue
---

**UI** significa *user interface*, ou interface com o usuário. Num teste de integração de UI, montamos peças da interface e verificamos sua colaboração. Por exemplo: digitar, salvar e ver uma confirmação. A **Testing Library** ajuda a encontrar elementos e interagir com eles de formas próximas ao uso da página; o laboratório abaixo informa os arquivos e dependências necessários.

Um teste de integração de UI pode montar o componente e suas partes reais, controlar a dependência externa e executar a ação da pessoa. Ele verifica se a colaboração funciona, sem precisar iniciar toda a plataforma.

A [Testing Library](https://testing-library.com/docs/guiding-principles/) incentiva testar pela forma como a interface é usada. Isso não elimina a necessidade de compreender a fronteira: um [DOM](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model) simulado não reproduz layout e todos os comportamentos de um navegador.

## O laboratório e seus pré-requisitos

Os próximos arquivos pressupõem uma aplicação de teste com Vue 3, [Vitest](https://vitest.dev/guide/), plugin Vue, ambiente [jsdom](https://github.com/jsdom/jsdom#readme), `@testing-library/vue` e `@testing-library/user-event` compatíveis. Não são dependências já adicionadas ao blog.

Exemplo de `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: { environment: 'jsdom' },
})
```

## Um componente com resultado observável

Em `ProfileNameForm.vue`:

```vue
<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{ save: (name: string) => Promise<void> }>()
const name = ref('')
const saving = ref(false)
const message = ref('')
const error = ref('')

async function submit() {
  if (saving.value) return
  message.value = ''
  error.value = ''
  const value = name.value.trim()

  if (!value) {
    error.value = 'Informe seu nome.'
    return
  }

  saving.value = true
  try {
    await props.save(value)
    message.value = 'Nome salvo.'
  } catch {
    error.value = 'Não foi possível salvar. Tente novamente.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form @submit.prevent="submit">
    <label for="profile-name">Nome</label>
    <input id="profile-name" v-model="name" autocomplete="name"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="error ? 'profile-error' : undefined">
    <button type="submit" :disabled="saving">Salvar nome</button>
    <p role="status">{{ message }}</p>
    <p id="profile-error" role="alert">{{ error }}</p>
  </form>
</template>
```

O componente demonstra uma instância de formulário, envio e feedback. IDs fixos precisariam ser únicos se houvesse várias instâncias. A mensagem de erro é simplificada; um produto real pode distinguir falha do campo de falha de rede e usar outra estratégia de foco.

As práticas de implementação acessível ficam no [guia de formulários e anúncios](./acessibilidade-formularios-erros-aria-live.md). Aqui vamos observar o contrato exposto por esse componente.

## Interaja e verifique o efeito

Em `ProfileNameForm.test.ts`:

```ts
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import ProfileNameForm from './ProfileNameForm.vue'

afterEach(cleanup)

it('envia o nome sem espaços externos e confirma a gravação', async () => {
  const save = vi.fn<(name: string) => Promise<void>>().mockResolvedValue(undefined)
  const user = userEvent.setup()
  render(ProfileNameForm, { props: { save } })

  await user.type(screen.getByRole('textbox', { name: 'Nome' }), '  Caio  ')
  await user.click(screen.getByRole('button', { name: 'Salvar nome' }))

  await waitFor(() => {
    expect(save).toHaveBeenCalledExactlyOnceWith('Caio')
    expect(screen.getByRole('status').textContent).toBe('Nome salvo.')
  })
})

it('preserva o valor e informa a falha quando a gravação rejeita', async () => {
  const save = vi.fn<(name: string) => Promise<void>>()
    .mockRejectedValue(new Error('Falha simulada'))
  const user = userEvent.setup()
  render(ProfileNameForm, { props: { save } })

  await user.type(screen.getByRole('textbox', { name: 'Nome' }), 'Caio')
  await user.click(screen.getByRole('button', { name: 'Salvar nome' }))

  await waitFor(() => {
    expect(screen.getByRole('alert').textContent)
      .toBe('Não foi possível salvar. Tente novamente.')
  })
  expect((screen.getByRole('textbox', { name: 'Nome' }) as HTMLInputElement).value)
    .toBe('Caio')
  expect(screen.getByRole('status').textContent).toBe('')
})
```

O teste usa o texto do botão para realizar a ação, mas o objetivo é conferir envio, sucesso ou falha e preservação do dado. Um componente que só desenha “Salvar nome” não passa nesses cenários.

## Escolha queries pela intenção

[`getByRole`](https://testing-library.com/docs/queries/byrole/) com nome acessível expressa como localizar um controle. [`getByLabelText`](https://testing-library.com/docs/queries/bylabeltext/) também pode ser adequado para campos. `findBy` aguarda um elemento; `queryBy` ajuda a verificar ausência. Confira as [diferenças entre queries](https://testing-library.com/docs/queries/about/).

Não espere um elemento que já existe para provar uma mudança posterior de texto: a região de status do exemplo nasce vazia, por isso aguardamos seu conteúdo com [`waitFor`](https://testing-library.com/docs/dom-testing-library/api-async/). Mantenha ações fora do callback que pode ser repetido durante a espera.

## O que esse teste não prova?

`save` é um double. Ele não verifica [HTTP](https://www.rfc-editor.org/rfc/rfc9110.html), autorização, banco ou layout real. Cubra essas fronteiras onde são relevantes, em vez de chamar este resultado de prova de que o perfil foi persistido no servidor.
