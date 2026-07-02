import type { ContactBook, MessageRequestContact } from './contact-book.ts'
import { formatProfileFriendRequestDeliveryState } from './profile-friend-request-delivery.ts'
import { getLatestProfileSnapshot, type ProfileSnapshot } from './profile-snapshot.ts'
import {
  createProfileAvatarViewModel,
  type ProfileAvatarViewModel,
  type ResolveAvatarMediaUri
} from './profile-avatar-view-model.ts'

export type DmThreadListItem = {
  threadId?: string
  [key: string]: unknown
}

export type DmThreadListViewItem = {
  avatar: ProfileAvatarViewModel
  label: string
  preview: string
  profileId: string
  requestActions?: {
    acceptMessage: ThreadMessage
    ignoreMessage: ThreadMessage
  }
  statusLabel: string
  threadId: unknown
  timeLabel: string
  unreadCount: number
  unreadLabel: string
}

type ThreadContact = {
  alias?: string
  avatarMediaSnapshot?: Parameters<ResolveAvatarMediaUri>[0]
  avatarUriSnapshot?: string
  displayNameSnapshot?: string
  profileId: string
  profileSnapshots?: ProfileSnapshot[]
}

type ThreadRequestContact = Omit<
  MessageRequestContact,
  'alias' | 'deliveryState' | 'requestId' | 'senderEncryptionPublicKey' | 'text'
> & {
  alias?: string | null
  deliveryState?: string | null
  requestId?: string | null
  senderEncryptionPublicKey?: string | null
  text?: string | null
}

type ThreadMessage = {
  at?: unknown
  direction?: unknown
  fromProfileId?: unknown
  id?: unknown
  requestId?: unknown
  senderEncryptionPublicKey?: unknown
  text?: unknown
  toProfileId?: unknown
  type?: unknown
}

type ThreadSnapshot = {
  acceptedAt?: unknown
  createdAt?: unknown
  deliveryState?: unknown
  remoteProfileId?: unknown
  lastReadAt?: unknown
  requestedAt?: unknown
  requestDirection?: unknown
  revokedAt?: unknown
  state?: unknown
  threadId?: unknown
}

type DmThreadListInternalItem = DmThreadListViewItem & {
  sortTimestamp: number
}

export function upsertDmThread<TThread extends DmThreadListItem>(
  threads: TThread[] = [],
  thread: TThread | null | undefined
): TThread[] {
  if (!thread?.threadId) {
    return threads
  }

  return [...threads.filter((existing) => existing.threadId !== thread.threadId), thread]
}

export function createDmThreadListView({
  contactBook = null,
  contacts = [],
  formatTime,
  lastReadAtByProfileId = null,
  messages = [],
  outgoingRequests = [],
  ownerProfileId = '',
  pendingRequests = [],
  resolveAvatarMediaUri = null,
  shortenProfileId,
  threads = []
}: {
  contactBook?: ContactBook | null
  contacts?: readonly ThreadContact[]
  formatTime: (value: number) => string
  lastReadAtByProfileId?: Map<string, number> | Record<string, number> | null
  messages?: readonly ThreadMessage[]
  outgoingRequests?: readonly ThreadRequestContact[]
  ownerProfileId?: string
  pendingRequests?: readonly ThreadRequestContact[]
  resolveAvatarMediaUri?: ResolveAvatarMediaUri | null
  shortenProfileId: (value: string) => string
  threads?: readonly unknown[]
}): DmThreadListViewItem[] {
  const allPendingRequests = mergeRequests(
    Array.from(contactBook?.pendingRequestsByProfileId?.values() || []),
    pendingRequests
  )
  const allOutgoingRequests = mergeRequests(
    Array.from(contactBook?.outgoingRequestsByProfileId?.values() || []),
    outgoingRequests
  )
  const allContacts = mergeThreadContacts(contacts, allPendingRequests, allOutgoingRequests)
  const allMessages = [
    ...messages,
    ...createRequestMessages({
      outgoingRequests: allOutgoingRequests,
      ownerProfileId: contactBook?.ownerProfileId || ownerProfileId,
      pendingRequests: allPendingRequests
    })
  ]

  return createThreadSnapshots({
    outgoingRequests: allOutgoingRequests,
    pendingRequests: allPendingRequests,
    threads
  })
    .map(readThreadSnapshot)
    .filter(isVisibleThread)
    .map<DmThreadListInternalItem>((thread) => {
      const profileId = thread.remoteProfileId as string
      const latestMessage = findLatestDirectMessage(allMessages, profileId)
      const requestActions = createThreadRequestActions(thread, allMessages)
      const statusLabel = formatStatusLabel(thread)
      const unreadCount = countUnreadIncomingMessages({
        lastReadAtByProfileId,
        messages: allMessages,
        profileId,
        thread
      })
      const lastTimestamp =
        readNumber(latestMessage?.at) ??
        readNumber(thread.acceptedAt) ??
        readNumber(thread.requestedAt) ??
        readNumber(thread.createdAt)

      return {
        avatar: createProfileAvatarViewModel({
          avatarMediaSnapshot: findContactAvatarMediaSnapshot({
            contactBook,
            contacts: allContacts,
            profileId
          }),
          avatarUri: findContactAvatarUri({ contactBook, contacts: allContacts, profileId }),
          displayName: findContactDisplayName({ contactBook, contacts: allContacts, profileId }),
          profileId,
          resolveAvatarMediaUri
        }),
        label: findContactLabel({
          contactBook,
          contacts: allContacts,
          profileId,
          shortenProfileId
        }),
        preview: formatPreview(latestMessage, thread),
        profileId,
        ...(requestActions ? { requestActions } : {}),
        statusLabel,
        sortTimestamp: lastTimestamp ?? 0,
        threadId: thread.threadId,
        timeLabel: lastTimestamp === null ? statusLabel : formatTime(lastTimestamp),
        unreadCount,
        unreadLabel: formatUnreadLabel(unreadCount)
      }
    })
    .sort(compareThreadRows)
    .map(({ sortTimestamp: _sortTimestamp, ...thread }) => thread)
}

function mergeRequests(
  primary: readonly ThreadRequestContact[],
  secondary: readonly ThreadRequestContact[]
): ThreadRequestContact[] {
  const byProfileId = new Map<string, ThreadRequestContact>()
  for (const request of [...primary, ...secondary]) {
    const profileId = request?.profileId?.trim()
    if (!profileId || byProfileId.has(profileId)) continue
    byProfileId.set(profileId, request)
  }
  return Array.from(byProfileId.values())
}

function mergeThreadContacts(
  contacts: readonly ThreadContact[],
  pendingRequests: readonly ThreadRequestContact[],
  outgoingRequests: readonly ThreadRequestContact[]
): ThreadContact[] {
  const byProfileId = new Map<string, ThreadContact>()

  for (const contact of contacts) {
    const profileId = contact?.profileId?.trim()
    if (!profileId) continue
    byProfileId.set(profileId, contact)
  }

  for (const request of [...pendingRequests, ...outgoingRequests]) {
    const profileId = request?.profileId?.trim()
    if (!profileId || byProfileId.has(profileId)) continue
    byProfileId.set(profileId, createRequestThreadContact(request))
  }

  return Array.from(byProfileId.values())
}

function createRequestThreadContact(request: ThreadRequestContact): ThreadContact {
  return {
    alias: request.alias || undefined,
    avatarMediaSnapshot: request.avatarMediaSnapshot,
    avatarUriSnapshot: request.avatarUriSnapshot,
    displayNameSnapshot: request.displayNameSnapshot,
    profileId: request.profileId,
    profileSnapshots: request.profileSnapshots
  }
}

function createThreadSnapshots({
  outgoingRequests,
  pendingRequests,
  threads
}: {
  outgoingRequests: readonly ThreadRequestContact[]
  pendingRequests: readonly ThreadRequestContact[]
  threads: readonly unknown[]
}): unknown[] {
  const snapshots = threads.map(readThreadSnapshot)
  const profilesWithThreads = new Set(
    snapshots
      .map((thread) => (typeof thread.remoteProfileId === 'string' ? thread.remoteProfileId : ''))
      .filter(Boolean)
  )

  return [
    ...snapshots,
    ...pendingRequests
      .filter((request) => !profilesWithThreads.has(request.profileId))
      .map((request) => createRequestThreadSnapshot(request, 'in')),
    ...outgoingRequests
      .filter((request) => !profilesWithThreads.has(request.profileId))
      .map((request) => createRequestThreadSnapshot(request, 'out'))
  ]
}

function createRequestThreadSnapshot(
  request: ThreadRequestContact,
  direction: 'in' | 'out'
): ThreadSnapshot {
  return {
    deliveryState: request.deliveryState,
    remoteProfileId: request.profileId,
    requestedAt: request.requestedAt,
    requestDirection: direction,
    state: 'requested',
    threadId: `request:${direction}:${request.profileId}:${request.requestId || request.requestedAt || 'pending'}`
  }
}

function createRequestMessages({
  outgoingRequests,
  ownerProfileId,
  pendingRequests
}: {
  outgoingRequests: readonly ThreadRequestContact[]
  ownerProfileId: string
  pendingRequests: readonly ThreadRequestContact[]
}): ThreadMessage[] {
  return [
    ...pendingRequests.map((request) => ({
      at: request.requestedAt,
      direction: 'in',
      fromProfileId: request.profileId,
      id: `request:in:${request.profileId}:${request.requestId || request.requestedAt || 'pending'}`,
      requestId: request.requestId,
      senderEncryptionPublicKey: request.senderEncryptionPublicKey,
      text: request.text,
      toProfileId: ownerProfileId,
      type: 'kepos.message.request.v1'
    })),
    ...outgoingRequests.map((request) => ({
      at: request.requestedAt,
      direction: 'out',
      fromProfileId: ownerProfileId,
      id: `request:out:${request.profileId}:${request.requestId || request.requestedAt || 'pending'}`,
      requestId: request.requestId,
      text: request.text,
      toProfileId: request.profileId,
      type: 'kepos.message.request.v1'
    }))
  ]
}

export function filterDirectMessagesForProfile<TMessage>(
  messages: readonly TMessage[] = [],
  profileId = ''
): TMessage[] {
  const cleanProfileId = profileId.trim()
  if (!cleanProfileId) return []

  return messages.filter((message) => isMessageForProfile(message as ThreadMessage, cleanProfileId))
}

export function findSelectedDmThreadView<
  TThread extends {
    profileId?: unknown
  }
>({
  selectedProfileId = '',
  threads = []
}: {
  selectedProfileId?: string
  threads?: readonly TThread[]
}): TThread | null {
  const cleanProfileId = selectedProfileId.trim()
  if (!cleanProfileId) return null

  return threads.find((thread) => thread?.profileId === cleanProfileId) ?? null
}

function countUnreadIncomingMessages({
  lastReadAtByProfileId,
  messages,
  profileId,
  thread
}: {
  lastReadAtByProfileId: Map<string, number> | Record<string, number> | null
  messages: readonly ThreadMessage[]
  profileId: string
  thread: ThreadSnapshot
}): number {
  const lastReadAt =
    readLastReadAt(lastReadAtByProfileId, profileId) ?? readNumber(thread.lastReadAt)
  if (lastReadAt === null) return 0

  let count = 0
  for (const message of messages) {
    const at = readNumber(message.at)
    if (
      message.type === 'dm' &&
      message.direction === 'in' &&
      message.fromProfileId === profileId &&
      at !== null &&
      at > lastReadAt
    ) {
      count += 1
    }
  }

  return count
}

function readLastReadAt(
  lastReadAtByProfileId: Map<string, number> | Record<string, number> | null,
  profileId: string
): number | null {
  if (!lastReadAtByProfileId) return null

  const value =
    lastReadAtByProfileId instanceof Map
      ? lastReadAtByProfileId.get(profileId)
      : lastReadAtByProfileId[profileId]

  return readNumber(value)
}

function formatUnreadLabel(count: number): string {
  if (count <= 0) return ''
  if (count > 99) return '99+ new'
  return `${count} new`
}

function findContactDisplayName({
  contactBook,
  contacts,
  profileId
}: {
  contactBook: ContactBook | null
  contacts: readonly ThreadContact[]
  profileId: string
}): string {
  const contact =
    contactBook?.contactsByProfileId?.get(profileId) ||
    contacts.find((entry) => entry.profileId === profileId)

  const latestProfileSnapshot = getLatestProfileSnapshot(contact?.profileSnapshots)

  return (
    contact?.alias?.trim() ||
    contact?.displayNameSnapshot?.trim() ||
    latestProfileSnapshot?.displayNameSnapshot?.trim() ||
    ''
  )
}

function findContactAvatarUri({
  contactBook,
  contacts,
  profileId
}: {
  contactBook: ContactBook | null
  contacts: readonly ThreadContact[]
  profileId: string
}): string {
  const contact =
    contactBook?.contactsByProfileId?.get(profileId) ||
    contacts.find((entry) => entry.profileId === profileId)

  const latestProfileSnapshot = getLatestProfileSnapshot(contact?.profileSnapshots)

  return (
    contact?.avatarUriSnapshot?.trim() || latestProfileSnapshot?.avatarUriSnapshot?.trim() || ''
  )
}

function findContactAvatarMediaSnapshot({
  contactBook,
  contacts,
  profileId
}: {
  contactBook: ContactBook | null
  contacts: readonly ThreadContact[]
  profileId: string
}): Parameters<ResolveAvatarMediaUri>[0] | null {
  const contact =
    contactBook?.contactsByProfileId?.get(profileId) ||
    contacts.find((entry) => entry.profileId === profileId)

  const latestProfileSnapshot = getLatestProfileSnapshot(contact?.profileSnapshots)

  return contact?.avatarMediaSnapshot || latestProfileSnapshot?.avatarMediaSnapshot || null
}

function readThreadSnapshot(value: unknown): ThreadSnapshot {
  if (!value || typeof value !== 'object') {
    return {}
  }

  return value as ThreadSnapshot
}

function isVisibleThread(thread: ThreadSnapshot): boolean {
  return (
    (thread.state === 'accepted' || thread.state === 'requested') &&
    thread.revokedAt === undefined &&
    typeof thread.remoteProfileId === 'string' &&
    Boolean(thread.remoteProfileId.trim())
  )
}

function findContactLabel({
  contactBook,
  contacts,
  profileId,
  shortenProfileId
}: {
  contactBook: ContactBook | null
  contacts: readonly ThreadContact[]
  profileId: string
  shortenProfileId: (value: string) => string
}): string {
  const contact =
    contactBook?.contactsByProfileId?.get(profileId) ||
    contacts.find((entry) => entry.profileId === profileId)
  const latestProfileSnapshot = getLatestProfileSnapshot(contact?.profileSnapshots)
  const label =
    contact?.alias || contact?.displayNameSnapshot || latestProfileSnapshot?.displayNameSnapshot

  return label?.trim() || shortenProfileId(profileId)
}

function findLatestDirectMessage(
  messages: readonly ThreadMessage[],
  profileId: string
): ThreadMessage | null {
  let latest: ThreadMessage | null = null
  let latestAt = -1

  for (const message of messages) {
    if (!isMessageForProfile(message, profileId)) {
      continue
    }

    const at = readNumber(message.at) ?? 0

    if (!latest || at > latestAt) {
      latest = message
      latestAt = at
    }
  }

  return latest
}

function isMessageForProfile(message: ThreadMessage, profileId: string): boolean {
  return message.fromProfileId === profileId || message.toProfileId === profileId
}

function createThreadRequestActions(
  thread: ThreadSnapshot,
  messages: readonly ThreadMessage[]
): DmThreadListViewItem['requestActions'] | undefined {
  if (thread.state !== 'requested' || typeof thread.remoteProfileId !== 'string') {
    return undefined
  }

  const requestMessage = findIncomingRequestMessage(messages, thread.remoteProfileId)
  if (!requestMessage) {
    return undefined
  }

  return {
    acceptMessage: requestMessage,
    ignoreMessage: requestMessage
  }
}

function findIncomingRequestMessage(
  messages: readonly ThreadMessage[],
  profileId: string
): ThreadMessage | null {
  for (const message of messages) {
    if (
      message.type === 'kepos.message.request.v1' &&
      message.direction === 'in' &&
      message.fromProfileId === profileId
    ) {
      return message
    }
  }

  return null
}

function formatPreview(message: ThreadMessage | null, thread: ThreadSnapshot): string {
  if (!message) {
    if (thread.state === 'requested') {
      return 'Waiting for acceptance'
    }

    return 'No messages yet'
  }

  const text = typeof message.text === 'string' ? message.text.trim() : ''

  if (!text) {
    return 'No messages yet'
  }

  return message.direction === 'out' ? `You: ${text}` : text
}

function formatStatusLabel(thread: ThreadSnapshot): string {
  if (thread.state !== 'requested') return 'Accepted thread'
  if (thread.requestDirection === 'in') return 'Incoming request'
  if (thread.requestDirection === 'out') {
    return formatProfileFriendRequestDeliveryState(
      typeof thread.deliveryState === 'string' ? thread.deliveryState : undefined
    )
  }
  return 'Request pending'
}

function readNumber(value: unknown): number | null {
  return Number.isSafeInteger(value) && (value as number) >= 0 ? (value as number) : null
}

function compareThreadRows(
  left: DmThreadListInternalItem,
  right: DmThreadListInternalItem
): number {
  if (right.sortTimestamp !== left.sortTimestamp) {
    return right.sortTimestamp - left.sortTimestamp
  }

  return left.label.localeCompare(right.label)
}
