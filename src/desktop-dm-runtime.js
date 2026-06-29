import {
  appendLocalMessageRequest,
  appendLocalSignedDirectMessage,
  appendRemoteMessageRequest,
  appendRemoteSignedDirectMessage,
  dismissDirectMessage,
  hasOutgoingMessageRequest,
  restoreDirectMessageSession
} from './dm-session.ts'
import { acceptDmInviteAsRecipient } from './dm-invite-acceptance.js'
import { loadDmMessagesFromStorage, saveDmMessagesToStorage } from './dm-message-storage.ts'
import {
  loadDmSessionMessagesFromStorage,
  saveDmSessionMessagesToStorage
} from './dm-session-storage.ts'
import { createDmThreadRuntime } from './dm-thread-runtime.js'
import { loadDmThreadsFromStorage, saveDmThreadsToStorage } from './dm-thread-storage.ts'
import { createMessageRequest } from './message-request.ts'
import { acceptMessageRequestWithInvite } from './message-request-acceptance.js'

export function createDesktopDmRuntime({
  acceptInvite = acceptDmInviteAsRecipient,
  acceptRequestWithInvite = acceptMessageRequestWithInvite,
  createRequest = createMessageRequest,
  createThreadRuntime = createDmThreadRuntime,
  loadMessages = loadDmMessagesFromStorage,
  loadSessionMessages = loadDmSessionMessagesFromStorage,
  loadThreads = loadDmThreadsFromStorage,
  onSessionChanged = () => {},
  saveMessages = saveDmMessagesToStorage,
  saveSessionMessages = saveDmSessionMessagesToStorage,
  saveThreads = saveDmThreadsToStorage
} = {}) {
  let dmSession = null
  let dmRuntime = null
  let localProfile = null
  let nick = 'Desktop'
  let startVersion = 0
  let storage = null

  async function start({ nick: nextNick, profile, storage: nextStorage }) {
    const version = startVersion + 1
    startVersion = version
    const previousRuntime = dmRuntime

    await previousRuntime?.closeAll()
    if (version !== startVersion) return dmSession

    localProfile = profile
    nick = nextNick?.trim() || 'Desktop'
    storage = nextStorage
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
    broadcastControl = () => {},
    createdAt,
    messageId,
    requestId,
    text,
    toProfileId
  }) {
    const cleanText = text?.trim()
    if (!dmSession || !localProfile || !toProfileId || !cleanText) return null

    const thread = findThread(toProfileId)
    if (thread && dmRuntime) {
      const message = dmRuntime.sendMessage({
        createdAt,
        messageId,
        text: cleanText,
        threadId: thread.threadId
      })

      return { kind: 'message', message, thread }
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
    broadcastControl(request)
    return { kind: 'request', request }
  }

  function appendIncomingRequest(message) {
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
  }) {
    if (!localProfile) return null

    const thread = acceptInvite({
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

    saveThread(thread)
    await openThread(thread)
    return thread
  }

  async function acceptMessageRequest({ acceptedAt, book, remoteProfileId, threadId }) {
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

  function dismissMessage({ id }) {
    if (!dmSession || !id) return dmSession

    dmSession = dismissDirectMessage(dmSession, { id })
    saveCurrentSessionMessages()
    onSessionChanged(dmSession)
    return dmSession
  }

  function receiveMessage(message) {
    return dmRuntime?.receiveMessage(message) || false
  }

  function findThread(remoteProfileId) {
    return loadLocalThreads().find(
      (thread) =>
        thread.remoteProfileId === remoteProfileId &&
        thread.state === 'accepted' &&
        thread.revokedAt === undefined
    )
  }

  function replaceThreads(threads) {
    if (!localProfile) return

    saveThreads({
      ownerProfileId: localProfile.id,
      storage,
      threads
    })
  }

  async function closeThreads(threadIds) {
    await Promise.all(threadIds.map((threadId) => dmRuntime?.closeThread(threadId)))
  }

  async function openLocalThreads() {
    await Promise.all(loadLocalThreads().map((thread) => openThread(thread)))
  }

  async function openThread(thread) {
    if (thread.state !== 'accepted' || thread.revokedAt !== undefined) return

    await dmRuntime?.openThread(thread)
  }

  function saveThread(thread) {
    const threads = loadLocalThreads()
    const nextThreads = [
      ...threads.filter((existing) => existing.threadId !== thread.threadId),
      thread
    ]

    replaceThreads(nextThreads)
  }

  function loadLocalThreads() {
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
    openLocalThreads,
    receiveMessage,
    replaceThreads,
    saveThread,
    sendMessageOrRequest,
    start
  }
}
