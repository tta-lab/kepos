import assert from 'node:assert/strict'
import test from 'node:test'
import { createHomeHello, verifyHomeHello } from '../src/home-presence.ts'
import { createSigningKeyPair } from '../src/signed-record.ts'

test('home hello is signed by the profile identity', () => {
  const identity = createSigningKeyPair()
  const hello = createHomeHello({
    createdAt: 1000,
    homeAddress: 'a'.repeat(64),
    identity
  })

  assert.equal(hello.type, 'kepos.home.hello.v1')
  assert.equal(hello.profileId, identity.publicKey)
  assert.equal(verifyHomeHello(hello), true)
})

test('home hello verification rejects tampering', () => {
  const identity = createSigningKeyPair()
  const hello = createHomeHello({
    createdAt: 1000,
    homeAddress: 'a'.repeat(64),
    identity
  })

  assert.equal(
    verifyHomeHello({
      ...hello,
      homeAddress: 'b'.repeat(64)
    }),
    false
  )
})
