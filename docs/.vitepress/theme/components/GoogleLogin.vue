<script setup lang="ts">
import { useData } from 'vitepress'
import { useAuth } from '../composables/useAuth'

const { frontmatter } = useData()
const { user, ready, busy, errorMessage, accountName, signIn, signOut } = useAuth()
</script>

<template>
  <div class="google-login" :aria-busy="busy || !ready">
    <template v-if="user">
      <span class="account-avatar" aria-hidden="true">{{ accountName.slice(0, 1).toUpperCase() }}</span>
      <span class="account-name" :title="accountName">{{ accountName }}</span>
      <button type="button" :disabled="busy" @click="signOut">{{ busy ? 'Saindo…' : 'Sair' }}</button>
    </template>
    <button v-else type="button" :disabled="!ready || busy" @click="signIn(frontmatter.layout === 'library' ? '/livros.html' : '/')">
      {{ !ready ? 'Carregando conta…' : busy ? 'Entrando…' : 'Entrar com Google' }}
    </button>
    <span v-if="errorMessage" class="login-error" role="alert">{{ errorMessage }}</span>
  </div>
</template>

<style scoped>
.google-login { display: flex; position: relative; align-items: center; flex-wrap: wrap; gap: 8px; }
button { min-height: 44px; padding: 8px 12px; border: 1px solid var(--line); border-radius: 5px; background: var(--surface); color: var(--green); font: inherit; cursor: pointer; }
button:disabled { opacity: .6; cursor: wait; }
.account-avatar { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; background: var(--green); color: var(--paper); font-weight: 700; }
.account-name { max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--muted); }
.login-error { position: absolute; top: 100%; right: 0; z-index: 50; width: 240px; padding: 10px; border: 1px solid var(--line); border-radius: 5px; background: var(--surface); color: var(--orange); font-size: 12px; line-height: 1.5; }
@media (max-width: 900px) { .login-error { position: static; width: 100%; } }
</style>
