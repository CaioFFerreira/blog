import test from 'node:test'
import assert from 'node:assert/strict'
import { uploadErrorMessage } from '../docs/.vitepress/theme/upload-errors.ts'
import { validatePdf, maxPdfBytes } from '../docs/.vitepress/theme/library.ts'

test('a PDF below 50 MB passes local validation; oversized PDF fails', async () => {
  const small = new File(['%PDF-1.7\n'], 'livro.pdf', {type:'application/pdf'})
  Object.defineProperty(small, 'size', {value:40*1024*1024})
  assert.equal(await validatePdf(small),null)
  const big = new File(['%PDF-1.7\n'], 'livro.pdf')
  Object.defineProperty(big,'size',{value:maxPdfBytes+1})
  assert.match(await validatePdf(big),/50 MB/)
})
test('remote size limits are distinguished from the frontend limit', () => {
  const message=uploadErrorMessage({statusCode:'413',error:'EntityTooLarge'},'file',20*1024*1024)
  assert.match(message,/20 MB/)
  assert.match(message,/menor que 50 MB/)
  assert.match(message,/413/)
})
test('permissions, sessions, network and catalog failures have separate messages', () => {
  assert.match(uploadErrorMessage({statusCode:'403'},'file',1),/permissão para enviar/)
  assert.match(uploadErrorMessage({code:'42501'},'catalog',1),/permissão para cadastrar/)
  assert.match(uploadErrorMessage({status:401},'file',1),/sessão expirou/)
  assert.match(uploadErrorMessage(new TypeError('Failed to fetch'),'file',1),/conexão/)
})
test('raw provider messages are never displayed', () => {
  assert.doesNotMatch(uploadErrorMessage({message:'secret-token at https://example.com/private.pdf',code:'bad code'},'file',1),/secret-token|https:/)
})
