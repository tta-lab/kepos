const TRUST_SCOPE_HOME = 'home'
const CONTACT_BOOK_VERSION = 1

export type ContactBookContact = {
  alias?: string
  aliases?: string[]
  displayNameSnapshot?: string
  homeAddress?: string
  homePolicy?: string
  profileId: string
  proof?: unknown
  revokedAt?: number
  source?: string
  trustedAt?: number
  trustScope?: typeof TRUST_SCOPE_HOME
}

export type MessageRequestContact = {
  alias?: string
  displayNameSnapshot?: string
  profileId: string
  requestedAt?: number
  requestId?: string
  senderEncryptionPublicKey?: string
  source?: string
  text?: string
}

export type ContactBook = {
  contactsByProfileId: Map<string, ContactBookContact>
  ownerProfileId: string
  pendingRequestsByProfileId: Map<string, MessageRequestContact>
}

export type SerializedContactBook = {
  contacts: ContactBookContact[]
  ownerProfileId: string
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
    pendingRequestsByProfileId: new Map()
  }
}

export function serializeContactBook(book: ContactBook): SerializedContactBook {
  return {
    version: CONTACT_BOOK_VERSION,
    ownerProfileId: cleanRequiredString(book?.ownerProfileId, 'Owner profile id is required'),
    contacts: Array.from(book?.contactsByProfileId?.values() || []).map((contact) => ({
      ...contact,
      aliases: [...(contact.aliases || [])]
    })),
    pendingRequests: Array.from(book?.pendingRequestsByProfileId?.values() || []).map(
      (request) => ({
        ...request
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
          aliases: [...(contact.aliases || [])]
        }
      ])
    ),
    pendingRequestsByProfileId: new Map(
      (value.pendingRequests || []).map((request: MessageRequestContact) => [
        cleanRequiredString(request.profileId, 'Contact profile id is required'),
        { ...request }
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
  const alias = cleanContact.alias || cleanContact.displayNameSnapshot
  const aliases = mergeAliases(existing?.aliases, alias)
  const nextContact = dropEmpty({
    ...existing,
    ...cleanContact,
    aliases,
    alias
  }) as ContactBookContact

  if (cleanContact.trustedAt !== undefined) {
    delete nextContact.revokedAt
  }

  nextBook.contactsByProfileId.set(cleanContact.profileId, nextContact)

  return nextBook
}

export function trustContact(
  book: ContactBook,
  {
    profileId,
    alias,
    displayNameSnapshot,
    homeAddress,
    homePolicy,
    trustedAt,
    proof,
    source
  }: {
    alias?: string
    displayNameSnapshot?: string
    homeAddress?: string
    homePolicy?: string
    profileId: string
    proof?: unknown
    source?: string
    trustedAt?: number
  }
): ContactBook {
  return upsertContact(book, {
    profileId,
    alias,
    displayNameSnapshot,
    homeAddress,
    homePolicy,
    trustedAt,
    trustScope: TRUST_SCOPE_HOME,
    proof,
    source
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
    displayNameSnapshot: getContact(book, cleanProfileId)?.displayNameSnapshot,
    revokedAt
  })

  nextBook.pendingRequestsByProfileId.delete(cleanProfileId)

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

export function listTrustedContacts(
  book: ContactBook
): Array<{ alias: string; profileId: string }> {
  return Array.from(book?.contactsByProfileId?.values() || [])
    .filter((contact) => isContactTrusted(book, contact.profileId))
    .map((contact) => ({
      alias: contact.alias || contact.displayNameSnapshot || contact.profileId,
      profileId: contact.profileId
    }))
    .sort((left, right) => left.alias.localeCompare(right.alias))
}

export function canSendMessageRequest(book: ContactBook, profileId: string): boolean {
  const cleanProfileId = cleanRequiredString(profileId, 'Contact profile id is required')

  return (
    !isContactRevoked(book, cleanProfileId) &&
    !isContactTrusted(book, cleanProfileId) &&
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
    displayNameSnapshot,
    requestedAt,
    requestId,
    senderEncryptionPublicKey,
    source,
    text
  }: Partial<MessageRequestContact> & { profileId: string }
): ContactBook {
  const cleanProfileId = cleanRequiredString(profileId, 'Contact profile id is required')

  if (isContactRevoked(book, cleanProfileId)) {
    throw new Error('Revoked contact cannot create message request')
  }

  if (book?.pendingRequestsByProfileId?.has(cleanProfileId)) {
    return book
  }

  const nextBook = upsertContact(book, {
    profileId: cleanProfileId,
    alias,
    displayNameSnapshot,
    source
  })
  const pendingRequestsByProfileId = new Map(nextBook.pendingRequestsByProfileId)

  pendingRequestsByProfileId.set(
    cleanProfileId,
    dropEmpty({
      profileId: cleanProfileId,
      alias: cleanOptionalString(alias),
      displayNameSnapshot: cleanOptionalString(displayNameSnapshot),
      requestedAt,
      requestId,
      senderEncryptionPublicKey: cleanOptionalString(senderEncryptionPublicKey),
      source: cleanOptionalString(source),
      text: cleanOptionalString(text)
    }) as MessageRequestContact
  )

  return {
    ...nextBook,
    pendingRequestsByProfileId
  }
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
  const trusted = trustContact(book, {
    profileId: cleanProfileId,
    alias,
    displayNameSnapshot: request?.displayNameSnapshot,
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
  { profileId }: { profileId: string }
): ContactBook {
  const cleanProfileId = cleanRequiredString(profileId, 'Contact profile id is required')
  const nextBook = cloneContactBook(book)

  nextBook.pendingRequestsByProfileId.delete(cleanProfileId)

  return nextBook
}

function isContactRevoked(book: ContactBook, profileId: string): boolean {
  const contact = getContact(book, profileId)

  return contact?.revokedAt !== undefined && contact.revokedAt !== null
}

function cloneContactBook(book: ContactBook): ContactBook {
  return {
    ownerProfileId: cleanRequiredString(book.ownerProfileId, 'Owner profile id is required'),
    contactsByProfileId: new Map(
      Array.from(book.contactsByProfileId || []).map(([profileId, contact]) => [
        profileId,
        {
          ...contact,
          aliases: [...(contact.aliases || [])]
        }
      ])
    ),
    pendingRequestsByProfileId: new Map(
      Array.from(book.pendingRequestsByProfileId || []).map(([profileId, request]) => [
        profileId,
        { ...request }
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
    displayNameSnapshot,
    homeAddress: cleanOptionalString(contact.homeAddress),
    homePolicy: cleanOptionalString(contact.homePolicy),
    trustedAt: contact.trustedAt,
    trustScope: contact.trustScope,
    revokedAt: contact.revokedAt,
    source: cleanOptionalString(contact.source),
    proof: contact.proof
  }) as ContactBookContact
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
