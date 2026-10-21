export interface QuizQuestion {
  question: string
  options: string[]
  answer: number
  explanation: string
}

export function validateQuiz(value: unknown, label: string): QuizQuestion[] {
  if (!Array.isArray(value) || value.length < 2) throw new Error(`Quiz de ${label}: inclua pelo menos duas perguntas.`)
  for (const item of value) {
    if (!item || typeof item !== 'object'
      || typeof item.question !== 'string' || !item.question.trim()
      || typeof item.explanation !== 'string' || !item.explanation.trim()
      || !Array.isArray(item.options) || item.options.length < 2
      || !item.options.every((option: unknown) => typeof option === 'string' && option.trim())
      || new Set(item.options).size !== item.options.length
      || !Number.isInteger(item.answer) || item.answer < 0 || item.answer >= item.options.length) {
      throw new Error(`Quiz inválido em ${label}: confira pergunta, opções, resposta e explicação.`)
    }
  }
  if (new Set(value.map(item => item.question)).size !== value.length) throw new Error(`Perguntas repetidas em ${label}.`)
  return value as QuizQuestion[]
}

export function gradeQuiz(questions: QuizQuestion[], answers: (number | null)[]) {
  const correct = questions.map((question, index) => question.answer === answers[index])
  const score = correct.filter(Boolean).length
  return { correct, score, passed: questions.length > 0 && score === questions.length }
}

export function quizVersion(questions: QuizQuestion[]): string {
  // Versiona a aprovação quando o conteúdo ou o gabarito mudam.
  let hash = 2166136261
  for (const character of JSON.stringify(questions)) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619)
  return (hash >>> 0).toString(16)
}

export function readApprovals(raw: string | null): Record<string, string> {
  try {
    const value: unknown = JSON.parse(raw ?? '{}')
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    return Object.fromEntries(Object.entries(value).filter(([key, version]) => key.startsWith('/posts/') && typeof version === 'string'))
  } catch {
    return {}
  }
}
