import compact from 'compact-encoding'
import { recordMessageRequest } from './contact-book.ts'
import type { ContactBook } from './contact-book.ts'
import { createSignedRecord, verifySignedRecord } from './signed-record.ts'
import type { PayloadEncoding, SigningIdentity } from './signed-record.ts'

const MESSAGE_REQUEST_TYPE = 'kepos.message.request.v1'
const MESSAGE_REQUEST_VERSION = 1
const KEY_PATTERN = /^[0-9a-f]{64}$/

type SignedProof = {
  createdAt: number
  signature: string
  signerProfileId: string
  type: string
  version: number
}

type MessageRequestPayload = {
  fromProfileId: string
  requestId: string
  senderEncryptionPublicKey: string
  text: string
  toProfileId: string
}

export type MessageRequest = MessageRequestPayload & {
  createdAt: number
  proof: SignedProof
  type: typeof MESSAGE_REQUEST_TYPE
}

const messageRequestPayloadEncoding: PayloadEncoding<MessageRequestPayload> = {
  preencode(state, payload) {
    compact.string.preencode(state, payload.requestId)
    compact.string.preencode(state, payload.fromProfileId)
    compact.string.preencode(state, payload.toProfileId)
    compact.string.preencode(state, payload.senderEncryptionPublicKey)
    compact.string.preencode(state, payload.text)
  },
  encode(state, payload) {
    compact.string.encode(state, payload.requestId)
    compact.string.encode(state, payload.fromProfileId)
    compact.string.encode(state, payload.toProfileId)
    compact.string.encode(state, payload.senderEncryptionPublicKey)
    compact.string.encode(state, payload.text)
  },
  decode(state) {
    return {
      requestId: compact.string.decode(state),
      fromProfileId: compact.string.decode(state),
      toProfileId: compact.string.decode(state),
      senderEncryptionPublicKey: compact.string.decode(state),
      text: compact.string.decode(state)
    }
  }
}

export function createMessageRequest({
  createdAt = Date.now(),
  fromIdentity,
  requestId,
  senderEncryptionPublicKey,
  text,
  toProfileId
}: {
  createdAt?: number
  fromIdentity: SigningIdentity
  requestId: string
  senderEncryptionPublicKey: string
  text: string
  toProfileId: string
}): MessageRequest {
  const payload = cleanMessageRequestPayload({
    fromProfileId: fromIdentity?.publicKey,
    requestId,
    senderEncryptionPublicKey,
    text,
    toProfileId
  })
  const signed = createSignedRecord({
    createdAt,
    identity: fromIdentity,
    payload,
    payloadEncoding: messageRequestPayloadEncoding,
    type: MESSAGE_REQUEST_TYPE,
    version: MESSAGE_REQUEST_VERSION
  })

  return {
    type: MESSAGE_REQUEST_TYPE,
    ...payload,
    createdAt,
    proof: {
      createdAt: signed.createdAt,
      signature: signed.signature,
      signerProfileId: signed.signerProfileId,
      type: signed.type,
      version: signed.version
    }
  }
}

export function verifyMessageRequest(request: unknown): request is MessageRequest {
  try {
    const value = asRecord(request)
    const payload = cleanMessageRequestPayload(value)
    const proof = asRecord(value.proof)

    if (
      value.type !== MESSAGE_REQUEST_TYPE ||
      proof.type !== MESSAGE_REQUEST_TYPE ||
      proof.version !== MESSAGE_REQUEST_VERSION ||
      proof.createdAt !== value.createdAt ||
      proof.signerProfileId !== payload.fromProfileId
    ) {
      return false
    }

    return verifySignedRecord({
      payloadEncoding: messageRequestPayloadEncoding,
      record: {
        createdAt: proof.createdAt as number,
        payload,
        signature: proof.signature as string,
        signerProfileId: proof.signerProfileId as string,
        type: proof.type as string,
        version: proof.version as number
      }
    })
  } catch {
    return false
  }
}

export function applyMessageRequestToContactBook(
  book: ContactBook,
  {
    alias,
    request,
    source
  }: {
    alias?: string
    request: MessageRequest
    source?: string
  }
) {
  if (!verifyMessageRequest(request) || request.toProfileId !== book?.ownerProfileId) {
    throw new Error('Invalid message request')
  }

  return recordMessageRequest(book, {
    alias,
    displayNameSnapshot: undefined,
    profileId: request.fromProfileId,
    requestedAt: request.createdAt,
    requestId: request.requestId,
    senderEncryptionPublicKey: request.senderEncryptionPublicKey,
    source
  })
}

function cleanMessageRequestPayload(payload: Record<string, unknown> = {}): MessageRequestPayload {
  return {
    requestId: cleanString(payload.requestId, 'Request id is required'),
    fromProfileId: cleanKey(payload.fromProfileId, 'Sender profile id is required'),
    toProfileId: cleanKey(payload.toProfileId, 'Recipient profile id is required'),
    senderEncryptionPublicKey: cleanKey(
      payload.senderEncryptionPublicKey,
      'Sender encryption public key is required'
    ),
    text: cleanString(payload.text, 'Request text is required')
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') {
    throw new Error('Expected object')
  }

  return value as Record<string, unknown>
}

function cleanKey(value: unknown, message: string): string {
  const key = cleanString(value, message)

  if (!KEY_PATTERN.test(key)) {
    throw new Error('Invalid profile id')
  }

  return key
}

function cleanString(value: unknown, message: string): string {
  const cleaned = typeof value === 'string' ? value.trim() : ''

  if (!cleaned) {
    throw new Error(message)
  }

  return cleaned
}
