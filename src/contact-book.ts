import type { AvatarMediaReference } from './avatar-media.ts'
import {
  cleanProfileSnapshots,
  createProfileSnapshot,
  mergeProfileSnapshots,
  type ProfileSnapshot
} from './profile-snapshot.ts'

const TRUST_SCOPE_HOME = 'home'
const CONTACT_BOOK_VERSION = 1

export type ContactBookContact = {
  alias?: string
  aliases?: string[]
  avatarMediaSnapshot?: AvatarMediaReference
  avatarUriSnapshot?: string
  displayNameSnapshot?: string
  homeAddress?: string
  homeExpiresAt?: number
  homePolicy?: string
  homeRoomKey?: string
  profileId: string
  proof?: unknown
  profileSnapshots?: ProfileSnapshot[]
  requestIgnoredAt?: number
  revokedAt?: number
  source?: string
  trustedAt?: number
  trustScope?: typeof TRUST_SCOPE_HOME
}

export type MessageRequestContact = {
  alias?: string
  avatarMediaSnapshot?: AvatarMediaReference
  avatarUriSnapshot?: string
  deliveryState?: string
  displayNameSnapshot?: string
  homeAddress?: string
  homeExpiresAt?: number
  homePolicy?: string
  homeRoomKey?: string
  profileId: string
  proof?: unknown
  profileSnapshots?: ProfileSnapshot[]
  requestedAt?: number
  requestId?: string
  senderEncryptionPublicKey?: string
  source?: string
  text?: string
}

export type ContactBook = {
  contactsByProfileId: Map<string, ContactBookContact>
  ownerProfileId: string
  outgoingRequestsByProfileId: Map<string, MessageRequestContact>
  pendingRequestsByProfileId: Map<string, MessageRequestContact>
}

export type SerializedContactBook = {
  contacts: ContactBookContact[]
  ownerProfileId: string
  outgoingRequests?: MessageRequestContact[]
  pendingRequests: MessageRequestContact[]
  version: typeof CONTACT_BOOK_VERSION
}

type ContactPatch = Partial<ContactBookContact> & {
  profileId?: string
}

export function createContactBook({ ownerProfileId }: { ownerProfileId: string }): ContactBook {
  return {
    ownerProfileId: cleanRequiredString(ownerProfileId, 'Owner profile id is required'),
    contactsByProfileId: new Map(),
    outgoingRequestsByProfileId: new Map(),
    pendingRequestsByProfileId: new Map()
  }
}

export function serializeContactBook(book: ContactBook): SerializedContactBook {
  return {
    version: CONTACT_BOOK_VERSION,
    ownerProfileId: cleanRequiredString(book?.ownerProfileId, 'Owner profile id is required'),
    contacts: Array.from(book?.contactsByProfileId?.values() || []).map((contact) => ({
      ...contact,
      aliases: [...(contact.aliases || [])],
      ...withProfileSnapshots(contact.profileSnapshots)
    })),
    outgoingRequests: Array.from(book?.outgoingRequestsByProfileId?.values() || []).map(
      (request) => ({
        ...request,
        ...withProfileSnapshots(request.profileSnapshots)
      })
    ),
    pendingRequests: Array.from(book?.pendingRequestsByProfileId?.values() || []).map(
      (request) => ({
        ...request,
        ...withProfileSnapshots(request.profileSnapshots)
      })
    )
  }
}

export function deserializeContactBook(stored: SerializedContactBook | string): ContactBook {
  const value = typeof stored === 'string' ? JSON.parse(stored) : stored

  if (value?.version !== CONTACT_BOOK_VERSION) {
    throw new Error('Unsupported contact book version')
  }

  return {
    ownerProfileId: cleanRequiredString(value.ownerProfileId, 'Owner profile id is required'),
    contactsByProfileId: new Map(
      (value.contacts || []).map((contact: ContactBookContact) => [
        cleanRequiredString(contact.profileId, 'Contact profile id is required'),
        {
          ...contact,
          aliases: [...(contact.aliases || [])],
          ...withProfileSnapshots(contact.profileSnapshots)
        }
      ])
    ),
    outgoingRequestsByProfileId: new Map(
      (value.outgoingRequests || []).map((request: MessageRequestContact) => [
        cleanRequiredString(request.profileId, 'Contact profile id is required'),
        { ...request, ...withProfileSnapshots(request.profileSnapshots) }
      ])
    ),
    pendingRequestsByProfileId: new Map(
      (value.pendingRequests || []).map((request: MessageRequestContact) => [
        cleanRequiredString(request.profileId, 'Contact profile id is required'),
        { ...request, ...withProfileSnapshots(request.profileSnapshots) }
      ])
    )
  }
}

export function createTreeholePolicyFromContactBook(book: ContactBook): {
  ownerProfileId: string
  revokedProfileIds: string[]
  trustedProfileIds: string[]
} {
  const trustedProfileIds = []
  const revokedProfileIds = []

  for (const contact of book?.contactsByProfileId?.values() || []) {
    if (contact.revokedAt !== undefined && contact.revokedAt !== null) {
      revokedProfileIds.push(contact.profileId)
      continue
    }

    if (contact.trustedAt !== undefined && contact.trustedAt !== null) {
      trustedProfileIds.push(contact.profileId)
    }
  }

  return {
    ownerProfileId: cleanRequiredString(book?.ownerProfileId, 'Owner profile id is required'),
    revokedProfileIds,
    trustedProfileIds
  }
}

export function upsertContact(book: ContactBook, contact: ContactPatch): ContactBook {
  const cleanContact = cleanContactPatch(contact)
  const nextBook = cloneContactBook(book)
  const existing = nextBook.contactsByProfileId.get(cleanContact.profileId)
  const alias = cleanContact.alias || existing?.alias || cleanContact.displayNameSnapshot
  const aliases = mergeAliases(
    existing?.aliases,
    cleanContact.alias || (existing?.alias ? undefined : cleanContact.displayNameSnapshot)
  )
  const profileSnapshots = mergeProfileSnapshots(
    [...(existing?.profileSnapshots || []), ...(cleanContact.profileSnapshots || [])],
    createContactProfileSnapshotIfChanged(
      [...(existing?.profileSnapshots || []), ...(cleanContact.profileSnapshots || [])],
      cleanContact,
      cleanContact.trustedAt
    )
  )
  const nextContact = dropEmpty({
    ...existing,
    ...cleanContact,
    aliases,
    alias,
    ...withProfileSnapshots(profileSnapshots)
  }) as ContactBookContact

  if (cleanContact.trustedAt !== undefined) {
    delete nextContact.revokedAt
    delete nextContact.requestIgnoredAt
  }

  nextBook.contactsByProfileId.set(cleanContact.profileId, nextContact)

  return nextBook
}

export function trustContact(
  book: ContactBook,
  {
    profileId,
    alias,
    avatarMediaSnapshot,
    avatarUriSnapshot,
    displayNameSnapshot,
    homeAddress,
    homeExpiresAt,
    homePolicy,
    homeRoomKey,
    profileSnapshots,
    trustedAt,
    proof,
    source
  }: {
    alias?: string
    avatarMediaSnapshot?: AvatarMediaReference
    avatarUriSnapshot?: string
    displayNameSnapshot?: string
    homeAddress?: string
    homeExpiresAt?: number
    homePolicy?: string
    homeRoomKey?: string
    profileId: string
    proof?: unknown
    profileSnapshots?: ProfileSnapshot[]
    source?: string
    trustedAt?: number
  }
): ContactBook {
  const mergedProfileSnapshots = mergeProfileSnapshots(
    profileSnapshots || [],
    createContactProfileSnapshotIfChanged(
      profileSnapshots,
      {
        avatarMediaSnapshot,
        avatarUriSnapshot,
        displayNameSnapshot,
        profileId,
        source
      },
      trustedAt
    )
  )
  const nextBook = upsertContact(book, {
    profileId,
    alias,
    avatarMediaSnapshot,
    avatarUriSnapshot,
    displayNameSnapshot,
    homeAddress,
    homeExpiresAt,
    homePolicy,
    homeRoomKey,
    profileSnapshots: mergedProfileSnapshots,
    trustedAt,
    trustScope: TRUST_SCOPE_HOME,
    proof,
    source
  })

  nextBook.pendingRequestsByProfileId.delete(profileId)
  nextBook.outgoingRequestsByProfileId.delete(profileId)

  return nextBook
}

export function recordContactHomeDescriptor(
  book: ContactBook,
  {
    address,
    expiresAt,
    ownerProfileId,
    policy,
    proof,
    roomKey
  }: {
    address: string
    expiresAt?: number | null
    ownerProfileId: string
    policy?: string
    proof?: unknown
    roomKey: string
  }
): ContactBook {
  const cleanOwnerProfileId = cleanRequiredString(
    ownerProfileId,
    'Home owner profile id is required'
  )
  const existing = getContact(book, cleanOwnerProfileId)

  if (!existing || !isContactTrusted(book, cleanOwnerProfileId)) {
    throw new Error('Trusted contact is required before storing a home descriptor')
  }

  return upsertContact(book, {
    profileId: cleanOwnerProfileId,
    alias: existing.alias,
    avatarMediaSnapshot: existing.avatarMediaSnapshot,
    avatarUriSnapshot: existing.avatarUriSnapshot,
    displayNameSnapshot: existing.displayNameSnapshot,
    homeAddress: address,
    homeExpiresAt: expiresAt === null ? undefined : expiresAt,
    homePolicy: policy,
    homeRoomKey: roomKey,
    proof,
    source: existing.source,
    trustedAt: existing.trustedAt,
    trustScope: existing.trustScope
  })
}

export function revokeContact(
  book: ContactBook,
  { profileId, revokedAt }: { profileId: string; revokedAt: number }
): ContactBook {
  const cleanProfileId = cleanRequiredString(profileId, 'Contact profile id is required')
  const nextBook = upsertContact(book, {
    profileId: cleanProfileId,
    alias: getContact(book, cleanProfileId)?.alias,
    avatarMediaSnapshot: getContact(book, cleanProfileId)?.avatarMediaSnapshot,
    avatarUriSnapshot: getContact(book, cleanProfileId)?.avatarUriSnapshot,
    displayNameSnapshot: getContact(book, cleanProfileId)?.displayNameSnapshot,
    revokedAt
  })

  nextBook.pendingRequestsByProfileId.delete(cleanProfileId)
  nextBook.outgoingRequestsByProfileId.delete(cleanProfileId)

  return nextBook
}

export function allowContactRequests(
  book: ContactBook,
  { profileId }: { profileId: string }
): ContactBook {
  const cleanProfileId = cleanRequiredString(profileId, 'Contact profile id is required')
  const existing = getContact(book, cleanProfileId)

  if (
    !existing ||
    (!isContactRevoked(book, cleanProfileId) && !isMessageRequestIgnored(book, cleanProfileId))
  ) {
    return cloneContactBook(book)
  }

  const nextBook = cloneContactBook(book)
  const nextContact = dropEmpty({
    profileId: cleanProfileId,
    aliases: [...(existing.aliases || [])],
    alias: existing.alias,
    avatarMediaSnapshot: existing.avatarMediaSnapshot,
    avatarUriSnapshot: existing.avatarUriSnapshot,
    displayNameSnapshot: existing.displayNameSnapshot,
    source: existing.source
  }) as ContactBookContact

  nextBook.contactsByProfileId.set(cleanProfileId, nextContact)
  nextBook.pendingRequestsByProfileId.delete(cleanProfileId)
  nextBook.outgoingRequestsByProfileId.delete(cleanProfileId)

  return nextBook
}

export function getContact(book: ContactBook, profileId: string): ContactBookContact | null {
  return (
    book?.contactsByProfileId?.get(
      cleanRequiredString(profileId, 'Contact profile id is required')
    ) || null
  )
}

export function isContactTrusted(book: ContactBook, profileId: string, at?: number): boolean {
  const contact = getContact(book, profileId)

  if (contact?.trustedAt === undefined || contact.trustedAt === null) {
    return false
  }

  if (at !== undefined && contact.trustedAt > at) {
    return false
  }

  if (contact.revokedAt === undefined || contact.revokedAt === null) {
    return true
  }

  return at !== undefined && contact.revokedAt > at
}

export function canContactAccessHome(book: ContactBook, profileId: string): boolean {
  return isContactTrusted(book, profileId)
}

export function canContactSeePresence(book: ContactBook, profileId: string): boolean {
  return isContactTrusted(book, profileId)
}

export function listTrustedContacts(book: ContactBook): Array<{
  alias: string
  avatarMediaSnapshot?: AvatarMediaReference
  avatarUriSnapshot?: string
  homeAddress?: string
  homeExpiresAt?: number
  homePolicy?: string
  homeRoomKey?: string
  profileId: string
}> {
  return Array.from(book?.contactsByProfileId?.values() || [])
    .filter((contact) => isContactTrusted(book, contact.profileId))
    .map((contact) => ({
      alias: contact.alias || contact.displayNameSnapshot || contact.profileId,
      ...(contact.avatarMediaSnapshot ? { avatarMediaSnapshot: contact.avatarMediaSnapshot } : {}),
      ...(contact.avatarUriSnapshot ? { avatarUriSnapshot: contact.avatarUriSnapshot } : {}),
      ...(contact.homeAddress ? { homeAddress: contact.homeAddress } : {}),
      ...(contact.homeExpiresAt ? { homeExpiresAt: contact.homeExpiresAt } : {}),
      ...(contact.homePolicy ? { homePolicy: contact.homePolicy } : {}),
      ...(contact.homeRoomKey ? { homeRoomKey: contact.homeRoomKey } : {}),
      profileId: contact.profileId
    }))
    .sort((left, right) => left.alias.localeCompare(right.alias))
}

export function listBlockedContacts(book: ContactBook): ContactBookContact[] {
  return Array.from(book?.contactsByProfileId?.values() || [])
    .filter(
      (contact) =>
        Boolean(contact.revokedAt !== undefined && contact.revokedAt !== null) ||
        Boolean(contact.requestIgnoredAt !== undefined && contact.requestIgnoredAt !== null)
    )
    .sort((left, right) =>
      (left.alias || left.displayNameSnapshot || left.profileId).localeCompare(
        right.alias || right.displayNameSnapshot || right.profileId
      )
    )
}

export function canSendMessageRequest(book: ContactBook, profileId: string): boolean {
  const cleanProfileId = cleanRequiredString(profileId, 'Contact profile id is required')

  return (
    !isContactRevoked(book, cleanProfileId) &&
    !isContactTrusted(book, cleanProfileId) &&
    !isMessageRequestIgnored(book, cleanProfileId) &&
    !book?.pendingRequestsByProfileId?.has(cleanProfileId)
  )
}

export function canAcceptDmInviteFromContactBook(
  book: ContactBook,
  invite: { fromProfileId?: string; requestId?: string; toProfileId?: string }
): boolean {
  const fromProfileId = cleanRequiredString(invite?.fromProfileId, 'Invite sender is required')

  if (
    invite?.toProfileId &&
    cleanRequiredString(invite.toProfileId, 'Invite recipient is required') !== book.ownerProfileId
  ) {
    return false
  }

  if (isContactRevoked(book, fromProfileId)) {
    return false
  }

  return isContactTrusted(book, fromProfileId)
}

export function recordMessageRequest(
  book: ContactBook,
  {
    profileId,
    alias,
    avatarMediaSnapshot,
    avatarUriSnapshot,
    displayNameSnapshot,
    homeAddress,
    homeExpiresAt,
    homePolicy,
    homeRoomKey,
    requestedAt,
    requestId,
    proof,
    deliveryState,
    senderEncryptionPublicKey,
    source,
    text
  }: Partial<MessageRequestContact> & { profileId: string }
): ContactBook {
  const cleanProfileId = cleanRequiredString(profileId, 'Contact profile id is required')

  if (isContactRevoked(book, cleanProfileId)) {
    throw new Error('Revoked contact cannot create message request')
  }

  if (isContactTrusted(book, cleanProfileId)) {
    return book
  }

  if (isMessageRequestIgnored(book, cleanProfileId)) {
    return book
  }

  if (book?.pendingRequestsByProfileId?.has(cleanProfileId)) {
    return book
  }

  const nextBook = upsertContact(book, {
    profileId: cleanProfileId,
    alias,
    avatarMediaSnapshot,
    avatarUriSnapshot,
    displayNameSnapshot,
    source
  })
  const pendingRequestsByProfileId = new Map(nextBook.pendingRequestsByProfileId)
  const profileSnapshots = mergeProfileSnapshots(
    nextBook.contactsByProfileId.get(cleanProfileId)?.profileSnapshots || [],
    createContactProfileSnapshot(
      {
        avatarMediaSnapshot,
        avatarUriSnapshot,
        displayNameSnapshot,
        profileId: cleanProfileId,
        source
      },
      requestedAt
    )
  )

  pendingRequestsByProfileId.set(
    cleanProfileId,
    dropEmpty({
      profileId: cleanProfileId,
      alias: cleanOptionalString(alias),
      avatarMediaSnapshot,
      avatarUriSnapshot: cleanOptionalString(avatarUriSnapshot),
      displayNameSnapshot: cleanOptionalString(displayNameSnapshot),
      homeAddress: cleanOptionalString(homeAddress),
      homeExpiresAt,
      homePolicy: cleanOptionalString(homePolicy),
      homeRoomKey: cleanOptionalString(homeRoomKey),
      requestedAt,
      requestId,
      proof,
      deliveryState: cleanOptionalString(deliveryState),
      ...withProfileSnapshots(profileSnapshots),
      senderEncryptionPublicKey: cleanOptionalString(senderEncryptionPublicKey),
      source: cleanOptionalString(source),
      text: cleanOptionalString(text)
    }) as MessageRequestContact
  )

  return {
    ...nextBook,
    outgoingRequestsByProfileId: nextBook.outgoingRequestsByProfileId,
    pendingRequestsByProfileId
  }
}

export function recordOutgoingFriendRequest(
  book: ContactBook,
  {
    profileId,
    alias,
    avatarMediaSnapshot,
    avatarUriSnapshot,
    displayNameSnapshot,
    homeAddress,
    homeExpiresAt,
    homePolicy,
    homeRoomKey,
    requestedAt,
    requestId,
    proof,
    deliveryState,
    senderEncryptionPublicKey,
    source,
    text
  }: Partial<MessageRequestContact> & { profileId: string }
): ContactBook {
  const cleanProfileId = cleanRequiredString(profileId, 'Contact profile id is required')

  if (isContactRevoked(book, cleanProfileId)) {
    throw new Error('Revoked contact cannot create friend request')
  }

  if (isContactTrusted(book, cleanProfileId)) {
    return book
  }

  if (isMessageRequestIgnored(book, cleanProfileId)) {
    return book
  }

  if (book?.outgoingRequestsByProfileId?.has(cleanProfileId)) {
    return book
  }

  const nextBook = upsertContact(book, {
    profileId: cleanProfileId,
    alias,
    avatarMediaSnapshot,
    avatarUriSnapshot,
    displayNameSnapshot,
    source
  })
  const outgoingRequestsByProfileId = new Map(nextBook.outgoingRequestsByProfileId)
  const profileSnapshots = mergeProfileSnapshots(
    nextBook.contactsByProfileId.get(cleanProfileId)?.profileSnapshots || [],
    createContactProfileSnapshot(
      {
        avatarMediaSnapshot,
        avatarUriSnapshot,
        displayNameSnapshot,
        profileId: cleanProfileId,
        source
      },
      requestedAt
    )
  )

  outgoingRequestsByProfileId.set(
    cleanProfileId,
    dropEmpty({
      profileId: cleanProfileId,
      alias: cleanOptionalString(alias),
      avatarMediaSnapshot,
      avatarUriSnapshot: cleanOptionalString(avatarUriSnapshot),
      displayNameSnapshot: cleanOptionalString(displayNameSnapshot),
      homeAddress: cleanOptionalString(homeAddress),
      homeExpiresAt,
      homePolicy: cleanOptionalString(homePolicy),
      homeRoomKey: cleanOptionalString(homeRoomKey),
      requestedAt,
      requestId,
      proof,
      deliveryState: cleanOptionalString(deliveryState),
      ...withProfileSnapshots(profileSnapshots),
      senderEncryptionPublicKey: cleanOptionalString(senderEncryptionPublicKey),
      source: cleanOptionalString(source),
      text: cleanOptionalString(text)
    }) as MessageRequestContact
  )

  return {
    ...nextBook,
    outgoingRequestsByProfileId
  }
}

export function acceptOutgoingFriendRequest(
  book: ContactBook,
  { acceptedAt, profileId }: { acceptedAt: number; profileId: string }
): ContactBook {
  const cleanProfileId = cleanRequiredString(profileId, 'Contact profile id is required')
  if (isContactRevoked(book, cleanProfileId)) {
    throw new Error('Revoked contact cannot be accepted')
  }

  const request = book?.outgoingRequestsByProfileId?.get(cleanProfileId)
  if (!request) {
    throw new Error('Outgoing friend request is required')
  }

  return trustContact(book, {
    profileId: cleanProfileId,
    alias: request.alias || request.displayNameSnapshot || cleanProfileId.slice(0, 12),
    avatarMediaSnapshot: request.avatarMediaSnapshot,
    avatarUriSnapshot: request.avatarUriSnapshot,
    displayNameSnapshot: request.displayNameSnapshot,
    homeAddress: request.homeAddress,
    homeExpiresAt: request.homeExpiresAt,
    homePolicy: request.homePolicy,
    homeRoomKey: request.homeRoomKey,
    profileSnapshots: request.profileSnapshots,
    trustedAt: acceptedAt,
    proof: request.proof,
    source: request.source
  })
}

export function acceptMessageRequest(
  book: ContactBook,
  { profileId, alias, acceptedAt }: { acceptedAt: number; alias?: string; profileId: string }
): ContactBook {
  const cleanProfileId = cleanRequiredString(profileId, 'Contact profile id is required')
  if (isContactRevoked(book, cleanProfileId)) {
    throw new Error('Revoked contact cannot be accepted')
  }

  const request = book?.pendingRequestsByProfileId?.get(cleanProfileId)
  if (!request) {
    throw new Error('Pending message request is required')
  }

  const trusted = trustContact(book, {
    profileId: cleanProfileId,
    alias,
    avatarMediaSnapshot: request?.avatarMediaSnapshot,
    avatarUriSnapshot: request?.avatarUriSnapshot,
    displayNameSnapshot: request?.displayNameSnapshot,
    profileSnapshots: request?.profileSnapshots,
    trustedAt: acceptedAt,
    source: request?.source
  })
  const pendingRequestsByProfileId = new Map(trusted.pendingRequestsByProfileId)

  pendingRequestsByProfileId.delete(cleanProfileId)

  return {
    ...trusted,
    pendingRequestsByProfileId
  }
}

export function ignoreMessageRequest(
  book: ContactBook,
  { ignoredAt = Date.now(), profileId }: { ignoredAt?: number; profileId: string }
): ContactBook {
  const cleanProfileId = cleanRequiredString(profileId, 'Contact profile id is required')
  const existing = getContact(book, cleanProfileId)
  const request = book?.pendingRequestsByProfileId?.get(cleanProfileId)

  if (!existing && !request) {
    return cloneContactBook(book)
  }

  const nextBook = upsertContact(book, {
    profileId: cleanProfileId,
    alias: existing?.alias || request?.alias,
    avatarMediaSnapshot: existing?.avatarMediaSnapshot || request?.avatarMediaSnapshot,
    avatarUriSnapshot: existing?.avatarUriSnapshot || request?.avatarUriSnapshot,
    displayNameSnapshot: existing?.displayNameSnapshot || request?.displayNameSnapshot,
    requestIgnoredAt: ignoredAt,
    source: existing?.source || request?.source
  })

  nextBook.pendingRequestsByProfileId.delete(cleanProfileId)

  return nextBook
}

export function isContactRevoked(book: ContactBook, profileId: string): boolean {
  const contact = getContact(book, profileId)

  return contact?.revokedAt !== undefined && contact.revokedAt !== null
}

function isMessageRequestIgnored(book: ContactBook, profileId: string): boolean {
  const contact = getContact(book, profileId)

  return contact?.requestIgnoredAt !== undefined && contact.requestIgnoredAt !== null
}

function cloneContactBook(book: ContactBook): ContactBook {
  return {
    ownerProfileId: cleanRequiredString(book.ownerProfileId, 'Owner profile id is required'),
    contactsByProfileId: new Map(
      Array.from(book.contactsByProfileId || []).map(([profileId, contact]) => [
        profileId,
        {
          ...contact,
          aliases: [...(contact.aliases || [])],
          ...withProfileSnapshots(contact.profileSnapshots)
        }
      ])
    ),
    outgoingRequestsByProfileId: new Map(
      Array.from(book.outgoingRequestsByProfileId || []).map(([profileId, request]) => [
        profileId,
        { ...request, ...withProfileSnapshots(request.profileSnapshots) }
      ])
    ),
    pendingRequestsByProfileId: new Map(
      Array.from(book.pendingRequestsByProfileId || []).map(([profileId, request]) => [
        profileId,
        { ...request, ...withProfileSnapshots(request.profileSnapshots) }
      ])
    )
  }
}

function cleanContactPatch(contact: ContactPatch = {}): ContactBookContact {
  const profileId = cleanRequiredString(contact.profileId, 'Contact profile id is required')
  const alias = cleanOptionalString(contact.alias)
  const displayNameSnapshot = cleanOptionalString(contact.displayNameSnapshot)

  if (!alias && !displayNameSnapshot) {
    throw new Error('Contact alias or display name is required')
  }

  return dropEmpty({
    profileId,
    alias,
    avatarMediaSnapshot: contact.avatarMediaSnapshot,
    avatarUriSnapshot: cleanOptionalString(contact.avatarUriSnapshot),
    displayNameSnapshot,
    homeAddress: cleanOptionalString(contact.homeAddress),
    homeExpiresAt: contact.homeExpiresAt,
    homePolicy: cleanOptionalString(contact.homePolicy),
    homeRoomKey: cleanOptionalString(contact.homeRoomKey),
    trustedAt: contact.trustedAt,
    trustScope: contact.trustScope,
    revokedAt: contact.revokedAt,
    requestIgnoredAt: contact.requestIgnoredAt,
    source: cleanOptionalString(contact.source),
    ...withProfileSnapshots(contact.profileSnapshots),
    proof: contact.proof
  }) as ContactBookContact
}

function createContactProfileSnapshotIfChanged(
  snapshots: readonly ProfileSnapshot[] | undefined,
  contact: Pick<
    ContactBookContact,
    'avatarMediaSnapshot' | 'avatarUriSnapshot' | 'displayNameSnapshot' | 'profileId' | 'source'
  >,
  capturedAt?: number
): ProfileSnapshot | null {
  if (hasEquivalentProfileSnapshot(snapshots, contact)) return null

  return createContactProfileSnapshot(contact, capturedAt)
}

function createContactProfileSnapshot(
  contact: Pick<
    ContactBookContact,
    'avatarMediaSnapshot' | 'avatarUriSnapshot' | 'displayNameSnapshot' | 'profileId' | 'source'
  >,
  capturedAt?: number
): ProfileSnapshot | null {
  if (capturedAt === undefined || capturedAt === null) return null

  try {
    return createProfileSnapshot({
      avatarMediaSnapshot: contact.avatarMediaSnapshot,
      avatarUriSnapshot: contact.avatarUriSnapshot,
      capturedAt,
      displayNameSnapshot: contact.displayNameSnapshot,
      profileId: contact.profileId,
      source: contact.source
    })
  } catch {
    return null
  }
}

function hasEquivalentProfileSnapshot(
  snapshots: readonly ProfileSnapshot[] | undefined,
  contact: Pick<
    ContactBookContact,
    'avatarMediaSnapshot' | 'avatarUriSnapshot' | 'displayNameSnapshot' | 'profileId'
  >
): boolean {
  return Boolean(
    snapshots?.some(
      (snapshot) =>
        snapshot.profileId === contact.profileId &&
        (snapshot.displayNameSnapshot || '') === (contact.displayNameSnapshot || '') &&
        (snapshot.avatarUriSnapshot || '') === (contact.avatarUriSnapshot || '') &&
        (snapshot.avatarMediaSnapshot?.digest || '') === (contact.avatarMediaSnapshot?.digest || '')
    )
  )
}

function withProfileSnapshots(snapshots: readonly unknown[] | undefined): {
  profileSnapshots?: ProfileSnapshot[]
} {
  const cleanSnapshots = cleanProfileSnapshots(snapshots)

  return cleanSnapshots.length > 0 ? { profileSnapshots: cleanSnapshots } : {}
}

function mergeAliases(existingAliases: string[] = [], alias?: string): string[] {
  if (!alias || existingAliases.includes(alias)) {
    return [...existingAliases]
  }

  return [...existingAliases, alias]
}

function dropEmpty(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== null)
  )
}

function cleanRequiredString(value: string | undefined, message: string): string {
  const cleaned = value?.trim()

  if (!cleaned) {
    throw new Error(message)
  }

  return cleaned
}

function cleanOptionalString(value: string | undefined): string | undefined {
  return value?.trim() || undefined
}
