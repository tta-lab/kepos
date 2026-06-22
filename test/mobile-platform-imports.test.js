import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { describe, test } from 'node:test'

describe('mobile platform imports', () => {
  test('profile modules used by React Native do not import Node built-ins', async () => {
    const files = ['src/profile.js', 'src/local-profile.js']
    const sources = await Promise.all(files.map((file) => readFile(file, 'utf8')))

    for (const source of sources) {
      assert.doesNotMatch(source, /from ['"]node:/)
    }
  })
})
