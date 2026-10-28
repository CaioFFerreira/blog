export function authErrorMessage(error: unknown): string {
  const record = error && typeof error === 'object' ? error as Record<string, unknown> : {}
  const details = record.details && typeof record.details === 'object'
    ? record.details as Record<string, unknown> : {}
  const rawCode = record.code ?? details.code
  const code = typeof rawCode === 'string' && /^[a-z_]{1,70}$/.test(rawCode) ? rawCode : ''
  const message = typeof record.message === 'string' ? record.message.toLowerCase() : ''
  let explanation = 'Não foi possível concluir o login. Tente novamente.'
  if (/exchange.*(external|oauth).*code|exchange external code/.test(message)) {
    explanation = 'O Supabase não conseguiu concluir a autenticação com o Google. Confira o Client ID e o Client Secret nas configurações do provedor Google.'
  } else if (code === 'provider_disabled' || /provider.*not enabled/.test(message)) {
    explanation = 'O login com Google está desabilitado no Supabase.'
  } else if (code === 'signup_disabled') {
    explanation = 'O cadastro de novas contas está desabilitado no Supabase.'
  } else if (['bad_oauth_state', 'bad_oauth_callback', 'flow_state_expired', 'flow_state_not_found'].includes(code)) {
    explanation = 'A tentativa de login expirou ou perdeu a validação. Inicie novamente pelo botão Entrar com Google.'
  } else if (code === 'access_denied' || /access.denied|cancelled|canceled/.test(message)) {
    explanation = 'O acesso pelo Google não foi autorizado. Tente entrar novamente e permita o acesso solicitado.'
  } else if (/fetch|network|connection/.test(message)) {
    explanation = 'Não foi possível conectar ao Supabase. Verifique sua conexão e tente novamente.'
  } else if (/storage|quota|securityerror/.test(message)) {
    explanation = 'O navegador não conseguiu guardar sua sessão. Permita o armazenamento de dados deste site e tente novamente.'
  }
  // Display only a known-safe error code, never a callback URL or token.
  return code ? `${explanation} Código: ${code}.` : explanation
}

export function hasAuthCallback(url: URL): boolean {
  const hash = new URLSearchParams(url.hash.slice(1))
  return ['access_token', 'error', 'error_code', 'error_description'].some(key => hash.has(key))
    || ['code', 'error', 'error_code', 'error_description'].some(key => url.searchParams.has(key))
}
