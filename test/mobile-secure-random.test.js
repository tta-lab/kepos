import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

test('mobile profile generation uses Expo secure random bytes', () => {
  const source = readFileSync(new URL('../mobile/App.jsx', import.meta.url), 'utf8')

  assert.match(source, /from 'expo-crypto'/)
  assert.match(source, /createIdentityKeyPairFromSeed/)

  const [, createHomeRoomKeyBody = ''] =
    source.match(/function createHomeRoomKey\(\) \{([\s\S]*?)\n\}/) || []
  assert.match(createHomeRoomKeyBody, /Crypto\.getRandomBytes\(32\)/)
  assert.doesNotMatch(createHomeRoomKeyBody, /Math\.random\(\)/)
})
