import compact from 'compact-encoding'
import { isAvatarMediaReference, type AvatarMediaReference } from './avatar-media.ts'
import { isHomePolicy } from './home-room.ts'
import type { MessageRequest } from './message-request.ts'
import { createSignedRecord, verifySignedRecord } from './signed-record.ts'
import type { PayloadEncoding, SignedRecord, SigningIdentity } from './signed-record.ts'

const TRUST_INVITE = 'kepos.trust.invite.v1'
const TRUST_INVITE_WITH_AVATAR_MEDIA = 'kepos.trust.invite.v2'
const HOME_ADDRESS = 'kepos.home.address.v1'
const MESSAGE_REQUEST = 'kepos.message.request.v1'
const PROFILE_ROUTE = 'profile'
const HOME_ROUTE = 'home'
const MESSAGE_REQUEST_ROUTE = 'message-request'
const QR_VERSION = '1'
const RECORD_VERSION = 1
const KEY_PATTERN = /^[0-9a-f]{64}$/

type SignedProof = {
  createdAt: number
  signature: string
  signerProfileId: string
  type: string
  version: number
}

type TrustInvitePayload = {
  avatarMedia?: AvatarMediaReference
  avatarUri?: string
  displayName: string
  expiresAt: number | null
  identityPublicKey: string
  profileId: string
}

type HomeAddressPayload = {
  address: string
  expiresAt: number | null
  ownerProfileId: string
  policy: 'public' | 'trusted_only'
  roomKey: string
}

type VerifyOptions = {
  now?: number
}

export type SignedTrustInvitePayload = TrustInvitePayload & {
  createdAt: number
  homeDescriptor?: SignedHomeAddressPayload
  proof: SignedProof
  type: typeof TRUST_INVITE | typeof TRUST_INVITE_WITH_AVATAR_MEDIA
}

export type SignedHomeAddressPayload = HomeAddressPayload & {
  createdAt: number
  proof: SignedProof
  type: typeof HOME_ADDRESS
}

export type SignedQrPayload = SignedTrustInvitePayload | SignedHomeAddressPayload | MessageRequest

const trustInvitePayloadEncoding: PayloadEncoding<TrustInvitePayload> = {
  preencode(state, payload) {
    compact.string.preencode(state, payload.profileId)
    compact.string.preencode(state, payload.identityPublicKey)
    compact.string.preencode(state, payload.displayName)
    compact.bool.preencode(state, Boolean(payload.avatarUri))
    if (payload.avatarUri) {
      compact.string.preencode(state, payload.avatarUri)
    }
    compact.bool.preencode(state, payload.expiresAt !== null)
    if (payload.expiresAt !== null) {
      compact.uint.preencode(state, payload.expiresAt)
    }
  },
  encode(state, payload) {
    compact.string.encode(state, payload.profileId)
    compact.string.encode(state, payload.identityPublicKey)
    compact.string.encode(state, payload.displayName)
    compact.bool.encode(state, Boolean(payload.avatarUri))
    if (payload.avatarUri) {
      compact.string.encode(state, payload.avatarUri)
    }
    compact.bool.encode(state, payload.expiresAt !== null)
    if (payload.expiresAt !== null) {
      compact.uint.encode(state, payload.expiresAt)
    }
  },
  decode(state) {
    const profileId = compact.string.decode(state)
    const identityPublicKey = compact.string.decode(state)
    const displayName = compact.string.decode(state)
    const hasAvatarUri = compact.bool.decode(state)
    const avatarUri = hasAvatarUri ? compact.string.decode(state) : undefined
    const hasExpiresAt = compact.bool.decode(state)

    return {
      profileId,
      identityPublicKey,
      displayName,
      ...(avatarUri ? { avatarUri } : {}),
      expiresAt: hasExpiresAt ? compact.uint.decode(state) : null
    }
  }
}

const homeAddressPayloadEncoding: PayloadEncoding<HomeAddressPayload> = {
  preencode(state, payload) {
    compact.string.preencode(state, payload.ownerProfileId)
    compact.string.preencode(state, payload.address)
    compact.string.preencode(state, payload.roomKey)
    compact.string.preencode(state, payload.policy)
    compact.bool.preencode(state, payload.expiresAt !== null)
    if (payload.expiresAt !== null) {
      compact.uint.preencode(state, payload.expiresAt)
    }
  },
  encode(state, payload) {
    compact.string.encode(state, payload.ownerProfileId)
    compact.string.encode(state, payload.address)
    compact.string.encode(state, payload.roomKey)
    compact.string.encode(state, payload.policy)
    compact.bool.encode(state, payload.expiresAt !== null)
    if (payload.expiresAt !== null) {
      compact.uint.encode(state, payload.expiresAt)
    }
  },
  decode(state) {
    const ownerProfileId = compact.string.decode(state)
    const address = compact.string.decode(state)
    const roomKey = compact.string.decode(state)
    const policy = cleanHomePolicy(compact.string.decode(state))
    const hasExpiresAt = compact.bool.decode(state)

    return {
      ownerProfileId,
      address,
      roomKey,
      policy,
      expiresAt: hasExpiresAt ? compact.uint.decode(state) : null
    }
  }
}

const trustInviteWithAvatarMediaPayloadEncoding: PayloadEncoding<TrustInvitePayload> = {
  preencode(state, payload) {
    trustInvitePayloadEncoding.preencode(state, payload)
    encodeAvatarMediaReference.preencode(state, payload.avatarMedia)
  },
  encode(state, payload) {
    trustInvitePayloadEncoding.encode(state, payload)
    encodeAvatarMediaReference.encode(state, payload.avatarMedia)
  },
  decode(state) {
    return {
      ...trustInvitePayloadEncoding.decode(state),
      ...dropEmptyAvatarMedia(encodeAvatarMediaReference.decode(state))
    }
  }
}

const encodeAvatarMediaReference: PayloadEncoding<AvatarMediaReference | undefined> = {
  preencode(state, reference) {
    compact.bool.preencode(state, Boolean(reference))
    if (!reference) return

    compact.string.preencode(state, reference.type)
    compact.string.preencode(state, reference.digestAlgorithm)
    compact.string.preencode(state, reference.digest)
    compact.string.preencode(state, reference.mimeType)
    compact.string.preencode(state, reference.uri)
    compact.uint.preencode(state, reference.byteLength)
    compact.uint.preencode(state, reference.createdAt)
  },
  encode(state, reference) {
    compact.bool.encode(state, Boolean(reference))
    if (!reference) return

    compact.string.encode(state, reference.type)
    compact.string.encode(state, reference.digestAlgorithm)
    compact.string.encode(state, reference.digest)
    compact.string.encode(state, reference.mimeType)
    compact.string.encode(state, reference.uri)
    compact.uint.encode(state, reference.byteLength)
    compact.uint.encode(state, reference.createdAt)
  },
  decode(state) {
    const hasAvatarMedia = compact.bool.decode(state)
    if (!hasAvatarMedia) return undefined

    return cleanAvatarMediaReference({
      type: compact.string.decode(state),
      digestAlgorithm: compact.string.decode(state),
      digest: compact.string.decode(state),
      mimeType: compact.string.decode(state),
      uri: compact.string.decode(state),
      byteLength: compact.uint.decode(state),
      createdAt: compact.uint.decode(state)
    })
  }
}

export function createSignedTrustInvitePayload({
  avatarMedia = null,
  avatarUri = '',
  createdAt = Date.now(),
  displayName,
  expiresAt = null,
  homeDescriptor = null,
  identity
}: {
  avatarMedia?: AvatarMediaReference | null
  avatarUri?: string | null
  createdAt?: number
  displayName: string
  expiresAt?: number | null
  homeDescriptor?: SignedHomeAddressPayload | null
  identity: SigningIdentity
}): SignedTrustInvitePayload {
  const payload = cleanTrustInvitePayload({
    avatarMedia,
    avatarUri,
    displayName,
    expiresAt,
    identityPublicKey: identity?.publicKey,
    profileId: identity?.publicKey
  })
  const type = payload.avatarMedia ? TRUST_INVITE_WITH_AVATAR_MEDIA : TRUST_INVITE
  const signed = createSignedRecord({
    createdAt,
    identity,
    payload,
    payloadEncoding: payloadEncodingForTrustInviteType(type),
    type,
    version: RECORD_VERSION
  })

  return {
    type,
    ...payload,
    ...(homeDescriptor ? { homeDescriptor } : {}),
    createdAt,
    proof: proofFromSignedRecord(signed)
  }
}

export function verifySignedTrustInvitePayload(
  payload: unknown,
  { now = Date.now() }: VerifyOptions = {}
): payload is SignedTrustInvitePayload {
  try {
    const value = asRecord(payload)
    const cleanPayload = cleanTrustInvitePayload(value)

    if (isExpired(cleanPayload.expiresAt, now)) {
      return false
    }

    const type = cleanTrustInviteType(value.type)
    if (!hasMatchingProof(value, type, cleanPayload.profileId)) {
      return false
    }

    if (
      !verifySignedRecord({
        payloadEncoding: payloadEncodingForTrustInviteType(type),
        record: recordFromPayload({ payload: value, signedPayload: cleanPayload })
      })
    ) {
      return false
    }

    return verifyProfileHomeDescriptor(value.homeDescriptor, cleanPayload.profileId, { now })
  } catch {
    return false
  }
}

export function createSignedHomeAddressPayload({
  address,
  createdAt = Date.now(),
  expiresAt = null,
  identity,
  policy = 'trusted_only',
  roomKey
}: {
  address: string
  createdAt?: number
  expiresAt?: number | null
  identity: SigningIdentity
  policy?: 'public' | 'trusted_only'
  roomKey: string
}): SignedHomeAddressPayload {
  const payload = cleanHomeAddressPayload({
    address,
    expiresAt,
    ownerProfileId: identity?.publicKey,
    policy,
    roomKey
  })
  const signed = createSignedRecord({
    createdAt,
    identity,
    payload,
    payloadEncoding: homeAddressPayloadEncoding,
    type: HOME_ADDRESS,
    version: RECORD_VERSION
  })

  return {
    type: HOME_ADDRESS,
    ...payload,
    createdAt,
    proof: proofFromSignedRecord(signed)
  }
}

export function verifySignedHomeAddressPayload(
  payload: unknown,
  { now = Date.now() }: VerifyOptions = {}
): payload is SignedHomeAddressPayload {
  try {
    const value = asRecord(payload)
    const cleanPayload = cleanHomeAddressPayload(value)

    if (isExpired(cleanPayload.expiresAt, now)) {
      return false
    }

    if (!hasMatchingProof(value, HOME_ADDRESS, cleanPayload.ownerProfileId)) {
      return false
    }

    return verifySignedRecord({
      payloadEncoding: homeAddressPayloadEncoding,
      record: recordFromPayload({ payload: value, signedPayload: cleanPayload })
    })
  } catch {
    return false
  }
}

export function encodeQrUri(payload: SignedQrPayload): string {
  const route = routeForPayload(payload)
  const encodedPayload = encodeURIComponent(JSON.stringify(payload))

  return `kepos://${route}?v=${QR_VERSION}&payload=${encodedPayload}`
}

export function decodeQrUri(uri: string): SignedQrPayload {
  try {
    const parsed = new URL(uri)

    if (parsed.protocol !== 'kepos:' || parsed.searchParams.get('v') !== QR_VERSION) {
      throw new Error('Invalid QR URI')
    }

    const payload = JSON.parse(decodeURIComponent(parsed.searchParams.get('payload') || ''))
    const route = routeForPayload(payload)

    if (parsed.hostname !== route) {
      throw new Error('Invalid QR route')
    }

    return payload
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Invalid')) {
      throw error
    }

    throw new Error('Invalid QR URI')
  }
}

function proofFromSignedRecord<TPayload>(record: SignedRecord<TPayload>): SignedProof {
  return {
    createdAt: record.createdAt,
    signature: record.signature,
    signerProfileId: record.signerProfileId,
    type: record.type,
    version: record.version
  }
}

function recordFromPayload<TPayload>({
  payload,
  signedPayload
}: {
  payload: Record<string, unknown>
  signedPayload: TPayload
}): SignedRecord<TPayload> {
  const proof = asRecord(payload.proof)

  return {
    createdAt: cleanTimestamp(payload.createdAt),
    payload: signedPayload,
    signature: cleanString(proof.signature, 'Signature is required'),
    signerProfileId: cleanString(proof.signerProfileId, 'Signer profile id is required'),
    type: cleanString(proof.type, 'Signed record type is required'),
    version: cleanVersion(proof.version)
  }
}

function hasMatchingProof(
  payload: Record<string, unknown>,
  type: string,
  signerProfileId: string
): boolean {
  const proof = payload.proof

  return (
    payload.type === type &&
    !!proof &&
    typeof proof === 'object' &&
    (proof as Record<string, unknown>).type === type &&
    (proof as Record<string, unknown>).version === RECORD_VERSION &&
    (proof as Record<string, unknown>).createdAt === payload.createdAt &&
    (proof as Record<string, unknown>).signerProfileId === signerProfileId
  )
}

function routeForPayload(
  payload: unknown
): typeof PROFILE_ROUTE | typeof HOME_ROUTE | typeof MESSAGE_REQUEST_ROUTE {
  const value = asRecord(payload)

  if (value.type === TRUST_INVITE) {
    return PROFILE_ROUTE
  }

  if (value.type === TRUST_INVITE_WITH_AVATAR_MEDIA) {
    return PROFILE_ROUTE
  }

  if (value.type === HOME_ADDRESS) {
    return HOME_ROUTE
  }

  if (value.type === MESSAGE_REQUEST) {
    return MESSAGE_REQUEST_ROUTE
  }

  throw new Error('Invalid QR payload')
}

function cleanTrustInvitePayload(payload: Record<string, unknown> = {}): TrustInvitePayload {
  const profileId = cleanKey(payload.profileId, 'Profile id is required')
  const identityPublicKey = cleanKey(payload.identityPublicKey, 'Identity public key is required')

  if (profileId !== identityPublicKey) {
    throw new Error('Invalid trust invite identity')
  }

  return {
    ...dropEmptyAvatarMedia(cleanAvatarMediaReference(payload.avatarMedia)),
    ...dropEmptyString({ avatarUri: cleanOptionalString(payload.avatarUri) }),
    displayName: cleanString(payload.displayName, 'Display name is required'),
    expiresAt: cleanOptionalTimestamp(payload.expiresAt),
    identityPublicKey,
    profileId
  }
}

function cleanTrustInviteType(
  value: unknown
): typeof TRUST_INVITE | typeof TRUST_INVITE_WITH_AVATAR_MEDIA {
  if (value === TRUST_INVITE || value === TRUST_INVITE_WITH_AVATAR_MEDIA) {
    return value
  }

  throw new Error('Invalid signed profile QR type')
}

function payloadEncodingForTrustInviteType(
  type: typeof TRUST_INVITE | typeof TRUST_INVITE_WITH_AVATAR_MEDIA
): PayloadEncoding<TrustInvitePayload> {
  return type === TRUST_INVITE_WITH_AVATAR_MEDIA
    ? trustInviteWithAvatarMediaPayloadEncoding
    : trustInvitePayloadEncoding
}

function cleanAvatarMediaReference(value: unknown): AvatarMediaReference | undefined {
  if (value === undefined || value === null) {
    return undefined
  }

  if (!isAvatarMediaReference(value)) {
    throw new Error('Invalid avatar media reference')
  }

  const reference = value as AvatarMediaReference
  return {
    byteLength: reference.byteLength,
    createdAt: reference.createdAt,
    digest: reference.digest,
    digestAlgorithm: reference.digestAlgorithm,
    mimeType: reference.mimeType,
    type: reference.type,
    uri: reference.uri
  }
}

function dropEmptyAvatarMedia(value: AvatarMediaReference | undefined): {
  avatarMedia?: AvatarMediaReference
} {
  return value ? { avatarMedia: value } : {}
}

function cleanHomeAddressPayload(payload: Record<string, unknown> = {}): HomeAddressPayload {
  const policy = cleanHomePolicy(payload.policy || 'trusted_only')

  return {
    address: cleanKey(payload.address, 'Home address is required'),
    expiresAt: cleanOptionalTimestamp(payload.expiresAt),
    ownerProfileId: cleanKey(payload.ownerProfileId, 'Home owner profile id is required'),
    policy,
    roomKey: cleanKey(payload.roomKey, 'Home room key is required')
  }
}

function verifyProfileHomeDescriptor(
  value: unknown,
  profileId: string,
  options: VerifyOptions
): boolean {
  if (value === undefined || value === null) {
    return true
  }

  if (!verifySignedHomeAddressPayload(value, options)) {
    return false
  }

  return (value as SignedHomeAddressPayload).ownerProfileId === profileId
}

function cleanHomePolicy(value: unknown): 'public' | 'trusted_only' {
  if (!isHomePolicy(value)) {
    throw new Error('Invalid home policy')
  }

  return value as 'public' | 'trusted_only'
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') {
    throw new Error('Expected object')
  }

  return value as Record<string, unknown>
}

function cleanKey(value: unknown, message: string): string {
  const cleaned = cleanString(value, message)

  if (!KEY_PATTERN.test(cleaned)) {
    throw new Error('Invalid key')
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

function dropEmptyString(value: Record<string, string | undefined>): Record<string, string> {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => Boolean(entry))) as Record<
    string,
    string
  >
}

function cleanTimestamp(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error('Invalid timestamp')
  }

  return value as number
}

function cleanOptionalTimestamp(value: unknown): number | null {
  if (value === undefined || value === null) {
    return null
  }

  return cleanTimestamp(value)
}

function isExpired(expiresAt: number | null, now: number): boolean {
  if (expiresAt === null) {
    return false
  }

  return cleanTimestamp(now) >= expiresAt
}

function cleanVersion(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    throw new Error('Invalid signed record version')
  }

  return value as number
}
