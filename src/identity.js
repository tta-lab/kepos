import b4a from 'b4a'
import crypto from 'hypercore-crypto'

const PUBLIC_KEY_PATTERN = /^[0-9a-f]{64}$/
const SECRET_KEY_PATTERN = /^[0-9a-f]{128}$/

export function createIdentityKeyPair() {
  const keyPair = crypto.keyPair()

  return serializeKeyPair(keyPair)
}

export function createIdentityKeyPairFromSeed(seed) {
  const seedBytes = b4a.from(seed || [])

  if (seedBytes.byteLength !== 32) {
    throw new Error('Identity seed must be 32 bytes')
  }

  return serializeKeyPair(crypto.keyPair(seedBytes))
}

function serializeKeyPair(keyPair) {
  return {
    publicKey: b4a.toString(keyPair.publicKey, 'hex'),
    secretKey: b4a.toString(keyPair.secretKey, 'hex')
  }
}

export function isIdentityKeyPair(identity) {
  return isIdentityKey(identity?.publicKey) && isIdentitySecretKey(identity?.secretKey)
}

export function isIdentityKey(value) {
  return typeof value === 'string' && PUBLIC_KEY_PATTERN.test(value)
}

export function isIdentitySecretKey(value) {
  return typeof value === 'string' && SECRET_KEY_PATTERN.test(value)
}
