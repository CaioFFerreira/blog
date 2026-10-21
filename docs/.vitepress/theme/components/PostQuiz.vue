<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { gradeQuiz, type QuizQuestion } from '../quiz'
import { useStudyProgress } from '../composables/useStudyProgress'

const props = defineProps<{ url: string; version: string; questions: QuizQuestion[] }>()
const { studied, markPassed, storageAvailable } = useStudyProgress(() => props.url, () => props.version)
const answers = ref<(number | null)[]>(props.questions.map(() => null))
const submitted = ref(false)
const resultHeading = ref<HTMLElement | null>(null)
const firstInput = ref<HTMLInputElement[]>([])
const result = computed(() => gradeQuiz(props.questions, answers.value))
const complete = computed(() => answers.value.every(answer => answer !== null))

async function submit() {
  if (!complete.value || submitted.value) return
  submitted.value = true
  if (result.value.passed) markPassed()
  await nextTick()
  resultHeading.value?.focus()
}

async function retry() {
  answers.value = props.questions.map(() => null)
  submitted.value = false
  await nextTick()
  firstInput.value[0]?.focus()
}
</script>

<template>
  <section id="quiz" class="post-quiz" aria-labelledby="quiz-title">
    <p class="eyebrow">Coloque em prática</p>
    <h2 id="quiz-title">Confira o que você aprendeu</h2>
    <p>Responda às {{ questions.length }} perguntas sobre este artigo. Acerte todas na mesma tentativa para validar seu conhecimento. Você pode tentar quantas vezes quiser.</p>
    <p v-if="studied" class="quiz-approved">✓ Conhecimento validado neste navegador. Você pode refazer o quiz para revisar.</p>
    <form @submit.prevent="submit">
      <fieldset v-for="(question, index) in questions" :key="index" class="quiz-question" :disabled="submitted" :aria-describedby="submitted ? `quiz-feedback-${index}` : undefined">
        <legend>{{ index + 1 }}. {{ question.question }}</legend>
        <label v-for="(option, optionIndex) in question.options" :key="optionIndex" class="quiz-option" :class="{ 'is-selected': answers[index] === optionIndex }">
          <input ref="firstInput" v-model="answers[index]" type="radio" :name="`quiz-question-${index}`" :value="optionIndex" required>
          <span>{{ option }}</span>
        </label>
        <p v-if="submitted" :id="`quiz-feedback-${index}`" class="quiz-feedback" :class="{ 'is-correct': result.correct[index] }">
          <strong>{{ result.correct[index] ? 'Resposta correta.' : 'Revise este ponto.' }}</strong>
          <template v-if="!result.correct[index]"> Resposta esperada: {{ question.options[question.answer] }}.</template>
          {{ question.explanation }}
        </p>
      </fieldset>
      <p v-if="!submitted" class="quiz-hint">{{ answers.filter(answer => answer !== null).length }} de {{ questions.length }} respondidas.</p>
      <button v-if="!submitted" class="quiz-submit" type="submit" :disabled="!complete">Conferir respostas</button>
      <div v-else class="quiz-result">
        <h3 ref="resultHeading" tabindex="-1">{{ result.passed ? 'Parabéns! Você acertou todas.' : `Você acertou ${result.score} de ${questions.length}.` }}</h3>
        <p>{{ result.passed ? 'Conhecimento validado. Continue para a próxima leitura ou revise quando quiser.' : 'Leia as explicações, consulte o artigo e tente novamente para acertar todas.' }}</p>
        <p v-if="result.passed && !storageAvailable">Não foi possível salvar a aprovação neste navegador. Ela vale nesta visita, mas pode se perder ao sair.</p>
        <button class="quiz-submit" type="button" @click="retry">{{ result.passed ? 'Refazer para revisar' : 'Tentar novamente' }}</button>
      </div>
    </form>
    <p class="quiz-hint">A aprovação é uma autoavaliação e fica salva apenas neste navegador. Acertar o quiz complementa a prática com os exemplos do artigo.</p>
  </section>
</template>
