import compact from 'compact-encoding'
import { createSignedRecord, verifySignedRecord } from './signed-record.ts'

const DM_MESSAGE_TYPE = 'kepos.dm.message.v1'
const RECORD_VERSION = 1
const KEY_PATTERN = /^[0-9a-f]{64}$/

type Identity = {
  publicKey: string
  secretKey: string
}

type DmMessagePayload = {
  fromProfileId: string
  messageId: string
  text: string
  threadId: string
}

type SignedProof = {
  createdAt: number
  signature: string
  signerProfileId: string
  type: string
  version: number
}

export type DmMessage = DmMessagePayload & {
  createdAt: number
  proof: SignedProof
  type: typeof DM_MESSAGE_TYPE
}

const dmMessagePayloadEncoding = {
  preencode(state: unknown, payload: DmMessagePayload) {
    compact.string.preencode(state, payload.threadId)
    compact.string.preencode(state, payload.messageId)
    compact.string.preencode(state, payload.fromProfileId)
    compact.string.preencode(state, payload.text)
  },
  encode(state: unknown, payload: DmMessagePayload) {
    compact.string.encode(state, payload.threadId)
    compact.string.encode(state, payload.messageId)
    compact.string.encode(state, payload.fromProfileId)
    compact.string.encode(state, payload.text)
  },
  decode(state: unknown): DmMessagePayload {
    return {
      threadId: compact.string.decode(state),
      messageId: compact.string.decode(state),
      fromProfileId: compact.string.decode(state),
      text: compact.string.decode(state)
    }
  }
}

export function createSignedDmMessage({
  createdAt = Date.now(),
  identity,
  messageId,
  text,
  threadId
}: {
  createdAt?: number
  identity: Identity
  messageId: string
  text: string
  threadId: string
}): DmMessage {
  const payload = {
    fromProfileId: cleanProfileId(identity.publicKey),
    messageId: cleanRequiredString(messageId, 'Message id is required'),
    text: cleanRequiredString(text, 'Message text is required'),
    threadId: cleanRequiredString(threadId, 'Thread id is required')
  }
  const proof = createSignedRecord({
    createdAt,
    identity,
    payload,
    payloadEncoding: dmMessagePayloadEncoding,
    type: DM_MESSAGE_TYPE,
    version: RECORD_VERSION
  })

  return {
    ...payload,
    createdAt,
    proof: {
      createdAt: proof.createdAt,
      signature: proof.signature,
      signerProfileId: proof.signerProfileId,
      type: proof.type,
      version: proof.version
    },
    type: DM_MESSAGE_TYPE
  }
}

export function verifySignedDmMessage(message: DmMessage): boolean {
  try {
    if (message?.type !== DM_MESSAGE_TYPE) {
      return false
    }

    const payload = {
      fromProfileId: cleanProfileId(message.fromProfileId),
      messageId: cleanRequiredString(message.messageId, 'Message id is required'),
      text: cleanRequiredString(message.text, 'Message text is required'),
      threadId: cleanRequiredString(message.threadId, 'Thread id is required')
    }

    if (message.proof.signerProfileId !== payload.fromProfileId) {
      return false
    }

    return verifySignedRecord({
      payloadEncoding: dmMessagePayloadEncoding,
      record: {
        createdAt: message.proof.createdAt,
        payload,
        signature: message.proof.signature,
        signerProfileId: message.proof.signerProfileId,
        type: message.proof.type,
        version: message.proof.version
      }
    })
  } catch {
    return false
  }
}

function cleanProfileId(value: string): string {
  const profileId = cleanRequiredString(value, 'Profile id is required').toLowerCase()

  if (!KEY_PATTERN.test(profileId)) {
    throw new Error('Invalid profile id')
  }

  return profileId
}

function cleanRequiredString(value: string | undefined, message: string): string {
  const cleaned = value?.trim()

  if (!cleaned) {
    throw new Error(message)
  }

  return cleaned
}
