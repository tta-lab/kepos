import b4a from 'b4a'
import crypto from 'hypercore-crypto'
import { acceptMessageRequest, getContact } from './contact-book.ts'
import type { ContactBook } from './contact-book.ts'
import { createDmInvite, openDmInvite } from './dm-invite.ts'
import type { DmEncryptionKeyPair, DmInvite, DmInvitePayload } from './dm-invite.ts'
import { acceptDmThread, createDmThread } from './dm-thread.ts'
import type { DmThread } from './dm-thread.ts'
import type { SigningIdentity } from './signed-record.ts'

export function acceptMessageRequestWithInvite({
  acceptedAt = Date.now(),
  acceptorIdentity,
  book,
  remoteProfileId,
  threadId
}: {
  acceptedAt?: number
  acceptorIdentity: SigningIdentity
  book: ContactBook
  remoteProfileId: string
  threadId: string
}): {
  book: ContactBook
  invite: DmInvite
  thread: DmThread
} {
  const contact = getContact(book, remoteProfileId)
  if (contact?.revokedAt !== undefined && contact.revokedAt !== null) {
    throw new Error('Revoked contact cannot be accepted')
  }

  const request = book?.pendingRequestsByProfileId?.get(remoteProfileId)

  if (!request) {
    throw new Error('Pending message request is required')
  }

  const channelPublicKey = createKey()
  const channelDiscoveryKey = createKey()
  const pendingThread = createDmThread({
    channelDiscoveryKey,
    channelPublicKey,
    createdAt: acceptedAt,
    localProfileId: acceptorIdentity?.publicKey,
    remoteProfileId,
    requestId: request.requestId,
    threadId
  })
  const thread = acceptDmThread(pendingThread, { acceptedAt })
  const invite = createDmInvite({
    channelDiscoveryKey,
    channelPublicKey,
    createdAt: acceptedAt,
    fromIdentity: acceptorIdentity,
    inviteId: `${threadId}:invite`,
    payload: {
      channelDiscoveryKey,
      channelPublicKey,
      threadId
    },
    recipientEncryptionPublicKey: requireString(
      request.senderEncryptionPublicKey,
      'Sender encryption public key is required'
    ),
    requestId: request.requestId,
    toProfileId: remoteProfileId
  })
  const nextBook = acceptMessageRequest(book, {
    acceptedAt,
    alias: request.alias || request.displayNameSnapshot || remoteProfileId.slice(0, 12),
    profileId: remoteProfileId
  })

  return {
    book: nextBook,
    invite,
    thread
  }
}

export function openAcceptedMessageRequestInvite({
  invite,
  now = Date.now(),
  recipientEncryptionKeyPair
}: {
  invite: DmInvite
  now?: number
  recipientEncryptionKeyPair: DmEncryptionKeyPair
}): DmInvitePayload {
  return openDmInvite({ invite, now, recipientEncryptionKeyPair })
}

function createKey(): string {
  return b4a.toString(crypto.randomBytes(32), 'hex')
}

function requireString(value: unknown, message: string): string {
  const cleaned = typeof value === 'string' ? value.trim() : ''

  if (!cleaned) {
    throw new Error(message)
  }

  return cleaned
}
