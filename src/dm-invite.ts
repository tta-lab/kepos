import b4a from 'b4a'
import compact from 'compact-encoding'
import sodium from 'sodium-universal'
import { createSignedRecord, verifySignedRecord } from './signed-record.ts'
import type { PayloadEncoding, SigningIdentity } from './signed-record.ts'

const DM_INVITE_TYPE = 'kepos.dm.invite.v1'
const DM_INVITE_VERSION = 1
const HEX_32 = /^[0-9a-f]{64}$/
const HEX = /^[0-9a-f]+$/

type SignedProof = {
  createdAt: number
  signature: string
  signerProfileId: string
  type: string
  version: number
}

type DmInviteSignedPayload = {
  channelDiscoveryKey: string
  channelPublicKey: string
  expiresAt?: number
  fromProfileId: string
  inviteId: string
  recipientEncryptionPublicKey: string
  requestId?: string
  sealedPayload: string
  toProfileId: string
}

export type DmEncryptionKeyPair = {
  publicKey: string
  secretKey: string
}

export type DmInvitePayload = Record<string, unknown> & {
  capabilities?: string[]
  channelEncryptionKey?: string
}

export type DmInvite = DmInviteSignedPayload & {
  createdAt: number
  proof: SignedProof
  type: typeof DM_INVITE_TYPE
}

const dmInvitePayloadEncoding: PayloadEncoding<DmInviteSignedPayload> = {
  preencode(state, payload) {
    compact.string.preencode(state, payload.inviteId)
    compact.string.preencode(state, payload.fromProfileId)
    compact.string.preencode(state, payload.toProfileId)
    compact.string.preencode(state, payload.recipientEncryptionPublicKey)
    compact.string.preencode(state, payload.channelPublicKey)
    compact.string.preencode(state, payload.channelDiscoveryKey)
    compact.bool.preencode(state, payload.expiresAt !== undefined)
    if (payload.expiresAt !== undefined) {
      compact.uint.preencode(state, payload.expiresAt)
    }
    compact.string.preencode(state, payload.requestId || '')
    compact.string.preencode(state, payload.sealedPayload)
  },
  encode(state, payload) {
    compact.string.encode(state, payload.inviteId)
    compact.string.encode(state, payload.fromProfileId)
    compact.string.encode(state, payload.toProfileId)
    compact.string.encode(state, payload.recipientEncryptionPublicKey)
    compact.string.encode(state, payload.channelPublicKey)
    compact.string.encode(state, payload.channelDiscoveryKey)
    compact.bool.encode(state, payload.expiresAt !== undefined)
    if (payload.expiresAt !== undefined) {
      compact.uint.encode(state, payload.expiresAt)
    }
    compact.string.encode(state, payload.requestId || '')
    compact.string.encode(state, payload.sealedPayload)
  },
  decode(state) {
    const inviteId = compact.string.decode(state)
    const fromProfileId = compact.string.decode(state)
    const toProfileId = compact.string.decode(state)
    const recipientEncryptionPublicKey = compact.string.decode(state)
    const channelPublicKey = compact.string.decode(state)
    const channelDiscoveryKey = compact.string.decode(state)
    const hasExpiresAt = compact.bool.decode(state)
    return {
      inviteId,
      fromProfileId,
      toProfileId,
      recipientEncryptionPublicKey,
      channelPublicKey,
      channelDiscoveryKey,
      expiresAt: hasExpiresAt ? compact.uint.decode(state) : undefined,
      requestId: compact.string.decode(state) || undefined,
      sealedPayload: compact.string.decode(state)
    }
  }
}

export function createDmEncryptionKeyPair(): DmEncryptionKeyPair {
  const publicKey = b4a.alloc(sodium.crypto_box_PUBLICKEYBYTES)
  const secretKey = b4a.alloc(sodium.crypto_box_SECRETKEYBYTES)

  sodium.crypto_box_keypair(publicKey, secretKey)

  return {
    publicKey: b4a.toString(publicKey, 'hex'),
    secretKey: b4a.toString(secretKey, 'hex')
  }
}

export function createDmInvite({
  channelDiscoveryKey,
  channelPublicKey,
  createdAt = Date.now(),
  expiresAt,
  fromIdentity,
  inviteId,
  payload,
  recipientEncryptionPublicKey,
  requestId,
  toProfileId
}: {
  channelDiscoveryKey: string
  channelPublicKey: string
  createdAt?: number
  expiresAt?: number
  fromIdentity: SigningIdentity
  inviteId: string
  payload?: DmInvitePayload
  recipientEncryptionPublicKey: string
  requestId?: string
  toProfileId: string
}): DmInvite {
  const sealedPayload = sealPayload(payload, recipientEncryptionPublicKey)
  const cleanPayload = cleanDmInvitePayload({
    channelDiscoveryKey,
    channelPublicKey,
    expiresAt,
    fromProfileId: fromIdentity?.publicKey,
    inviteId,
    recipientEncryptionPublicKey,
    requestId,
    sealedPayload,
    toProfileId
  })
  const signed = createSignedRecord({
    createdAt,
    identity: fromIdentity,
    payload: cleanPayload,
    payloadEncoding: dmInvitePayloadEncoding,
    type: DM_INVITE_TYPE,
    version: DM_INVITE_VERSION
  })

  return {
    type: DM_INVITE_TYPE,
    ...cleanPayload,
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

export function verifyDmInvite(invite: unknown): invite is DmInvite {
  try {
    const value = asRecord(invite)
    const payload = cleanDmInvitePayload(value)
    const proof = asRecord(value.proof)

    if (
      value.type !== DM_INVITE_TYPE ||
      proof.type !== DM_INVITE_TYPE ||
      proof.version !== DM_INVITE_VERSION ||
      proof.createdAt !== value.createdAt ||
      proof.signerProfileId !== payload.fromProfileId
    ) {
      return false
    }

    return verifySignedRecord({
      payloadEncoding: dmInvitePayloadEncoding,
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

export function openDmInvite({
  invite,
  now = Date.now(),
  recipientEncryptionKeyPair
}: {
  invite: DmInvite
  now?: number
  recipientEncryptionKeyPair: DmEncryptionKeyPair
}): DmInvitePayload {
  if (!verifyDmInvite(invite)) {
    throw new Error('Invalid DM invite')
  }

  if (isDmInviteExpired(invite, now)) {
    throw new Error('Expired DM invite')
  }

  const publicKey = cleanHex32(
    recipientEncryptionKeyPair?.publicKey,
    'Recipient encryption public key is required'
  )
  const secretKey = cleanHex32(
    recipientEncryptionKeyPair?.secretKey,
    'Recipient encryption secret key is required'
  )

  if (publicKey !== invite.recipientEncryptionPublicKey) {
    throw new Error('Unable to open DM invite')
  }

  const sealed = b4a.from(cleanHex(invite.sealedPayload, 'Sealed payload is required'), 'hex')

  if (sealed.byteLength <= sodium.crypto_box_SEALBYTES) {
    throw new Error('Unable to open DM invite')
  }

  const opened = b4a.alloc(sealed.byteLength - sodium.crypto_box_SEALBYTES)
  const ok = sodium.crypto_box_seal_open(
    opened,
    sealed,
    b4a.from(publicKey, 'hex'),
    b4a.from(secretKey, 'hex')
  )

  if (!ok) {
    throw new Error('Unable to open DM invite')
  }

  return JSON.parse(b4a.toString(opened))
}

export function isDmInviteExpired(invite: unknown, now = Date.now()): boolean {
  const expiresAt = asRecord(invite).expiresAt
  return typeof expiresAt === 'number' && expiresAt <= now
}

function sealPayload(
  payload: DmInvitePayload | undefined,
  recipientEncryptionPublicKey: string
): string {
  const publicKey = b4a.from(
    cleanHex32(recipientEncryptionPublicKey, 'Recipient encryption public key is required'),
    'hex'
  )
  const message = b4a.from(JSON.stringify(payload || {}))
  const sealed = b4a.alloc(message.byteLength + sodium.crypto_box_SEALBYTES)

  sodium.crypto_box_seal(sealed, message, publicKey)

  return b4a.toString(sealed, 'hex')
}

function cleanDmInvitePayload(payload: Record<string, unknown> = {}): DmInviteSignedPayload {
  return {
    inviteId: cleanString(payload.inviteId, 'Invite id is required'),
    fromProfileId: cleanHex32(payload.fromProfileId, 'Sender profile id is required'),
    toProfileId: cleanHex32(payload.toProfileId, 'Recipient profile id is required'),
    recipientEncryptionPublicKey: cleanHex32(
      payload.recipientEncryptionPublicKey,
      'Recipient encryption public key is required'
    ),
    channelPublicKey: cleanHex32(payload.channelPublicKey, 'Channel public key is required'),
    channelDiscoveryKey: cleanHex32(
      payload.channelDiscoveryKey,
      'Channel discovery key is required'
    ),
    expiresAt: cleanOptionalTimestamp(payload.expiresAt),
    requestId: cleanOptionalString(payload.requestId),
    sealedPayload: cleanHex(payload.sealedPayload, 'Sealed payload is required')
  }
}

function cleanOptionalTimestamp(value: unknown): number | undefined {
  if (value === undefined || value === null) {
    return undefined
  }

  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new Error('Invalid expiration timestamp')
  }

  return value
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') {
    throw new Error('Expected object')
  }

  return value as Record<string, unknown>
}

function cleanHex32(value: unknown, message: string): string {
  const hex = cleanHex(value, message)

  if (!HEX_32.test(hex)) {
    throw new Error(message)
  }

  return hex
}

function cleanHex(value: unknown, message: string): string {
  const cleaned = cleanString(value, message).toLowerCase()

  if (!HEX.test(cleaned) || cleaned.length % 2 !== 0) {
    throw new Error(message)
  }

  return cleaned
}

function cleanString(value: unknown, message: string): string {
  const cleaned = typeof value === 'string' ? value.trim() : ''

  if (!cleaned) {
    throw new Error(message)
  }

  return cleaned
}

function cleanOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value.trim() || undefined : undefined
}
