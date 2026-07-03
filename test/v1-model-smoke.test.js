import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, test } from 'node:test'

import {
  canContactAccessHome,
  createContactBook,
  createTreeholePolicyFromContactBook,
  isContactTrusted,
  listTrustedContacts,
  recordOutgoingFriendRequest,
  revokeContact
} from '../src/contact-book.ts'
import { createContactProfileViewModel } from '../src/contact-profile-view-model.ts'
import { createDmEncryptionKeyPair, verifyDmInvite } from '../src/dm-invite.ts'
import { acceptDmInviteAsRecipientWithContactBook } from '../src/dm-invite-acceptance.ts'
import { createSignedDmMessage, verifySignedDmMessage } from '../src/dm-message.ts'
import { loadDmMessagesFromStorage, saveDmMessagesToStorage } from '../src/dm-message-storage.ts'
import { createDmThreadRuntime } from '../src/dm-thread-runtime.ts'
import { isDmThreadActive } from '../src/dm-thread.ts'
import { createFriendRequestTargetViewModel } from '../src/friend-request-target-view-model.ts'
import {
  acceptMessageRequestWithInvite,
  openAcceptedMessageRequestInvite
} from '../src/message-request-acceptance.ts'
import { applyMessageRequestToContactBook, createMessageRequest } from '../src/message-request.ts'
import {
  canRespondToFriendRequestForRelationshipState,
  resolveProfileRelationshipStateFromBook
} from '../src/profile-relationship-state.ts'
import { createRequestTargetProfileViewModel } from '../src/request-target-profile-view-model.ts'
import { createSigningKeyPair } from '../src/signed-record.ts'
import {
  applySignedQrUriToContactBook,
  readSignedProfileQrRequestTarget
} from '../src/signed-qr-scan.ts'
import {
  createSignedHomeAddressPayload,
  createSignedTrustInvitePayload,
  encodeQrUri
} from '../src/signed-qr-payload.ts'
import { createTreeholeBase } from '../src/treehole-base.ts'
import { canGrantTreeholeWriter } from '../src/treehole-policy.ts'

describe('V1 model smoke', () => {
  test('follows the Profile-first request target flow before Chat, Treehole, and Home access', () => {
    const owner = createSigningKeyPair()
    const requester = createSigningKeyPair()
    const requesterDmEncryption = createDmEncryptionKeyPair()
    let ownerBook = createContactBook({ ownerProfileId: owner.publicKey })
    let requesterBook = createContactBook({ ownerProfileId: requester.publicKey })
    const ownerProfileUri = encodeQrUri(
      createSignedTrustInvitePayload({
        createdAt: 1000,
        displayName: 'Owner',
        identity: owner
      })
    )
    const ownerHomeUri = encodeQrUri(
      createSignedHomeAddressPayload({
        address: 'a'.repeat(64),
        createdAt: 3000,
        identity: owner,
        policy: 'trusted_only',
        roomKey: 'b'.repeat(64)
      })
    )

    const requestTarget = readSignedProfileQrRequestTarget({
      now: 1001,
      uri: ownerProfileUri
    })

    assert.equal(requestTarget.kind, 'profile_request_target')
    assert.equal(isContactTrusted(requesterBook, owner.publicKey), false)
    assert.equal(
      resolveProfileRelationshipStateFromBook({
        book: requesterBook,
        profileId: owner.publicKey
      }),
      'request_target'
    )

    const chatTarget = createFriendRequestTargetViewModel({
      contactBook: requesterBook,
      target: requestTarget
    })
    const profileTarget = createRequestTargetProfileViewModel({
      requestTarget: chatTarget,
      selectedProfileId: owner.publicKey
    })

    assert.equal(chatTarget.relationshipState, 'request_target')
    assert.equal(chatTarget.canSendRequest, true)
    assert.equal(profileTarget?.relationshipState, 'request_target')
    assert.equal(profileTarget?.messageEnabled, true)
    assert.equal(profileTarget?.enterHomeEnabled, false)

    const request = createMessageRequest({
      createdAt: 1100,
      fromIdentity: requester,
      requestId: 'request-1',
      senderEncryptionPublicKey: requesterDmEncryption.publicKey,
      text: 'hello owner',
      toProfileId: owner.publicKey
    })

    requesterBook = recordOutgoingFriendRequest(requesterBook, {
      alias: requestTarget.displayName,
      displayNameSnapshot: requestTarget.displayName,
      profileId: owner.publicKey,
      requestedAt: request.createdAt,
      requestId: request.requestId,
      senderEncryptionPublicKey: requesterDmEncryption.publicKey,
      signedRequest: request,
      source: 'profile_qr',
      text: request.text
    })

    assert.equal(
      resolveProfileRelationshipStateFromBook({
        book: requesterBook,
        profileId: owner.publicKey
      }),
      'outgoing_request'
    )
    assert.equal(
      createFriendRequestTargetViewModel({
        contactBook: requesterBook,
        target: requestTarget
      }).canSendRequest,
      false
    )

    ownerBook = applyMessageRequestToContactBook(ownerBook, {
      alias: 'Requester',
      request,
      source: 'profile_qr'
    })
    const ownerRelationship = resolveProfileRelationshipStateFromBook({
      book: ownerBook,
      profileId: requester.publicKey
    })

    assert.equal(ownerRelationship, 'incoming_request')
    assert.equal(canRespondToFriendRequestForRelationshipState(ownerRelationship), true)

    const accepted = acceptMessageRequestWithInvite({
      acceptedAt: 2000,
      acceptorIdentity: owner,
      book: ownerBook,
      remoteProfileId: requester.publicKey,
      threadId: 'thread-1'
    })
    ownerBook = accepted.book
    const requesterAccepted = acceptDmInviteAsRecipientWithContactBook({
      acceptedAt: 2001,
      contactBook: requesterBook,
      invite: accepted.invite,
      localProfileId: requester.publicKey,
      recipientEncryptionKeyPair: requesterDmEncryption
    })
    requesterBook = requesterAccepted.book

    assert.equal(isContactTrusted(ownerBook, requester.publicKey), true)
    assert.equal(isContactTrusted(requesterBook, owner.publicKey), true)
    assert.equal(ownerBook.pendingRequestsByProfileId.has(requester.publicKey), false)
    assert.equal(requesterBook.outgoingRequestsByProfileId.has(owner.publicKey), false)
    assert.equal(isDmThreadActive(accepted.thread), true)
    assert.equal(isDmThreadActive(requesterAccepted.thread), true)

    const ownerProfile = createContactProfileViewModel({
      contact: requesterBook.contactsByProfileId.get(owner.publicKey),
      formatDate: (value) => `date:${value}`,
      shortenProfileId: (profileId) => profileId
    })
    const ownerPolicy = createTreeholePolicyFromContactBook(ownerBook)

    assert.equal(ownerProfile.relationshipState, 'trusted')
    assert.equal(ownerProfile.messageEnabled, true)
    assert.equal(
      canGrantTreeholeWriter({
        ownerProfileId: owner.publicKey,
        policy: ownerPolicy,
        writerProfileId: requester.publicKey
      }),
      true
    )

    const homeJoin = applySignedQrUriToContactBook({
      book: requesterBook,
      localProfileId: requester.publicKey,
      uri: ownerHomeUri
    })

    assert.equal(homeJoin.kind, 'home')
    assert.equal(homeJoin.canEnter, true)
    requesterBook = homeJoin.book
    assert.equal(canContactAccessHome(requesterBook, owner.publicKey), true)
  })

  test('ties QR trust, trusted home access, treehole writer rights, and accepted DM together', async () => {
    const owner = createSigningKeyPair()
    const peer = createSigningKeyPair()
    const requester = createSigningKeyPair()
    const requesterDmEncryption = createDmEncryptionKeyPair()
    let ownerBook = createContactBook({ ownerProfileId: owner.publicKey })
    let peerBook = createContactBook({ ownerProfileId: peer.publicKey })
    const ownerProfileUri = encodeQrUri(
      createSignedTrustInvitePayload({
        createdAt: 1000,
        displayName: 'Owner',
        identity: owner
      })
    )
    const peerProfileUri = encodeQrUri(
      createSignedTrustInvitePayload({
        createdAt: 1000,
        displayName: 'Peer',
        identity: peer
      })
    )
    const ownerHomeUri = encodeQrUri(
      createSignedHomeAddressPayload({
        address: 'a'.repeat(64),
        createdAt: 1100,
        identity: owner,
        policy: 'trusted_only',
        roomKey: 'b'.repeat(64)
      })
    )

    assert.equal(
      applySignedQrUriToContactBook({
        book: peerBook,
        localProfileId: peer.publicKey,
        uri: ownerHomeUri
      }).canEnter,
      false
    )

    peerBook = applySignedQrUriToContactBook({
      alias: 'Owner',
      book: peerBook,
      source: 'profile_qr',
      uri: ownerProfileUri
    }).book
    ownerBook = applySignedQrUriToContactBook({
      alias: 'Peer',
      book: ownerBook,
      source: 'profile_qr',
      uri: peerProfileUri
    }).book

    const homeJoin = applySignedQrUriToContactBook({
      book: peerBook,
      localProfileId: peer.publicKey,
      uri: ownerHomeUri
    })

    assert.equal(homeJoin.kind, 'home')
    assert.equal(homeJoin.canEnter, true)
    assert.equal(homeJoin.ownerProfileId, owner.publicKey)
    assert.equal(isContactTrusted(ownerBook, peer.publicKey), true)
    assert.equal(isContactTrusted(peerBook, owner.publicKey), true)
    assert.deepEqual(listTrustedContacts(ownerBook), [
      {
        alias: 'Peer',
        profileId: peer.publicKey
      }
    ])

    const ownerPolicy = createTreeholePolicyFromContactBook(ownerBook)

    assert.equal(
      canGrantTreeholeWriter({
        ownerProfileId: owner.publicKey,
        policy: ownerPolicy,
        writerProfileId: peer.publicKey
      }),
      true
    )
    assert.equal(
      canGrantTreeholeWriter({
        ownerProfileId: owner.publicKey,
        policy: ownerPolicy,
        writerProfileId: createSigningKeyPair().publicKey
      }),
      false
    )

    const treeholeState = await smokeSignedTreehole({
      owner,
      ownerPolicy,
      peer
    })

    assert.deepEqual(
      treeholeState.posts.map((post) => ({
        authorProfileId: post.authorProfileId,
        commentCount: post.commentCount,
        id: post.id,
        likeCount: post.likeCount,
        text: post.text
      })),
      [
        {
          authorProfileId: owner.publicKey,
          commentCount: 1,
          id: 'post-1',
          likeCount: 1,
          text: 'owner treehole'
        }
      ]
    )

    const request = createMessageRequest({
      createdAt: 2000,
      fromIdentity: requester,
      requestId: 'request-1',
      senderEncryptionPublicKey: requesterDmEncryption.publicKey,
      text: 'hello owner',
      toProfileId: owner.publicKey
    })
    ownerBook = applyMessageRequestToContactBook(ownerBook, {
      alias: 'Requester',
      request,
      source: 'home_room'
    })
    const accepted = acceptMessageRequestWithInvite({
      acceptedAt: 2100,
      acceptorIdentity: owner,
      book: ownerBook,
      remoteProfileId: requester.publicKey,
      threadId: 'thread-1'
    })
    ownerBook = accepted.book
    const openedInvite = openAcceptedMessageRequestInvite({
      invite: accepted.invite,
      recipientEncryptionKeyPair: requesterDmEncryption
    })

    assert.equal(isContactTrusted(ownerBook, requester.publicKey), true)
    assert.equal(ownerBook.pendingRequestsByProfileId.has(requester.publicKey), false)
    assert.equal(verifyDmInvite(accepted.invite), true)
    assert.equal(openedInvite.threadId, accepted.thread.threadId)
    assert.equal(isDmThreadActive(accepted.thread), true)

    const storedMessages = await smokeDmThreadPersistence({
      localIdentity: owner,
      remoteIdentity: requester,
      thread: accepted.thread
    })

    assert.equal(storedMessages.length, 2)
    assert.equal(
      storedMessages.every((message) => message.threadId === accepted.thread.threadId),
      true
    )
    assert.equal(
      storedMessages.every((message) => verifySignedDmMessage(message)),
      true
    )

    const revokedBook = revokeContact(ownerBook, {
      profileId: peer.publicKey,
      revokedAt: 3000
    })
    const revokedPolicy = createTreeholePolicyFromContactBook(revokedBook)

    assert.equal(
      canGrantTreeholeWriter({
        ownerProfileId: owner.publicKey,
        policy: revokedPolicy,
        writerProfileId: peer.publicKey
      }),
      false
    )
  })
})

async function smokeSignedTreehole({ owner, ownerPolicy, peer }) {
  const ownerStorage = await mkdtemp(join(tmpdir(), 'kepos-v1-treehole-owner-'))
  const peerStorage = await mkdtemp(join(tmpdir(), 'kepos-v1-treehole-peer-'))

  try {
    const ownerTreehole = await createTreeholeBase({
      identity: owner,
      mode: 'signed',
      nick: 'Owner',
      storage: ownerStorage,
      treeholeOwnerProfileId: owner.publicKey,
      treeholePolicy: ownerPolicy
    })
    const peerTreehole = await createTreeholeBase({
      bootstrapKey: ownerTreehole.key,
      identity: peer,
      mode: 'signed',
      nick: 'Peer',
      storage: peerStorage,
      treeholeOwnerProfileId: owner.publicKey,
      treeholePolicy: ownerPolicy
    })

    await ownerTreehole.post({
      createdAt: 1200,
      id: 'post-1',
      text: 'owner treehole'
    })
    await ownerTreehole.addWriter(peerTreehole.localWriterKey, {
      profileId: peer.publicKey
    })
    await replicateOnce(ownerTreehole, peerTreehole)
    await peerTreehole.post({
      createdAt: 1300,
      id: 'post-2',
      text: 'peer main post must not enter owner treehole'
    })
    await peerTreehole.comment({
      createdAt: 1400,
      id: 'comment-1',
      postId: 'post-1',
      text: 'peer comment'
    })
    await peerTreehole.like({
      createdAt: 1500,
      postId: 'post-1'
    })
    await replicateOnce(ownerTreehole, peerTreehole)

    const state = await ownerTreehole.getState()

    await ownerTreehole.close()
    await peerTreehole.close()

    return state
  } finally {
    await rm(ownerStorage, { force: true, recursive: true })
    await rm(peerStorage, { force: true, recursive: true })
  }
}

async function smokeDmThreadPersistence({ localIdentity, remoteIdentity, thread }) {
  const storage = new MemoryStorage()
  const displayed = []
  const channels = []
  const runtime = createDmThreadRuntime({
    createChannel: (options) => new FakeDmChannel(options, channels),
    identity: localIdentity,
    loadMessages: (nextThread) =>
      loadDmMessagesFromStorage({
        ownerProfileId: localIdentity.publicKey,
        storage,
        threadId: nextThread.threadId
      }),
    localProfileId: localIdentity.publicKey,
    onMessage: (nextThread, message, direction) =>
      displayed.push({ direction, message, thread: nextThread }),
    saveMessages: (nextThread, messages) =>
      saveDmMessagesToStorage({
        messages,
        ownerProfileId: localIdentity.publicKey,
        storage,
        threadId: nextThread.threadId
      })
  })
  const incoming = channels.at(-1)?.sendRemoteMessage({
    createdAt: 2200,
    identity: remoteIdentity,
    messageId: 'remote-1',
    text: 'hello over dm',
    threadId: thread.threadId
  })

  assert.equal(incoming, undefined)

  await runtime.openThread(thread)
  const localMessage = runtime.sendMessage({
    createdAt: 2300,
    messageId: 'local-1',
    text: 'reply over dm',
    threadId: thread.threadId
  })
  channels[0].emitIncoming(
    channels[0].sendRemoteMessage({
      createdAt: 2200,
      identity: remoteIdentity,
      messageId: 'remote-1',
      text: 'hello over dm',
      threadId: thread.threadId
    })
  )

  assert.deepEqual(
    displayed.map((entry) => ({
      direction: entry.direction,
      messageId: entry.message.messageId
    })),
    [
      {
        direction: 'out',
        messageId: localMessage.messageId
      },
      {
        direction: 'in',
        messageId: 'remote-1'
      }
    ]
  )

  await runtime.closeAll()

  return loadDmMessagesFromStorage({
    ownerProfileId: localIdentity.publicKey,
    storage,
    threadId: thread.threadId
  })
}

async function replicateOnce(left, right) {
  const leftStream = left.replicate(true)
  const rightStream = right.replicate(false)

  leftStream.pipe(rightStream).pipe(leftStream)
  await Promise.all([left.base.update(), right.base.update()])
  await new Promise((resolve) => setTimeout(resolve, 50))
  await Promise.all([left.base.update(), right.base.update()])
  leftStream.destroy()
  rightStream.destroy()
}

class FakeDmChannel {
  constructor(options, channels) {
    this.broadcasted = []
    this.options = options
    channels.push(this)
  }

  broadcastMessages(messages) {
    this.broadcasted.push(messages)
  }

  emitIncoming(message) {
    this.options.onMessage(message)
  }

  joinThread() {
    return Promise.resolve()
  }

  leave() {
    return Promise.resolve()
  }

  sendMessage(payload) {
    return this.sendRemoteMessage({
      ...payload,
      identity: this.options.identity
    })
  }

  sendRemoteMessage(payload) {
    return createSignedDmMessage({
      createdAt: payload.createdAt,
      identity: payload.identity,
      messageId: payload.messageId,
      fromProfileId: payload.identity.publicKey,
      text: payload.text,
      threadId: payload.threadId
    })
  }
}

class MemoryStorage {
  constructor() {
    this.values = new Map()
  }

  getItem(key) {
    return this.values.get(key)
  }

  setItem(key, value) {
    this.values.set(key, value)
  }
}
