import type { SignedRecord, SigningIdentity } from '../src/signed-record.ts'
import { createSignedRecord, createSigningKeyPair } from '../src/signed-record.ts'

type ProbePayload = {
  scope: string
  subjectProfileId: string
}

const identity: SigningIdentity = createSigningKeyPair()
const record: SignedRecord<ProbePayload> = createSignedRecord({
  createdAt: 1000,
  identity,
  payload: {
    scope: 'home',
    subjectProfileId: 'a'.repeat(64)
  },
  payloadEncoding: {
    preencode() {},
    encode() {},
    decode() {
      return {
        scope: 'home',
        subjectProfileId: 'a'.repeat(64)
      }
    }
  },
  type: 'kepos.signed-record.type-probe',
  version: 1
})

if (record.signerProfileId !== identity.publicKey) {
  throw new Error('Signed record type probe failed')
}
