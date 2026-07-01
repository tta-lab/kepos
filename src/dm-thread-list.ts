import type { ContactBook } from './contact-book.ts'
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

type ThreadMessage = {
  at?: unknown
  direction?: unknown
  fromProfileId?: unknown
  id?: unknown
  text?: unknown
  toProfileId?: unknown
  type?: unknown
}

type ThreadSnapshot = {
  acceptedAt?: unknown
  createdAt?: unknown
  remoteProfileId?: unknown
  lastReadAt?: unknown
  requestedAt?: unknown
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
  resolveAvatarMediaUri = null,
  shortenProfileId,
  threads = []
}: {
  contactBook?: ContactBook | null
  contacts?: readonly ThreadContact[]
  formatTime: (value: number) => string
  lastReadAtByProfileId?: Map<string, number> | Record<string, number> | null
  messages?: readonly ThreadMessage[]
  resolveAvatarMediaUri?: ResolveAvatarMediaUri | null
  shortenProfileId: (value: string) => string
  threads?: readonly unknown[]
}): DmThreadListViewItem[] {
  return threads
    .map(readThreadSnapshot)
    .filter(isVisibleThread)
    .map<DmThreadListInternalItem>((thread) => {
      const profileId = thread.remoteProfileId as string
      const latestMessage = findLatestDirectMessage(messages, profileId)
      const requestActions = createThreadRequestActions(thread, messages)
      const statusLabel = formatStatusLabel(thread)
      const unreadCount = countUnreadIncomingMessages({
        lastReadAtByProfileId,
        messages,
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
          avatarMediaSnapshot: findContactAvatarMediaSnapshot({ contactBook, contacts, profileId }),
          avatarUri: findContactAvatarUri({ contactBook, contacts, profileId }),
          displayName: findContactDisplayName({ contactBook, contacts, profileId }),
          profileId,
          resolveAvatarMediaUri
        }),
        label: findContactLabel({ contactBook, contacts, profileId, shortenProfileId }),
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
  return thread.state === 'requested' ? 'Request pending' : 'Accepted thread'
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
