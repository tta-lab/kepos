import compact from 'compact-encoding'
import { trustContact } from './contact-book.ts'
import type { ContactBook } from './contact-book.ts'
import type { AvatarMediaReference } from './avatar-media.ts'
import { createSignedRecord, verifySignedRecord } from './signed-record.ts'
import type { PayloadEncoding, SigningIdentity } from './signed-record.ts'

const TRUST_GRANT_TYPE = 'kepos.trust.grant.v1'
const TRUST_GRANT_VERSION = 1
const TRUST_SCOPE_HOME = 'home'
const KEY_PATTERN = /^[0-9a-f]{64}$/

type TrustGrantPayload = {
  ownerProfileId: string
  revokedAt: number | null
  scope: typeof TRUST_SCOPE_HOME
  trustedProfileId: string
}

type SignedProof = {
  createdAt: number
  signature: string
  signerProfileId: string
  type: string
  version: number
}

export type TrustGrant = TrustGrantPayload & {
  createdAt: number
  proof: SignedProof
}

const trustGrantPayloadEncoding: PayloadEncoding<TrustGrantPayload> = {
  preencode(state, payload) {
    compact.string.preencode(state, payload.ownerProfileId)
    compact.string.preencode(state, payload.trustedProfileId)
    compact.string.preencode(state, payload.scope)
    compact.bool.preencode(state, payload.revokedAt !== null)
    if (payload.revokedAt !== null) {
      compact.uint.preencode(state, payload.revokedAt)
    }
  },
  encode(state, payload) {
    compact.string.encode(state, payload.ownerProfileId)
    compact.string.encode(state, payload.trustedProfileId)
    compact.string.encode(state, payload.scope)
    compact.bool.encode(state, payload.revokedAt !== null)
    if (payload.revokedAt !== null) {
      compact.uint.encode(state, payload.revokedAt)
    }
  },
  decode(state) {
    const ownerProfileId = compact.string.decode(state)
    const trustedProfileId = compact.string.decode(state)
    const scope = compact.string.decode(state)
    const hasRevokedAt = compact.bool.decode(state)

    return {
      ownerProfileId,
      revokedAt: hasRevokedAt ? compact.uint.decode(state) : null,
      scope: cleanScope(scope),
      trustedProfileId
    }
  }
}

export function createTrustGrant({
  createdAt = Date.now(),
  ownerIdentity,
  revokedAt = null,
  trustedProfileId
}: {
  createdAt?: number
  ownerIdentity: SigningIdentity
  revokedAt?: number | null
  trustedProfileId: string
}): TrustGrant {
  const payload = cleanTrustGrantPayload({
    ownerProfileId: ownerIdentity?.publicKey,
    revokedAt,
    scope: TRUST_SCOPE_HOME,
    trustedProfileId
  })
  const signed = createSignedRecord({
    createdAt,
    identity: ownerIdentity,
    payload,
    payloadEncoding: trustGrantPayloadEncoding,
    type: TRUST_GRANT_TYPE,
    version: TRUST_GRANT_VERSION
  })

  return {
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

export function verifyTrustGrant(grant: unknown): grant is TrustGrant {
  try {
    const value = asRecord(grant)
    const proof = asRecord(value.proof)
    const payload = cleanTrustGrantPayload({
      ownerProfileId: value.ownerProfileId,
      revokedAt: value.revokedAt ?? null,
      scope: value.scope,
      trustedProfileId: value.trustedProfileId
    })

    if (
      proof.type !== TRUST_GRANT_TYPE ||
      proof.version !== TRUST_GRANT_VERSION ||
      proof.signerProfileId !== payload.ownerProfileId ||
      proof.createdAt !== value.createdAt
    ) {
      return false
    }

    return verifySignedRecord({
      payloadEncoding: trustGrantPayloadEncoding,
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

export function applyTrustGrantToContactBook(
  book: ContactBook,
  {
    alias,
    avatarMediaSnapshot,
    avatarUriSnapshot,
    displayNameSnapshot,
    grant,
    homeAddress,
    homePolicy,
    source
  }: {
    alias?: string
    avatarMediaSnapshot?: AvatarMediaReference
    avatarUriSnapshot?: string
    displayNameSnapshot?: string
    grant: TrustGrant
    homeAddress?: string
    homePolicy?: string
    source?: string
  }
) {
  if (!verifyTrustGrant(grant) || grant.ownerProfileId !== book?.ownerProfileId) {
    throw new Error('Invalid trust grant')
  }

  return trustContact(book, {
    alias,
    avatarMediaSnapshot,
    avatarUriSnapshot,
    displayNameSnapshot,
    homeAddress,
    homePolicy,
    profileId: grant.trustedProfileId,
    proof: grant.proof,
    source,
    trustedAt: grant.createdAt
  })
}

function cleanTrustGrantPayload({
  ownerProfileId,
  revokedAt,
  scope,
  trustedProfileId
}: Record<string, unknown>): TrustGrantPayload {
  return {
    ownerProfileId: cleanKey(ownerProfileId, 'Owner profile id is required'),
    revokedAt: cleanOptionalTimestamp(revokedAt),
    scope: cleanScope(scope),
    trustedProfileId: cleanKey(trustedProfileId, 'Trusted profile id is required')
  }
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
    throw new Error('Invalid profile id')
  }

  return cleaned
}

function cleanScope(value: unknown): typeof TRUST_SCOPE_HOME {
  if (value !== TRUST_SCOPE_HOME) {
    throw new Error('Invalid trust scope')
  }

  return value
}

function cleanString(value: unknown, message: string): string {
  const cleaned = typeof value === 'string' ? value.trim() : ''

  if (!cleaned) {
    throw new Error(message)
  }

  return cleaned
}

function cleanOptionalTimestamp(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null
  }

  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error('Invalid revoke timestamp')
  }

  return value as number
}
