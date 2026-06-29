import b4a from 'b4a'
import crypto from 'hypercore-crypto'
import type { SigningIdentity } from './signed-record.ts'

const PUBLIC_KEY_PATTERN = /^[0-9a-f]{64}$/
const SECRET_KEY_PATTERN = /^[0-9a-f]{128}$/

type KeyPairBytes = {
  publicKey: Uint8Array
  secretKey: Uint8Array
}

export function createIdentityKeyPair(): SigningIdentity {
  const keyPair = createCryptoKeyPair()

  return serializeKeyPair(keyPair)
}

export function createIdentityKeyPairFromSeed(seed: Uint8Array | number[]): SigningIdentity {
  const seedBytes = seed instanceof Uint8Array ? seed : Uint8Array.from(seed || [])

  if (seedBytes.byteLength !== 32) {
    throw new Error('Identity seed must be 32 bytes')
  }

  return serializeKeyPair(createCryptoKeyPair(seedBytes))
}

function serializeKeyPair(keyPair: KeyPairBytes): SigningIdentity {
  return {
    publicKey: b4a.toString(keyPair.publicKey, 'hex'),
    secretKey: b4a.toString(keyPair.secretKey, 'hex')
  }
}

function createCryptoKeyPair(seed?: Uint8Array): KeyPairBytes {
  return (crypto.keyPair as unknown as (seed?: Uint8Array) => KeyPairBytes)(seed)
}

export function isIdentityKeyPair(identity: unknown): identity is SigningIdentity {
  const value = identity as Partial<SigningIdentity> | null | undefined
  return isIdentityKey(value?.publicKey) && isIdentitySecretKey(value?.secretKey)
}

export function isIdentityKey(value: unknown): value is string {
  return typeof value === 'string' && PUBLIC_KEY_PATTERN.test(value)
}

export function isIdentitySecretKey(value: unknown): value is string {
  return typeof value === 'string' && SECRET_KEY_PATTERN.test(value)
}
