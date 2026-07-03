import {
  appendLocalMessageRequest,
  appendLocalSignedDirectMessage,
  appendRemoteMessageRequest,
  appendRemoteSignedDirectMessage,
  dismissDirectMessage,
  hasOutgoingMessageRequest,
  restoreDirectMessageSession
} from './dm-session.ts'
import { acceptDmInviteAsRecipientWithContactBook } from './dm-invite-acceptance.ts'
import { loadDmMessagesFromStorage, saveDmMessagesToStorage } from './dm-message-storage.ts'
import {
  loadDmSessionMessagesFromStorage,
  saveDmSessionMessagesToStorage
} from './dm-session-storage.ts'
import { createDmThreadRuntime } from './dm-thread-runtime.ts'
import { loadDmThreadsFromStorage, saveDmThreadsToStorage } from './dm-thread-storage.ts'
import { createMessageRequest } from './message-request.ts'
import { acceptMessageRequestWithInvite } from './message-request-acceptance.ts'
import { markDmThreadRead } from './dm-thread.ts'
import type { ContactBook } from './contact-book.ts'
import type { DmInvite } from './dm-invite.ts'
import type { DmEncryptionKeyPair } from './profile.ts'
import type { DmMessage } from './dm-message.ts'
import type { DmThread } from './dm-thread.ts'
import type { DirectMessageSession } from './dm-session.ts'
import type { MessageRequest } from './message-request.ts'
import type { SigningIdentity } from './signed-record.ts'

export function createDesktopDmRuntime({
  acceptInvite = acceptDmInviteAsRecipientWithContactBook,
  acceptRequestWithInvite = acceptMessageRequestWithInvite,
  createRequest = createMessageRequest,
  createThreadRuntime = createDmThreadRuntime as unknown as CreateThreadRuntime,
  loadMessages = loadDmMessagesFromStorage as unknown as NonNullable<
    DesktopDmRuntimeOptions['loadMessages']
  >,
  loadSessionMessages = loadDmSessionMessagesFromStorage,
  loadThreads = loadDmThreadsFromStorage,
  onSessionChanged = () => {},
  onThreadsChanged = () => {},
  saveMessages = saveDmMessagesToStorage as unknown as NonNullable<
    DesktopDmRuntimeOptions['saveMessages']
  >,
  saveSessionMessages = saveDmSessionMessagesToStorage,
  saveThreads = saveDmThreadsToStorage
}: DesktopDmRuntimeOptions = {}): DesktopDmRuntime {
  let dmSession: DirectMessageSession | null = null
  let dmRuntime: DmThreadRuntime | null = null
  let localProfile: DesktopDmProfile | null = null
  let nick = 'Desktop'
  let startVersion = 0
  let storage: DesktopDmStorage | null = null

  async function start({
    nick: nextNick,
    profile,
    storage: nextStorage
  }: {
    nick?: string
    profile: DesktopDmProfile
    storage?: DesktopDmStorage | null
  }) {
    const version = startVersion + 1
    startVersion = version
    const previousRuntime = dmRuntime

    await previousRuntime?.closeAll()
    if (version !== startVersion) return dmSession

    localProfile = profile
    nick = nextNick?.trim() || 'Desktop'
    storage = nextStorage ?? null
    dmSession = restoreDirectMessageSession({
      localProfileId: profile.id,
      messages: loadSessionMessages({
        ownerProfileId: profile.id,
        storage
      }),
      nick
    })
    dmRuntime = createThreadRuntime({
      identity: profile.identity,
      loadMessages: (thread) =>
        loadMessages({
          ownerProfileId: profile.id,
          storage,
          threadId: thread.threadId
        }),
      localProfileId: profile.id,
      onMessage: (thread, message, direction) => {
        if (!dmSession) return

        dmSession =
          direction === 'out'
            ? appendLocalSignedDirectMessage(dmSession, message, {
                remoteProfileId: thread.remoteProfileId
              })
            : appendRemoteSignedDirectMessage(dmSession, message)
        saveCurrentSessionMessages()
        onSessionChanged(dmSession)
      },
      saveMessages: (thread, messages) =>
        saveMessages({
          messages,
          ownerProfileId: profile.id,
          storage,
          threadId: thread.threadId
        })
    })

    await openLocalThreads()
    if (version !== startVersion) return dmSession

    onThreadsChanged(loadLocalThreads())
    return dmSession
  }

  async function closeAll() {
    startVersion += 1
    const currentRuntime = dmRuntime
    dmRuntime = null
    dmSession = null
    localProfile = null
    storage = null

    await currentRuntime?.closeAll()
  }

  function getSession() {
    return dmSession
  }

  function sendMessageOrRequest({
    createdAt,
    messageId,
    requestId,
    text,
    toProfileId
  }: {
    createdAt?: number
    messageId: string
    requestId: string
    text?: string
    toProfileId?: string
  }) {
    const cleanText = text?.trim()
    if (!dmSession || !localProfile || !toProfileId || !cleanText) return null
    if (!localProfile.dmEncryptionKeyPair) return null

    const thread = findThread(toProfileId)
    if (thread && dmRuntime) {
      const message = dmRuntime.sendMessage({
        createdAt,
        messageId,
        text: cleanText,
        threadId: thread.threadId
      })

      return { kind: 'message', message, thread } as const
    }

    const request = createRequest({
      createdAt,
      fromIdentity: localProfile.identity,
      requestId,
      senderEncryptionPublicKey: localProfile.dmEncryptionKeyPair.publicKey,
      text: cleanText,
      toProfileId
    })

    dmSession = appendLocalMessageRequest(dmSession, request)
    saveCurrentSessionMessages()
    onSessionChanged(dmSession)
    return { kind: 'request', request } as const
  }

  function appendIncomingRequest(message: MessageRequest) {
    if (!dmSession || message.toProfileId !== dmSession.localProfileId) return false

    dmSession = appendRemoteMessageRequest(dmSession, message)
    saveCurrentSessionMessages()
    onSessionChanged(dmSession)
    return true
  }

  async function acceptInviteAsRecipient({
    acceptedAt,
    contactBook,
    invite,
    recipientEncryptionKeyPair
  }: {
    acceptedAt?: number
    contactBook: ContactBook
    invite: DmInvite
    recipientEncryptionKeyPair: DmEncryptionKeyPair
  }) {
    if (!localProfile) return null

    const accepted = acceptInvite({
      acceptedAt,
      canAcceptInvite: (invite) =>
        !invite?.requestId?.trim() ||
        hasOutgoingMessageRequest(dmSession, {
          remoteProfileId: invite.fromProfileId,
          requestId: invite.requestId
        }),
      contactBook,
      invite,
      localProfileId: localProfile.id,
      recipientEncryptionKeyPair
    })
    const thread = readAcceptedThread(accepted)

    saveThread(thread)
    await openThread(thread)
    return hasAcceptedThread(accepted) ? accepted : thread
  }

  async function acceptMessageRequest({
    acceptedAt,
    book,
    remoteProfileId,
    threadId
  }: {
    acceptedAt?: number
    book: ContactBook
    remoteProfileId: string
    threadId: string
  }) {
    if (!localProfile) return null

    const result = acceptRequestWithInvite({
      acceptedAt,
      acceptorIdentity: localProfile.identity,
      book,
      remoteProfileId,
      threadId
    })

    saveThread(result.thread)
    await openThread(result.thread)
    return result
  }

  function dismissMessage({ id }: { id?: string }) {
    if (!dmSession || !id) return dmSession

    dmSession = dismissDirectMessage(dmSession, { id })
    saveCurrentSessionMessages()
    onSessionChanged(dmSession)
    return dmSession
  }

  function receiveMessage(message: DmMessage) {
    return dmRuntime?.receiveMessage(message) || false
  }

  function findThread(remoteProfileId: string) {
    return loadLocalThreads().find(
      (thread) =>
        thread.remoteProfileId === remoteProfileId &&
        thread.state === 'accepted' &&
        thread.revokedAt === undefined
    )
  }

  function markThreadRead({
    profileId,
    readAt = Date.now()
  }: {
    profileId?: string
    readAt?: number
  } = {}) {
    if (!profileId) return null

    const thread = findThread(profileId)
    if (!thread) return null

    const nextThread = markDmThreadRead(thread, { readAt })
    saveThread(nextThread)
    return nextThread
  }

  function replaceThreads(threads: DmThread[]) {
    if (!localProfile) return

    saveThreads({
      ownerProfileId: localProfile.id,
      storage,
      threads
    })
    onThreadsChanged(threads)
  }

  async function closeThreads(threadIds: string[]) {
    await Promise.all(threadIds.map((threadId) => dmRuntime?.closeThread(threadId)))
  }

  async function openLocalThreads() {
    await Promise.all(loadLocalThreads().map((thread) => openThread(thread)))
  }

  async function openThread(thread: DmThread) {
    if (thread.state !== 'accepted' || thread.revokedAt !== undefined) return

    await dmRuntime?.openThread(thread)
  }

  function saveThread(thread: DmThread) {
    const threads = loadLocalThreads()
    const nextThreads = [
      ...threads.filter((existing) => existing.threadId !== thread.threadId),
      thread
    ]

    replaceThreads(nextThreads)
  }

  function loadLocalThreads(): DmThread[] {
    if (!localProfile) return []

    return loadThreads({
      ownerProfileId: localProfile.id,
      storage
    })
  }

  function saveCurrentSessionMessages() {
    if (!localProfile || !dmSession) return

    saveSessionMessages({
      messages: dmSession.messages,
      ownerProfileId: localProfile.id,
      storage
    })
  }

  return {
    acceptInviteAsRecipient,
    acceptMessageRequest,
    appendIncomingRequest,
    closeAll,
    closeThreads,
    dismissMessage,
    findThread,
    getSession,
    loadThreads: loadLocalThreads,
    markThreadRead,
    openLocalThreads,
    receiveMessage,
    replaceThreads,
    saveThread,
    sendMessageOrRequest,
    start
  }
}

type DesktopDmStorage = {
  getItem?: (key: string) => string | null | undefined
  setItem?: (key: string, value: string) => unknown
}

type DesktopDmProfile = {
  dmEncryptionKeyPair: DmEncryptionKeyPair | null
  id: string
  identity: SigningIdentity
}

type DmThreadRuntime = {
  closeAll(): unknown | Promise<unknown>
  closeThread(threadId: string): unknown | Promise<unknown>
  openThread(thread: DmThread): unknown | Promise<unknown>
  receiveMessage(message: DmMessage): boolean
  sendMessage(payload: {
    createdAt?: number
    messageId: string
    text: string
    threadId: string
  }): DmMessage
}

type CreateThreadRuntime = (options: {
  identity: SigningIdentity
  loadMessages(thread: DmThread): DmMessage[] | Promise<DmMessage[]>
  localProfileId: string
  onMessage(thread: DmThread, message: DmMessage, direction: 'in' | 'out'): void
  saveMessages(thread: DmThread, messages: DmMessage[]): unknown | Promise<unknown>
}) => DmThreadRuntime

type AcceptInviteResult = DmThread | { book: ContactBook; thread: DmThread }

function hasAcceptedThread(
  value: AcceptInviteResult
): value is { book: ContactBook; thread: DmThread } {
  return Boolean((value as { thread?: unknown }).thread)
}

function readAcceptedThread(value: AcceptInviteResult): DmThread {
  return hasAcceptedThread(value) ? value.thread : value
}

type DesktopDmRuntimeOptions = {
  acceptInvite?: (options: {
    acceptedAt?: number
    canAcceptInvite(invite: DmInvite): boolean
    contactBook: ContactBook
    invite: DmInvite
    localProfileId: string
    recipientEncryptionKeyPair: DmEncryptionKeyPair
  }) => AcceptInviteResult
  acceptRequestWithInvite?: typeof acceptMessageRequestWithInvite
  createRequest?: typeof createMessageRequest
  createThreadRuntime?: CreateThreadRuntime
  loadMessages?: (options: {
    ownerProfileId: string
    storage?: DesktopDmStorage | null
    threadId: string
  }) => DmMessage[]
  loadSessionMessages?: (options: {
    ownerProfileId: string
    storage?: DesktopDmStorage | null
  }) => Record<string, unknown>[]
  loadThreads?: (options: {
    ownerProfileId: string
    storage?: DesktopDmStorage | null
  }) => DmThread[]
  onSessionChanged?: (session: DirectMessageSession) => void
  onThreadsChanged?: (threads: DmThread[]) => void
  saveMessages?: (options: {
    messages: DmMessage[]
    ownerProfileId: string
    storage?: DesktopDmStorage | null
    threadId: string
  }) => unknown
  saveSessionMessages?: (options: {
    messages: DirectMessageSession['messages']
    ownerProfileId: string
    storage?: DesktopDmStorage | null
  }) => unknown
  saveThreads?: (options: {
    ownerProfileId: string
    storage?: DesktopDmStorage | null
    threads: DmThread[]
  }) => unknown
}

export type DesktopDmRuntime = {
  acceptInviteAsRecipient(options: {
    acceptedAt?: number
    contactBook: ContactBook
    invite: DmInvite
    recipientEncryptionKeyPair: DmEncryptionKeyPair
  }): Promise<AcceptInviteResult | null>
  acceptMessageRequest(options: {
    acceptedAt?: number
    book: ContactBook
    remoteProfileId: string
    threadId: string
  }): Promise<ReturnType<typeof acceptMessageRequestWithInvite> | null>
  appendIncomingRequest(message: MessageRequest): boolean
  closeAll(): Promise<void>
  closeThreads(threadIds: string[]): Promise<void>
  dismissMessage(options: { id?: string }): DirectMessageSession | null
  findThread(remoteProfileId: string): DmThread | undefined
  getSession(): DirectMessageSession | null
  loadThreads(): DmThread[]
  markThreadRead(options?: { profileId?: string; readAt?: number }): DmThread | null
  openLocalThreads(): Promise<void>
  receiveMessage(message: DmMessage): boolean
  replaceThreads(threads: DmThread[]): void
  saveThread(thread: DmThread): void
  sendMessageOrRequest(options: {
    createdAt?: number
    messageId: string
    requestId: string
    text?: string
    toProfileId?: string
  }):
    | { kind: 'message'; message: DmMessage; thread: DmThread }
    | { kind: 'request'; request: MessageRequest }
    | null
  start(options: {
    nick?: string
    profile: DesktopDmProfile
    storage?: DesktopDmStorage | null
  }): Promise<DirectMessageSession | null>
}
