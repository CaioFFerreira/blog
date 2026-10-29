import test from 'node:test'
import assert from 'node:assert/strict'
import { lockModal, unlockModal, isTopModal } from '../docs/.vitepress/theme/modal-stack.ts'

test('nested dialogs keep scrolling locked until the last dialog closes', () => {
  const original = globalThis.document
  globalThis.document = { body: { style: { overflow: 'clip' } } }
  const parent = Symbol('parent'), loading = Symbol('loading')
  try {
    lockModal(parent)
    lockModal(loading)
    assert.equal(document.body.style.overflow, 'hidden')
    assert.equal(isTopModal(loading), true)
    assert.equal(isTopModal(parent), false)
    unlockModal(loading)
    assert.equal(document.body.style.overflow, 'hidden')
    assert.equal(isTopModal(parent), true)
    unlockModal(parent)
    assert.equal(document.body.style.overflow, 'clip')
  } finally { unlockModal(loading); unlockModal(parent); globalThis.document = original }
})

test('out-of-order unmounts and repeated cleanup restore the original page state', () => {
  const original = globalThis.document
  globalThis.document = { body: { style: { overflow: '' } } }
  const parent = Symbol('parent'), loading = Symbol('loading')
  try {
    lockModal(parent)
    lockModal(parent)
    lockModal(loading)
    unlockModal(parent)
    unlockModal(parent)
    assert.equal(document.body.style.overflow, 'hidden')
    assert.equal(isTopModal(loading), true)
    unlockModal(loading)
    unlockModal(loading)
    assert.equal(document.body.style.overflow, '')
    assert.equal(isTopModal(loading), false)
  } finally { unlockModal(loading); unlockModal(parent); globalThis.document = original }
})
