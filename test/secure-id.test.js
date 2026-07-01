import assert from 'node:assert/strict'
import test from 'node:test'
import { createSecureHexId, createSecureId } from '../src/secure-id.ts'

test('secure id uses randomUUID when available', () => {
  assert.equal(
    createSecureId({
      randomUUID: () => 'uuid-1',
      randomBytes: () => {
        throw new Error('random bytes should not be used')
      }
    }),
    'uuid-1'
  )
})

test('secure id falls back to secure random bytes', () => {
  assert.equal(
    createSecureId({
      randomBytes: (size) => {
        assert.equal(size, 16)
        return new Uint8Array([
          0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e,
          0x0f
        ])
      }
    }),
    '000102030405060708090a0b0c0d0e0f'
  )
})

test('secure id fails closed without a secure random source', () => {
  assert.throws(() => createSecureId({}), /Secure random id source is required/)
})

test('secure hex id always uses secure random bytes for fixed-width keys', () => {
  assert.equal(
    createSecureHexId({
      byteLength: 32,
      randomBytes: (size) => {
        assert.equal(size, 32)
        return new Uint8Array(32).fill(0xab)
      }
    }),
    'ab'.repeat(32)
  )
})
