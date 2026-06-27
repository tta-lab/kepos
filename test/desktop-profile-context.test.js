import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { upsertContact } from '../src/contact-book.ts'
import { createDesktopProfileContext } from '../src/desktop-profile-context.js'

function createMemoryStorage() {
  const values = new Map()

  return {
    getItem: (key) => values.get(key) || null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value)
  }
}

test('desktop profile context loads profile and matching contact book', () => {
  const storage = createMemoryStorage()
  const context = createDesktopProfileContext({ displayName: 'Desktop', storage })

  assert.equal(context.profile.displayName, 'Desktop')
  assert.equal(context.contactBook.ownerProfileId, context.profile.id)
})

test('desktop profile context saves contact book through the same storage', () => {
  const storage = createMemoryStorage()
  const context = createDesktopProfileContext({ displayName: 'Desktop', storage })
  const book = upsertContact(context.contactBook, {
    alias: 'Friend',
    profileId: 'b'.repeat(64),
    source: 'profile_qr',
    trustedAt: 123
  })

  context.saveContactBook(book)
  const restored = createDesktopProfileContext({ displayName: 'Desktop', storage })

  assert.equal(restored.contactBook.contactsByProfileId.get('b'.repeat(64))?.alias, 'Friend')
})

test('desktop controller uses profile context instead of direct local adapters', async () => {
  const source = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')

  assert.match(source, /createDesktopProfileContext/)
  assert.doesNotMatch(source, /from '..\/src\/desktop-local-adapters\.js'/)
  assert.doesNotMatch(source, /getDesktopLocalProfile/)
  assert.doesNotMatch(source, /loadDesktopContactBook/)
  assert.doesNotMatch(source, /saveDesktopContactBook/)
})
