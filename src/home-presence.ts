import compact from 'compact-encoding'
import { createSignedRecord, verifySignedRecord } from './signed-record.ts'
import type { PayloadEncoding, SigningIdentity } from './signed-record.ts'

const HOME_HELLO_TYPE = 'kepos.home.hello.v1'
const HOME_HELLO_VERSION = 1
const KEY_PATTERN = /^[0-9a-f]{64}$/

type HomeHelloPayload = {
  homeAddress: string
  profileId: string
}

type SignedProof = {
  createdAt: number
  signature: string
  signerProfileId: string
  type: string
  version: number
}

export type HomeHello = HomeHelloPayload & {
  createdAt: number
  proof: SignedProof
  type: typeof HOME_HELLO_TYPE
}

const homeHelloPayloadEncoding: PayloadEncoding<HomeHelloPayload> = {
  preencode(state, payload) {
    compact.string.preencode(state, payload.profileId)
    compact.string.preencode(state, payload.homeAddress)
  },
  encode(state, payload) {
    compact.string.encode(state, payload.profileId)
    compact.string.encode(state, payload.homeAddress)
  },
  decode(state) {
    return {
      profileId: compact.string.decode(state),
      homeAddress: compact.string.decode(state)
    }
  }
}

export function createHomeHello({
  createdAt = Date.now(),
  homeAddress,
  identity
}: {
  createdAt?: number
  homeAddress: string
  identity: SigningIdentity
}): HomeHello {
  const payload = {
    homeAddress: cleanKey(homeAddress, 'Home address is required'),
    profileId: cleanKey(identity?.publicKey, 'Profile id is required')
  }
  const signed = createSignedRecord({
    createdAt,
    identity,
    payload,
    payloadEncoding: homeHelloPayloadEncoding,
    type: HOME_HELLO_TYPE,
    version: HOME_HELLO_VERSION
  })

  return {
    type: HOME_HELLO_TYPE,
    ...payload,
    createdAt: signed.createdAt,
    proof: {
      createdAt: signed.createdAt,
      signature: signed.signature,
      signerProfileId: signed.signerProfileId,
      type: signed.type,
      version: signed.version
    }
  }
}

export function verifyHomeHello(hello: HomeHello): boolean {
  try {
    const payload = {
      homeAddress: cleanKey(hello.homeAddress, 'Home address is required'),
      profileId: cleanKey(hello.profileId, 'Profile id is required')
    }

    if (
      hello.type !== HOME_HELLO_TYPE ||
      hello.proof?.type !== HOME_HELLO_TYPE ||
      hello.proof?.version !== HOME_HELLO_VERSION ||
      hello.proof?.createdAt !== hello.createdAt ||
      hello.proof?.signerProfileId !== payload.profileId
    ) {
      return false
    }

    return verifySignedRecord({
      payloadEncoding: homeHelloPayloadEncoding,
      record: {
        createdAt: hello.proof.createdAt,
        payload,
        signature: hello.proof.signature,
        signerProfileId: hello.proof.signerProfileId,
        type: hello.proof.type,
        version: hello.proof.version
      }
    })
  } catch {
    return false
  }
}

function cleanKey(value: string | undefined, message: string): string {
  const cleaned = value?.trim()

  if (!cleaned) {
    throw new Error(message)
  }

  if (!KEY_PATTERN.test(cleaned)) {
    throw new Error('Invalid home presence key')
  }

  return cleaned
}
