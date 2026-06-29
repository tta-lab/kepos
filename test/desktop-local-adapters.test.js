import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  getDesktopLocalProfile,
  loadDesktopContactBook,
  saveDesktopContactBook
} from '../src/desktop-local-adapters.ts'
import { upsertContact } from '../src/contact-book.ts'

function createMemoryStorage() {
  const values = new Map()

  return {
    getItem: (key) => values.get(key) || null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value)
  }
}

test('desktop local adapters create a profile with DM encryption material', () => {
  const storage = createMemoryStorage()
  const profile = getDesktopLocalProfile({ displayName: 'Desktop', storage })

  assert.equal(profile.displayName, 'Desktop')
  assert.equal(typeof profile.id, 'string')
  assert.equal(typeof profile.identity.secretKey, 'string')
  assert.equal(typeof profile.dmEncryptionKeyPair.secretKey, 'string')
})

test('desktop local adapters save and load the local contact book', () => {
  const storage = createMemoryStorage()
  const profile = getDesktopLocalProfile({ displayName: 'Desktop', storage })
  const book = upsertContact(loadDesktopContactBook({ ownerProfileId: profile.id, storage }), {
    alias: 'Friend',
    profileId: 'b'.repeat(64),
    source: 'profile_qr',
    trustedAt: 123
  })

  saveDesktopContactBook({ book, storage })

  assert.equal(
    loadDesktopContactBook({ ownerProfileId: profile.id, storage }).contactsByProfileId.get(
      'b'.repeat(64)
    )?.alias,
    'Friend'
  )
})

test('desktop profile context uses local adapters instead of direct profile storage imports', async () => {
  const source = [
    await readFile(new URL('../src/desktop-profile-context.ts', import.meta.url), 'utf8'),
    await readFile(new URL('../src/desktop-profile-context-core.ts', import.meta.url), 'utf8')
  ].join('\n')

  assert.match(source, /getDesktopLocalProfile/)
  assert.match(source, /loadDesktopContactBook/)
  assert.match(source, /saveDesktopContactBook/)
  assert.doesNotMatch(source, /createDmEncryptionKeyPair/)
  assert.doesNotMatch(source, /getOrCreateLocalProfile/)
  assert.doesNotMatch(source, /loadContactBookFromStorage/)
  assert.doesNotMatch(source, /saveContactBookToStorage/)
})
