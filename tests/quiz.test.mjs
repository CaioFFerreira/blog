import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile, readdir } from 'node:fs/promises'
import { gradeQuiz, quizVersion, readApprovals, validateQuiz } from '../docs/.vitepress/theme/quiz.ts'

const bank = JSON.parse(await readFile(new URL('../docs/.vitepress/theme/quiz-bank.json', import.meta.url), 'utf8'))
const sample = Object.values(bank)[0]

async function markdownSlugs(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const paths = await Promise.all(entries.map(entry => entry.isDirectory()
    ? markdownSlugs(new URL(`${entry.name}/`, directory))
    : entry.name.endsWith('.md') ? [entry.name.slice(0, -3)] : []))
  return paths.flat()
}

test('todo artigo tem um quiz próprio válido e não existem entradas órfãs', async () => {
  const slugs = await markdownSlugs(new URL('../docs/posts/', import.meta.url))
  assert.deepEqual(Object.keys(bank).sort(), slugs.sort())
  for (const [slug, questions] of Object.entries(bank)) validateQuiz(questions, slug)
})

test('aprovação exige acertar todas na mesma tentativa em todos os artigos', () => {
  for (const questions of Object.values(bank)) {
    const answers = questions.map(question => question.answer)
    assert.equal(gradeQuiz(questions, answers).passed, true)
    questions.forEach((question, index) => {
      const wrong = [...answers]
      wrong[index] = (question.answer + 1) % question.options.length
      assert.equal(gradeQuiz(questions, wrong).passed, false)
      assert.equal(gradeQuiz(questions, wrong).score, questions.length - 1)
    })
  }
})

test('respostas ausentes e quiz vazio nunca aprovam', () => {
  assert.equal(gradeQuiz(sample, []).passed, false)
  assert.equal(gradeQuiz(sample, [sample[0].answer, null]).passed, false)
  assert.equal(gradeQuiz([], []).passed, false)
})

test('build rejeita quiz ausente, incompleto ou sem explicação', () => {
  for (const value of [undefined, [], [sample[0]], [sample[0], { ...sample[1], explanation: '' }]]) {
    assert.throws(() => validateQuiz(value, 'post'))
  }
})

test('build rejeita gabarito fora das opções, duplicação e texto inválido', () => {
  for (const patch of [
    { answer: -1 }, { answer: 2 }, { answer: 0.5 }, { answer: '0' },
    { options: ['a', 'a'] }, { options: [''] }, { options: ['a', 2] }, { question: '' },
  ]) assert.throws(() => validateQuiz([{ ...sample[0], ...patch }, sample[1]], 'post'))
  assert.throws(() => validateQuiz([sample[0], sample[0]], 'post'))
})

test('aprovação muda de versão quando pergunta, opções, explicação ou gabarito mudam', () => {
  const version = quizVersion(sample)
  assert.equal(quizVersion(structuredClone(sample)), version)
  for (const patch of [
    { question: 'Outra pergunta?' }, { options: [...sample[0].options].reverse() },
    { explanation: 'Outra explicação.' }, { answer: 1 - sample[0].answer },
  ]) {
    const changed = structuredClone(sample)
    Object.assign(changed[0], patch)
    assert.notEqual(quizVersion(changed), version)
  }
})

test('progresso ausente, corrompido ou manual antigo não aprova artigos', () => {
  for (const raw of [null, '{invalid', 'null', '1', '"text"', '["/posts/git.html"]']) {
    assert.deepEqual(readApprovals(raw), {})
  }
  assert.deepEqual(readApprovals('{"/posts/git.html":"v1","/posts/other.html":true,"other":"v1"}'), {
    '/posts/git.html': 'v1',
  })
})
