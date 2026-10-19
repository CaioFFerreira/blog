<script setup lang="ts">
import { withBase } from 'vitepress'
import { readingPaths, startPost } from '../reading-paths'
</script>

<template>
  <section id="comece-aqui" class="reading-start" aria-labelledby="reading-title">
    <div class="reading-intro">
      <p class="eyebrow">SEU PONTO DE PARTIDA</p>
      <h2 id="reading-title">Primeira visita? Comece por aqui.</h2>
      <p>Se os assuntos ainda são novos, abra o roteiro e siga a ordem sugerida. Já conhece a base? Escolha uma trilha abaixo e avance no seu ritmo.</p>
      <a v-if="startPost" class="reading-cta" :href="withBase(startPost.url)">Começar pelo roteiro para iniciantes <span aria-hidden="true">→</span></a>
    </div>
    <ol class="reading-preview" aria-label="Primeiros tópicos da sequência">
      <li v-for="(path, index) in readingPaths.slice(0, 3)" :key="path.category">
        <span class="eyebrow">PASSO {{ index + 1 }}</span>
        <a :href="withBase(path.posts[0]!.url)">{{ path.category }} <span aria-hidden="true">→</span></a>
        <p>{{ path.goal }}</p>
      </li>
    </ol>
    <details id="trilhas" class="reading-tracks">
      <summary>Ver todas as {{ readingPaths.length }} trilhas e a ordem dos artigos</summary>
      <p class="reading-hint">Da base às decisões de projeto. Abra um tópico para ver a sequência dos artigos.</p>
      <ol class="reading-track-list">
        <li v-for="(path, index) in readingPaths" :key="path.category">
          <details>
            <summary>
              <span class="reading-number" aria-hidden="true">{{ String(index + 1).padStart(2, '0') }}</span>
              <span class="reading-track-label"><strong>{{ path.category }}</strong><span>{{ path.goal }}</span></span>
              <span class="reading-count">{{ path.posts.length }} {{ path.posts.length === 1 ? 'artigo' : 'artigos' }}</span>
            </summary>
            <ol class="reading-articles">
              <li v-for="post in path.posts" :key="post.url"><a :href="withBase(post.url)">{{ post.title }}</a></li>
            </ol>
          </details>
        </li>
      </ol>
    </details>
  </section>
</template>
