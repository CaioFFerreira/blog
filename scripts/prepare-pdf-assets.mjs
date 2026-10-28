import { cp, mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const source = dirname(require.resolve('pdfjs-dist/package.json'))
const target = fileURLToPath(new URL('../docs/public/pdfjs-assets/', import.meta.url))
await mkdir(target, { recursive: true })
for (const directory of ['cmaps', 'standard_fonts', 'wasm', 'iccs']) {
  await cp(join(source, directory), join(target, directory), { recursive: true })
}
