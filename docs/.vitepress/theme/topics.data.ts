import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { topicLabel } from './topics'

declare const data: string[]
export { data }

export default {
  watch: ['../../posts/**'],
  load(): string[] {
    return readdirSync(fileURLToPath(new URL('../../posts/', import.meta.url)), { withFileTypes: true })
      .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
      .map(entry => topicLabel(entry.name))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
  },
}
