import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { createTreeholeStoragePath } from '../src/treehole-storage.ts'

describe('treehole storage path', () => {
  test('uses the mobile storage base instead of os homedir', () => {
    const roomKey = 'a'.repeat(64)

    const storage = createTreeholeStoragePath({
      basePath: '/data/user/0/io.guion.kepos/files',
      bootstrapKey: null,
      roomKey
    })

    assert.equal(storage, '/data/user/0/io.guion.kepos/files/kepos-treehole-aaaaaaaaaaaaaaaa-host')
  })

  test('uses bootstrap key suffix for joined treeholes', () => {
    const roomKey = 'b'.repeat(64)
    const bootstrapKey = 'c'.repeat(64)

    const storage = createTreeholeStoragePath({
      basePath: '/tmp/kepos',
      bootstrapKey,
      roomKey
    })

    assert.equal(storage, '/tmp/kepos/kepos-treehole-bbbbbbbbbbbbbbbb-cccccccccccccccc')
  })

  test('normalizes file uri storage bases from React Native', () => {
    const storage = createTreeholeStoragePath({
      basePath: 'file:///data/user/0/io.guion.kepos/files/kepos/',
      bootstrapKey: null,
      roomKey: 'd'.repeat(64)
    })

    assert.equal(
      storage,
      '/data/user/0/io.guion.kepos/files/kepos/kepos-treehole-dddddddddddddddd-host'
    )
  })
})
