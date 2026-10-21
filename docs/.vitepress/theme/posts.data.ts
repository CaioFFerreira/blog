import { createContentLoader } from 'vitepress'
import type { Post } from './types'
import { topicLabel } from './topics'
import quizBank from './quiz-bank.json'
import { quizVersion, validateQuiz } from './quiz'

declare const data: Post[]
export { data }

export default createContentLoader('posts/**/*.md', {
  includeSrc: true,
  transform(pages): Post[] {
    const routedPages = pages.map(page => ({
      ...page,
      topic: page.url.match(/^\/posts\/([^/]+)\//)?.[1],
      url: page.url.replace(/^\/posts\/[^/]+\/([^/]+)$/, '/posts/$1'),
    }))
    const urls = routedPages.map(page => page.url)
    if (new Set(urls).size !== urls.length) {
      throw new Error('Há artigos com a mesma URL. Use nomes de arquivo únicos entre os temas.')
    }
    return routedPages.map(({ url, frontmatter, topic, src }) => {
      const { title, description, date, tags } = frontmatter
      const category = topic ? topicLabel(decodeURIComponent(topic)) : frontmatter.category
      if (typeof title !== 'string' || typeof description !== 'string'
        || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)
        || Number.isNaN(Date.parse(date))
        || new Date(date).toISOString().slice(0, 10) !== date || typeof category !== 'string'
        || !Array.isArray(tags) || !tags.every(tag => typeof tag === 'string')) {
        throw new Error(`Metadados inválidos em ${url}. Confira title, description, date, category e tags.`)
      }
      const content = (src ?? '').replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '')
      const slug = url.split('/').pop()!.replace(/\.html$/, '')
      const quiz = validateQuiz((quizBank as Record<string, unknown>)[slug], url)
      return { url, title, description, date, category, tags, content, quiz, quizVersion: quizVersion(quiz) }
    }).sort((first, second) => second.date.localeCompare(first.date))
  },
})
