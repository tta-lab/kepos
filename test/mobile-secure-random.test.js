import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { createMobileHomeRoomKey, createMobileMessageId } from '../src/mobile-runtime-ids.ts'

test('mobile profile generation uses Expo secure random bytes', () => {
  const source = readFileSync(new URL('../mobile/App.tsx', import.meta.url), 'utf8')

  assert.match(source, /from 'expo-crypto'/)
  assert.match(source, /createIdentityKeyPairFromSeed/)
  assert.match(source, /createMobileHomeRoomKey\(\{ randomBytes: Crypto\.getRandomBytes \}\)/)
  assert.match(source, /createMobileMessageId\(/)
  assert.match(source, /randomBytes: Crypto\.getRandomBytes/)
  assert.doesNotMatch(source, /function createHomeRoomKey\(/)
  assert.doesNotMatch(source, /function createMessageId\(/)
  assert.doesNotMatch(source, /Math\.random\(\)/)
})

test('mobile home room keys use exactly 32 secure random bytes', () => {
  const calls = []
  const key = createMobileHomeRoomKey({
    randomBytes(size) {
      calls.push(size)
      return Uint8Array.from({ length: size }, (_, index) => index)
    }
  })

  assert.deepEqual(calls, [32])
  assert.equal(key, '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f')
})

test('mobile message ids delegate to secure random id creation', () => {
  const calls = []
  const id = createMobileMessageId({
    randomBytes(size) {
      calls.push(size)
      return Uint8Array.from({ length: size }, (_, index) => 255 - index)
    }
  })

  assert.deepEqual(calls, [16])
  assert.match(id, /^[0-9a-f]{32}$/)
})
