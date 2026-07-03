import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  getOrCreateBackendDmEncryptionKeyPair,
  isDmEncryptionKeyPair
} from '../src/backend-dm-key-storage.ts'

describe('backend DM encryption key storage', () => {
  test('creates and persists a DM encryption key pair on first run', async () => {
    const writes = new Map()
    const keyPair = {
      publicKey: 'a'.repeat(64),
      secretKey: 'b'.repeat(64)
    }

    const result = await getOrCreateBackendDmEncryptionKeyPair({
      basePath: '/tmp/kepos',
      createKeyPair: () => keyPair,
      fs: createMemoryFs(writes)
    })

    assert.deepEqual(result, keyPair)
    assert.deepEqual(JSON.parse(writes.get('/tmp/kepos/kepos/dm-encryption-keypair.json')), keyPair)
  })

  test('reuses a valid persisted DM encryption key pair', async () => {
    const keyPair = {
      publicKey: 'c'.repeat(64),
      secretKey: 'd'.repeat(64)
    }
    const writes = new Map([
      ['/tmp/kepos/kepos/dm-encryption-keypair.json', JSON.stringify(keyPair)]
    ])

    const result = await getOrCreateBackendDmEncryptionKeyPair({
      basePath: '/tmp/kepos',
      createKeyPair: () => {
        throw new Error('should not create')
      },
      fs: createMemoryFs(writes)
    })

    assert.deepEqual(result, keyPair)
  })

  test('rejects corrupt persisted DM encryption key pair instead of replacing it', async () => {
    const writes = new Map([['/tmp/kepos/kepos/dm-encryption-keypair.json', '{bad json']])

    await assert.rejects(
      getOrCreateBackendDmEncryptionKeyPair({
        basePath: '/tmp/kepos',
        createKeyPair: () => ({
          publicKey: 'e'.repeat(64),
          secretKey: 'f'.repeat(64)
        }),
        fs: createMemoryFs(writes)
      }),
      /corrupt backend DM encryption key pair/i
    )

    assert.equal(writes.get('/tmp/kepos/kepos/dm-encryption-keypair.json'), '{bad json')
  })

  test('rejects partial persisted DM encryption key pair instead of replacing it', async () => {
    const writes = new Map([
      [
        '/tmp/kepos/kepos/dm-encryption-keypair.json',
        JSON.stringify({
          publicKey: 'a'.repeat(64)
        })
      ]
    ])

    await assert.rejects(
      getOrCreateBackendDmEncryptionKeyPair({
        basePath: '/tmp/kepos',
        createKeyPair: () => ({
          publicKey: 'e'.repeat(64),
          secretKey: 'f'.repeat(64)
        }),
        fs: createMemoryFs(writes)
      }),
      /corrupt backend DM encryption key pair/i
    )
  })

  test('validates DM encryption key pair shape', () => {
    assert.equal(
      isDmEncryptionKeyPair({
        publicKey: 'a'.repeat(64),
        secretKey: 'b'.repeat(64)
      }),
      true
    )
    assert.equal(
      isDmEncryptionKeyPair({
        publicKey: 'a'.repeat(63),
        secretKey: 'b'.repeat(64)
      }),
      false
    )
  })
})

function createMemoryFs(files) {
  return {
    mkdir() {
      return Promise.resolve()
    },
    readFile(path) {
      if (!files.has(path)) {
        const error = new Error(`ENOENT: ${path}`)
        error.code = 'ENOENT'
        return Promise.reject(error)
      }

      return Promise.resolve(Buffer.from(files.get(path)))
    },
    writeFile(path, value) {
      files.set(path, Buffer.from(value).toString('utf8'))
      return Promise.resolve()
    }
  }
}
