export type UploadStage = 'file' | 'catalog'

export function pdfSizeLabel(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} MB`
}

export function uploadErrorMessage(error: unknown, stage: UploadStage, bytes: number): string {
  const record = error && typeof error === 'object' ? error as Record<string, unknown> : {}
  const codeValue = record.code ?? record.error
  const code = typeof codeValue === 'string' && /^[a-zA-Z0-9_]{1,70}$/.test(codeValue) ? codeValue : ''
  const parsedStatus = Number(record.statusCode)
  const status = Number.isInteger(parsedStatus) && parsedStatus >= 400 ? parsedStatus : Number(record.status)
  const message = typeof record.message === 'string' ? record.message.toLowerCase() : ''
  let explanation: string
  if (status === 413 || /EntityTooLarge|PayloadTooLarge/i.test(code) || /exceeded.*size|size.*exceeded|maximum.*size|too large/.test(message)) {
    explanation = `O PDF tem ${pdfSizeLabel(bytes)}, mas excede o limite configurado no armazenamento. O limite do projeto ou da pasta pode ser menor que 50 MB.`
  } else if (status === 401 || /InvalidJWT|ExpiredToken|InvalidToken/i.test(code)) {
    explanation = 'Sua sessão expirou. Entre novamente na sua conta e tente enviar o PDF.'
  } else if (status === 403 || code === '42501' || /AccessDenied|Unauthorized/i.test(code) || /row.level security|permission denied/.test(message)) {
    explanation = stage === 'catalog'
      ? 'O arquivo foi enviado, mas sua conta não tem permissão para cadastrar o livro. Confira as permissões da biblioteca.'
      : 'Sua conta não tem permissão para enviar este PDF. Confira se você está na sua própria estante.'
  } else if (/BucketNotFound|NoSuchBucket/i.test(code) || /bucket.*not found/.test(message)) {
    explanation = 'O armazenamento da biblioteca não foi encontrado. A configuração da biblioteca precisa ser concluída.'
  } else if (/InvalidMimeType/i.test(code) || /mime.*not supported|mime.*not allowed/.test(message)) {
    explanation = 'O armazenamento não está permitindo arquivos PDF. Confira os tipos de arquivo aceitos pela biblioteca.'
  } else if (/quota|storage.*limit|disk.*full/.test(message)) {
    explanation = 'O armazenamento atingiu o limite de espaço disponível. Libere espaço antes de tentar novamente.'
  } else if (/fetch|network|connection|timeout|timed out/.test(message) || error instanceof TypeError) {
    explanation = 'O envio foi interrompido por uma falha de conexão. Confira sua internet e tente novamente.'
  } else {
    explanation = stage === 'catalog'
      ? 'Não foi possível cadastrar as informações do livro. Tente novamente.'
      : 'Não foi possível enviar o PDF. Tente novamente.'
  }
  // Never copy raw provider messages: they may include paths, URLs or credentials.
  const safeStatus = Number.isInteger(status) && status >= 400 && status <= 599 ? String(status) : ''
  const detail = [code, safeStatus].filter(Boolean).join(' / ')
  return detail ? `${explanation} Código: ${detail}.` : explanation
}
