import test from 'node:test'
import assert from 'node:assert/strict'
import { authErrorMessage, hasAuthCallback } from '../docs/.vitepress/theme/auth-errors.ts'

test('OAuth provider failures give an actionable message without revealing callback data', () => {
  const message = authErrorMessage({
    message: 'Unable to exchange external code: https://example.com/#access_token=secret-token',
    details: { code: 'unexpected_failure' },
  })
  assert.match(message, /Client ID e o Client Secret/)
  assert.match(message, /unexpected_failure/)
  assert.doesNotMatch(message, /secret-token|https:/)
})

test('untrusted error messages and codes are not copied into the interface', () => {
  const message = authErrorMessage({ message: 'access_token=private', code: 'https://example.com/?token=private' })
  assert.doesNotMatch(message, /private|token=|https:/)
})

test('OAuth error callbacks are recognized before the router starts', () => {
  assert.equal(hasAuthCallback(new URL('http://localhost:5173/livros.html#error=server_error&error_code=unexpected_failure')), true)
  assert.equal(hasAuthCallback(new URL('http://localhost:5173/livros.html#access_token=example')), true)
  assert.equal(hasAuthCallback(new URL('http://localhost:5173/livros.html?code=example')), true)
  assert.equal(hasAuthCallback(new URL('https://example.com/blog/#artigos')), false)
})

test('expired OAuth state tells the user to restart login', () => {
  assert.match(authErrorMessage({code:'bad_oauth_state'}), /tentativa de login expirou/)
})
