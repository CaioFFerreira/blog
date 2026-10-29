const active = new Set<symbol>()
let previousOverflow = ''

export function lockModal(token: symbol) {
  if (active.has(token)) return
  if (!active.size) previousOverflow = document.body.style.overflow
  active.add(token)
  document.body.style.overflow = 'hidden'
}
export function unlockModal(token: symbol) {
  if (!active.delete(token)) return
  if (!active.size) document.body.style.overflow = previousOverflow
}
export function isTopModal(token: symbol) { return Array.from(active).at(-1) === token }
