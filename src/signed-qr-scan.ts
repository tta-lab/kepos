import {
  getContact,
  isContactTrusted,
  recordContactHomeDescriptor,
  trustContact
} from './contact-book.ts'
import type { ContactBook } from './contact-book.ts'
import type { AvatarMediaReference } from './avatar-media.ts'
import {
  decodeQrUri,
  verifySignedHomeAddressPayload,
  verifySignedTrustInvitePayload
} from './signed-qr-payload.ts'
import { applyTrustGrantToContactBook, createTrustGrant } from './trust-grant.ts'
import type { SigningIdentity } from './signed-record.ts'

export function readSignedProfileQrRequestTarget({
  now = Date.now(),
  uri
}: {
  now?: number
  uri: string
}): {
  avatarMediaSnapshot?: AvatarMediaReference
  avatarUri?: string
  createdAt: number
  displayName: string
  kind: 'profile_request_target'
  profileId: string
} {
  const payload = decodeQrUri(uri)

  if (!isSignedProfileQrType(payload.type)) {
    throw new Error('Profile QR is required.')
  }

  if (!verifySignedTrustInvitePayload(payload, { now })) {
    throw new Error('Invalid signed profile QR')
  }

  return {
    ...(payload.avatarMedia ? { avatarMediaSnapshot: payload.avatarMedia } : {}),
    ...(payload.avatarUri ? { avatarUri: payload.avatarUri } : {}),
    createdAt: payload.createdAt,
    displayName: payload.displayName,
    kind: 'profile_request_target',
    profileId: payload.profileId
  }
}

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
  const localAlias = alias?.trim() || undefined

  if (isSignedProfileQrType(payload.type)) {
    if (!verifySignedTrustInvitePayload(payload, { now })) {
      throw new Error('Invalid signed profile QR')
    }

    if (localIdentity) {
      const grant = createTrustGrant({
        createdAt: now,
        ownerIdentity: localIdentity,
        trustedProfileId: payload.profileId
      })
      const trustedBook = applyTrustGrantToContactBook(book, {
        alias: localAlias,
        avatarMediaSnapshot: payload.avatarMedia,
        avatarUriSnapshot: payload.avatarUri,
        displayNameSnapshot: payload.displayName,
        grant,
        source
      })

      return {
        book: trustedBook,
        kind: 'trust',
        profileId: payload.profileId
      }
    }

    const trustedBook = trustContact(book, {
      alias: localAlias,
      avatarMediaSnapshot: payload.avatarMedia,
      avatarUriSnapshot: payload.avatarUri,
      displayNameSnapshot: payload.displayName,
      profileId: payload.profileId,
      source,
      trustedAt: payload.createdAt
    })

    return {
      book: trustedBook,
      kind: 'trust',
      profileId: payload.profileId
    }
  }

  if (payload.type === 'kepos.home.address.v1') {
    if (!verifySignedHomeAddressPayload(payload, { now })) {
      throw new Error('Invalid signed home QR')
    }
    const canEnter = canEnterHomeFromLocalContactBook({
      book,
      localProfileId,
      ownerProfileId: payload.ownerProfileId,
      policy: payload.policy
    })
    const nextBook =
      canEnter && isContactTrusted(book, payload.ownerProfileId)
        ? recordContactHomeDescriptor(book, {
            address: payload.address,
            expiresAt: payload.expiresAt,
            ownerProfileId: payload.ownerProfileId,
            policy: payload.policy,
            proof: payload.proof,
            roomKey: payload.roomKey
          })
        : book

    return {
      address: payload.address,
      book: nextBook,
      canEnter,
      kind: 'home',
      ownerProfileId: payload.ownerProfileId,
      policy: payload.policy,
      roomKey: payload.roomKey
    }
  }

  throw new Error('Unsupported signed QR payload')
}

export function readTrustedContactHomeDescriptor({
  book,
  now = Date.now(),
  profileId
}: {
  book: ContactBook
  now?: number
  profileId: string
}): {
  address: string
  ownerProfileId: string
  policy: 'public' | 'trusted_only'
  roomKey: string
} {
  const contact = getContact(book, profileId)
  if (!contact?.homeAddress || !contact.homeRoomKey || !contact.proof) {
    throw new Error('This contact does not have a saved Home descriptor yet.')
  }

  if (!isContactTrusted(book, contact.profileId)) {
    throw new Error('Trusted contact is required before entering a saved Home descriptor.')
  }

  const payload = {
    type: 'kepos.home.address.v1',
    address: contact.homeAddress,
    createdAt: (contact.proof as { createdAt?: unknown }).createdAt,
    expiresAt: contact.homeExpiresAt ?? null,
    ownerProfileId: contact.profileId,
    policy: contact.homePolicy || 'trusted_only',
    proof: contact.proof,
    roomKey: contact.homeRoomKey
  }

  if (!verifySignedHomeAddressPayload(payload, { now })) {
    throw new Error('Invalid saved Home descriptor.')
  }

  return {
    address: contact.homeAddress,
    ownerProfileId: contact.profileId,
    policy: payload.policy,
    roomKey: contact.homeRoomKey
  }
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

function isSignedProfileQrType(type: unknown): boolean {
  return type === 'kepos.trust.invite.v1' || type === 'kepos.trust.invite.v2'
}
