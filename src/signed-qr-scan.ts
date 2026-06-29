import { isContactTrusted, trustContact } from './contact-book.ts'
import type { ContactBook } from './contact-book.ts'
import {
  decodeQrUri,
  verifySignedHomeAddressPayload,
  verifySignedTrustInvitePayload
} from './signed-qr-payload.ts'
import { applyTrustGrantToContactBook, createTrustGrant } from './trust-grant.ts'
import type { SigningIdentity } from './signed-record.ts'

export function applySignedQrUriToContactBook({
  alias,
  book,
  localIdentity = null,
  localProfileId = book?.ownerProfileId,
  now = Date.now(),
  source = 'profile_qr',
  uri
}: {
  alias?: string
  book: ContactBook
  localIdentity?: SigningIdentity | null
  localProfileId?: string
  now?: number
  source?: string
  uri: string
}):
  | {
      book: ContactBook
      kind: 'trust'
      profileId: string
    }
  | {
      address: string
      book: ContactBook
      canEnter: boolean
      kind: 'home'
      ownerProfileId: string
      policy: 'public' | 'trusted_only'
      roomKey: string
    } {
  const payload = decodeQrUri(uri)

  if (payload.type === 'kepos.trust.invite.v1') {
    if (!verifySignedTrustInvitePayload(payload, { now })) {
      throw new Error('Invalid signed profile QR')
    }

    if (localIdentity) {
      const grant = createTrustGrant({
        createdAt: now,
        ownerIdentity: localIdentity,
        trustedProfileId: payload.profileId
      })
      const nextBook = applyTrustGrantToContactBook(book, {
        alias: alias?.trim() || payload.displayName,
        displayNameSnapshot: payload.displayName,
        grant,
        source
      })

      return {
        book: nextBook,
        kind: 'trust',
        profileId: payload.profileId
      }
    }

    const nextBook = trustContact(book, {
      alias: alias?.trim() || payload.displayName,
      displayNameSnapshot: payload.displayName,
      profileId: payload.profileId,
      source,
      trustedAt: payload.createdAt
    })

    return {
      book: nextBook,
      kind: 'trust',
      profileId: payload.profileId
    }
  }

  if (payload.type === 'kepos.home.address.v1') {
    if (!verifySignedHomeAddressPayload(payload, { now })) {
      throw new Error('Invalid signed home QR')
    }

    return {
      address: payload.address,
      book,
      canEnter: canEnterHomeFromLocalContactBook({
        book,
        localProfileId,
        ownerProfileId: payload.ownerProfileId,
        policy: payload.policy
      }),
      kind: 'home',
      ownerProfileId: payload.ownerProfileId,
      policy: payload.policy,
      roomKey: payload.roomKey
    }
  }

  throw new Error('Unsupported signed QR payload')
}

function canEnterHomeFromLocalContactBook({
  book,
  localProfileId,
  ownerProfileId,
  policy
}: {
  book: ContactBook
  localProfileId?: string
  ownerProfileId: string
  policy: 'public' | 'trusted_only'
}): boolean {
  if (policy === 'public' || localProfileId === ownerProfileId) {
    return true
  }

  return isContactTrusted(book, ownerProfileId)
}
