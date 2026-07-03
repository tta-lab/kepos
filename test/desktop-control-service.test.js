import assert from 'node:assert/strict'
import test from 'node:test'
import { createContactBook } from '../src/contact-book.ts'
import {
  createDesktopControlMessageResult,
  createDesktopTreeholeControlSendResult
} from '../src/desktop-control-service.ts'
import { createDmEncryptionKeyPair } from '../src/dm-invite.ts'
import { createMessageRequest } from '../src/message-request.ts'
import { createSigningKeyPair } from '../src/signed-record.ts'

test('desktop control service records incoming message requests for the local DM session', async () => {
  const from = createSigningKeyPair()
  const to = createSigningKeyPair()
  const fromEncryption = createDmEncryptionKeyPair()
  const book = createContactBook({ ownerProfileId: to.publicKey })
  const request = createMessageRequest({
    createdAt: 1000,
    fromIdentity: from,
    requestId: 'request-1',
    senderEncryptionPublicKey: fromEncryption.publicKey,
    text: 'hello',
    toProfileId: to.publicKey
  })

  const result = await createDesktopControlMessageResult({
    contactBook: book,
    currentDmSession: { localProfileId: to.publicKey },
    fallbackAlias: 'Friend',
    message: request
  })

  assert.equal(result.kind, 'message_request')
  assert.equal(result.appendIncomingRequest, request)
  assert.equal(result.book.pendingRequestsByProfileId.has(from.publicKey), true)
  assert.equal(result.book.pendingRequestsByProfileId.get(from.publicKey).alias, 'Friend')
})

test('desktop control service ignores message requests for another local profile', async () => {
  const from = createSigningKeyPair()
  const to = createSigningKeyPair()
  const other = createSigningKeyPair()
  const fromEncryption = createDmEncryptionKeyPair()
  const request = createMessageRequest({
    createdAt: 1000,
    fromIdentity: from,
    requestId: 'request-1',
    senderEncryptionPublicKey: fromEncryption.publicKey,
    text: 'hello',
    toProfileId: to.publicKey
  })

  const result = await createDesktopControlMessageResult({
    contactBook: createContactBook({ ownerProfileId: other.publicKey }),
    currentDmSession: { localProfileId: other.publicKey },
    fallbackAlias: 'Friend',
    message: request
  })

  assert.equal(result, null)
})

test('desktop control service accepts DM invites for the local DM session', async () => {
  const local = createSigningKeyPair()
  const contactBook = createContactBook({ ownerProfileId: local.publicKey })
  const recipientEncryptionKeyPair = createDmEncryptionKeyPair()
  const invite = {
    type: 'kepos.dm.invite.v1',
    inviteId: 'invite-1',
    toProfileId: local.publicKey
  }
  const calls = []

  const result = await createDesktopControlMessageResult({
    acceptInviteAsRecipient: (payload) => {
      calls.push(payload)
    },
    acceptedAt: 2000,
    contactBook,
    currentDmSession: { localProfileId: local.publicKey },
    message: invite,
    recipientEncryptionKeyPair
  })

  assert.equal(result.kind, 'dm_invite')
  assert.deepEqual(calls, [
    {
      acceptedAt: 2000,
      contactBook,
      invite,
      recipientEncryptionKeyPair
    }
  ])
})

test('desktop control service returns contact book updates from accepted DM invites', async () => {
  const local = createSigningKeyPair()
  const contactBook = createContactBook({ ownerProfileId: local.publicKey })
  const updatedBook = createContactBook({ ownerProfileId: local.publicKey })
  const recipientEncryptionKeyPair = createDmEncryptionKeyPair()
  const invite = {
    type: 'kepos.dm.invite.v1',
    inviteId: 'invite-1',
    toProfileId: local.publicKey
  }

  const result = await createDesktopControlMessageResult({
    acceptInviteAsRecipient: () => ({ book: updatedBook, thread: { threadId: 'thread-1' } }),
    acceptedAt: 2000,
    contactBook,
    currentDmSession: { localProfileId: local.publicKey },
    message: invite,
    recipientEncryptionKeyPair
  })

  assert.deepEqual(result, {
    book: updatedBook,
    kind: 'dm_invite'
  })
})

test('desktop control service maps treehole bootstrap control to open intent', async () => {
  const message = {
    type: 'treehole.bootstrap',
    key: 'tree-key',
    ownerProfileId: 'owner-1'
  }

  const result = await createDesktopControlMessageResult({
    message,
    peer: 'peer-1'
  })

  assert.deepEqual(result, {
    bootstrapKey: 'tree-key',
    kind: 'treehole_bootstrap',
    ownerProfileId: 'owner-1',
    sendWriterPeer: 'peer-1'
  })
})

test('desktop control service maps treehole writer control to writer intent', async () => {
  const message = {
    type: 'treehole.writer',
    key: 'writer-key',
    profileId: 'profile-1'
  }

  const result = await createDesktopControlMessageResult({
    message
  })

  assert.deepEqual(result, {
    kind: 'treehole_writer',
    writer: message
  })
})

test('desktop control service skips outbound treehole control when home is unavailable', () => {
  const result = createDesktopTreeholeControlSendResult({
    isHomeJoined: false,
    peer: 'peer-1',
    type: 'bootstrap'
  })

  assert.equal(result, null)
})

test('desktop control service maps outbound treehole bootstrap control to send intent', () => {
  const result = createDesktopTreeholeControlSendResult({
    createBootstrapControl: (remoteProfileId) => ({
      remoteProfileId,
      type: 'treehole.bootstrap'
    }),
    isHomeJoined: true,
    peer: 'peer-1',
    remoteProfileId: 'profile-1',
    type: 'bootstrap'
  })

  assert.deepEqual(result, {
    payload: {
      remoteProfileId: 'profile-1',
      type: 'treehole.bootstrap'
    },
    peer: 'peer-1'
  })
})

test('desktop control service maps outbound treehole writer control to send intent', () => {
  const result = createDesktopTreeholeControlSendResult({
    createWriterControl: () => ({
      type: 'treehole.writer'
    }),
    isHomeJoined: true,
    peer: 'peer-1',
    type: 'writer'
  })

  assert.deepEqual(result, {
    payload: {
      type: 'treehole.writer'
    },
    peer: 'peer-1'
  })
})
