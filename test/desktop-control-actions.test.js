import assert from 'node:assert/strict'
import test from 'node:test'
import { createContactBook, trustContact } from '../src/contact-book.ts'
import { createAvatarMediaReference } from '../src/avatar-media.ts'
import { avatarMediaBase64 } from '../src/avatar-media-storage.ts'
import { createDesktopControlActions } from '../src/desktop-control-actions.ts'
import { createProfileHomeDescriptorFrame } from '../src/profile-friend-request-transport.ts'
import { createSignedHomeAddressPayload } from '../src/signed-qr-payload.ts'
import { createSigningKeyPair } from '../src/signed-record.ts'

function createHarness(overrides = {}) {
  const calls = []
  let homeJoinDetails = { ownerProfileId: '', profileId: 'local' }
  const context = {
    contactBook: { ownerProfileId: 'local' },
    profile: {
      id: 'local',
      dmEncryptionKeyPair: { publicKey: 'dm-public' }
    },
    saveContactBook(book) {
      calls.push(['saveContactBook', book])
    }
  }
  const dmRuntime = {
    acceptInviteAsRecipient(payload) {
      calls.push(['dm.acceptInviteAsRecipient', payload])
    },
    appendIncomingRequest(request) {
      calls.push(['dm.appendIncomingRequest', request])
    },
    getSession() {
      return { localProfileId: 'local' }
    },
    receiveMessage(message) {
      calls.push(['dm.receiveMessage', message])
      return true
    }
  }
  const homeRuntime = {
    isJoined: () => true,
    sendControl(peer, payload) {
      calls.push(['home.sendControl', peer, payload])
    }
  }
  const treeholeRuntime = {
    addWriter(writer) {
      calls.push(['treehole.addWriter', writer])
    },
    createBootstrapControl(profileId) {
      return { profileId, type: 'treehole.bootstrap' }
    },
    createWriterControl() {
      return { type: 'treehole.writer' }
    }
  }
  const actions = createDesktopControlActions({
    configureTreeholeRuntime: () => calls.push(['treehole.configure']),
    createControlMessageResult: ({ message, peer }) => {
      if (message.type === 'kepos.message.request.v1') {
        return {
          appendIncomingRequest: message,
          book: { pending: message.fromProfileId },
          kind: 'message_request'
        }
      }
      if (message.type === 'kepos.dm.invite.v1') {
        return {
          book: message.nextBook,
          kind: 'dm_invite'
        }
      }
      if (message.type === 'treehole.bootstrap') {
        return {
          bootstrapKey: message.key,
          kind: 'treehole_bootstrap',
          ownerProfileId: message.ownerProfileId,
          sendWriterPeer: peer
        }
      }
      if (message.type === 'treehole.writer') {
        return { kind: 'treehole_writer', writer: message }
      }
      return null
    },
    createTreeholeControlSendResult: ({
      createBootstrapControl,
      createWriterControl,
      peer,
      remoteProfileId,
      type
    }) => ({
      payload:
        type === 'bootstrap' ? createBootstrapControl(remoteProfileId) : createWriterControl(),
      peer
    }),
    getDmRuntime: () => dmRuntime,
    getHomeJoinDetails: () => homeJoinDetails,
    getHomeRuntime: () => homeRuntime,
    getProfileContext: () => context,
    getTreeholeRuntime: () => treeholeRuntime,
    onChanged: () => calls.push(['render']),
    openTreehole: (bootstrapKey) => calls.push(['treehole.open', bootstrapKey]),
    setHomeJoinDetails: (nextDetails) => {
      homeJoinDetails = nextDetails
    },
    setNotice: (notice) => calls.push(['notice', notice]),
    shortenProfileId: (profileId) => `short:${profileId}`,
    ...overrides
  })

  return {
    actions,
    calls,
    get homeJoinDetails() {
      return homeJoinDetails
    }
  }
}

test('desktop control actions append incoming message requests', async () => {
  const { actions, calls } = createHarness()
  const message = {
    fromProfileId: 'friend',
    id: 'request-1',
    type: 'kepos.message.request.v1'
  }

  await actions.handleControl(message, undefined, { source: 'profile' })

  assert.deepEqual(calls, [
    ['saveContactBook', { pending: 'friend' }],
    ['dm.appendIncomingRequest', message],
    ['notice', 'Friend request received.'],
    ['render']
  ])
})

test('desktop control actions ignore Home-control message requests by default', async () => {
  const { actions, calls } = createHarness()

  await actions.handleControl(
    {
      fromProfileId: 'friend',
      id: 'request-1',
      type: 'kepos.message.request.v1'
    },
    'peer-1'
  )

  assert.deepEqual(calls, [])
})

test('desktop control actions can receive debug Home-control message requests explicitly', async () => {
  const { actions, calls } = createHarness({ allowHomeTrustFallback: true })
  const message = {
    fromProfileId: 'friend',
    id: 'request-1',
    type: 'kepos.message.request.v1'
  }

  await actions.handleControl(message, 'peer-1')

  assert.deepEqual(calls, [
    ['saveContactBook', { pending: 'friend' }],
    ['dm.appendIncomingRequest', message],
    ['notice', 'Friend request received.'],
    ['render']
  ])
})

test('desktop control actions accept incoming DM invites', async () => {
  const { actions, calls } = createHarness()

  await actions.handleControl({ type: 'kepos.dm.invite.v1' }, undefined, { source: 'profile' })

  assert.deepEqual(calls, [['notice', 'Message thread ready.'], ['render']])
})

test('desktop control actions ignore Home-control DM invites by default', async () => {
  const { actions, calls } = createHarness()

  await actions.handleControl({ type: 'kepos.dm.invite.v1' }, 'peer-1')

  assert.deepEqual(calls, [])
})

test('desktop control actions persist contact book updates from accepted DM invites', async () => {
  const { actions, calls } = createHarness()
  const nextBook = { trusted: 'friend' }

  await actions.handleControl({ nextBook, type: 'kepos.dm.invite.v1' }, undefined, {
    source: 'profile'
  })

  assert.deepEqual(calls, [
    ['saveContactBook', nextBook],
    ['notice', 'Message thread ready.'],
    ['render']
  ])
})

test('desktop control actions store profile-delivered Home descriptor only for trusted contacts', async () => {
  const local = createSigningKeyPair()
  const remote = createSigningKeyPair()
  const descriptor = createSignedHomeAddressPayload({
    address: 'a'.repeat(64),
    createdAt: 1000,
    identity: remote,
    policy: 'trusted_only',
    roomKey: 'a'.repeat(64)
  })
  const frame = createProfileHomeDescriptorFrame({
    descriptor,
    descriptorId: 'descriptor-1',
    toProfileId: local.publicKey
  })
  const trustedBook = trustContact(createContactBook({ ownerProfileId: local.publicKey }), {
    alias: 'Remote',
    profileId: remote.publicKey,
    source: 'profile_request',
    trustedAt: 1001
  })
  const savedBooks = []
  const { actions, calls } = createHarness({
    getProfileContext: () => ({
      contactBook: savedBooks.at(-1) || trustedBook,
      profile: { id: local.publicKey },
      saveContactBook(book) {
        savedBooks.push(book)
      }
    })
  })

  await actions.handleControl(frame, undefined, { source: 'profile' })

  const savedContact = savedBooks[0].contactsByProfileId.get(remote.publicKey)
  assert.equal(savedContact.homeAddress, descriptor.address)
  assert.equal(savedContact.homeRoomKey, descriptor.roomKey)
  assert.equal(savedContact.proof, descriptor.proof)
  assert.deepEqual(calls, [['notice', 'Home entry details received.'], ['render']])
})

test('desktop control actions ignore untrusted profile-delivered Home descriptors', async () => {
  const local = createSigningKeyPair()
  const remote = createSigningKeyPair()
  const frame = createProfileHomeDescriptorFrame({
    descriptor: createSignedHomeAddressPayload({
      address: 'a'.repeat(64),
      identity: remote,
      roomKey: 'a'.repeat(64)
    }),
    descriptorId: 'descriptor-1',
    toProfileId: local.publicKey
  })
  const savedBooks = []
  const { actions, calls } = createHarness({
    getProfileContext: () => ({
      contactBook: createContactBook({ ownerProfileId: local.publicKey }),
      profile: { id: local.publicKey },
      saveContactBook(book) {
        savedBooks.push(book)
      }
    })
  })

  await actions.handleControl(frame, undefined, { source: 'profile' })

  assert.deepEqual(savedBooks, [])
  assert.deepEqual(calls, [])
})

test('desktop control actions route profile DM invites through local invite acceptance context', async () => {
  const captured = []
  const context = {
    contactBook: { outgoingRequestsByProfileId: new Map(), ownerProfileId: 'local' },
    profile: {
      id: 'local',
      dmEncryptionKeyPair: { privateKey: 'dm-private', publicKey: 'dm-public' }
    },
    saveContactBook(book) {
      captured.push(['saveContactBook', book])
    }
  }
  const { actions, calls } = createHarness({
    createControlMessageResult: (payload) => {
      captured.push(['payload', payload])
      payload.acceptInviteAsRecipient({ inviteId: 'invite-1' })
      return {
        book: { trusted: 'friend' },
        kind: 'dm_invite'
      }
    },
    getProfileContext: () => context
  })
  const message = {
    fromProfileId: 'friend',
    requestId: 'request-1',
    type: 'kepos.dm.invite.v1'
  }

  await actions.handleControl(message, undefined, { source: 'profile' })

  assert.equal(captured.length, 2)
  assert.equal(captured[0][0], 'payload')
  assert.equal(captured[0][1].contactBook, context.contactBook)
  assert.deepEqual(captured[0][1].currentDmSession, { localProfileId: 'local' })
  assert.equal(captured[0][1].message, message)
  assert.equal(captured[0][1].recipientEncryptionKeyPair, context.profile.dmEncryptionKeyPair)
  assert.deepEqual(captured[1], ['saveContactBook', { trusted: 'friend' }])
  assert.deepEqual(calls, [
    ['dm.acceptInviteAsRecipient', { inviteId: 'invite-1' }],
    ['notice', 'Message thread ready.'],
    ['render']
  ])
})

test('desktop control actions ignore signed DM body Home fallback frames by default', async () => {
  const { actions, calls } = createHarness()
  const message = {
    messageId: 'message-1',
    threadId: 'thread-1'
  }

  await actions.handleControl({ message, type: 'kepos.dm.body.v1' }, 'peer-1')

  assert.deepEqual(calls, [])
})

test('desktop control actions can receive debug signed DM body fallback frames explicitly', async () => {
  const { actions, calls } = createHarness({ allowHomeDmBodyFallback: true })
  const message = {
    messageId: 'message-1',
    threadId: 'thread-1'
  }

  await actions.handleControl({ message, type: 'kepos.dm.body.v1' }, 'peer-1')

  assert.deepEqual(calls, [['dm.receiveMessage', message], ['render']])
})

test('desktop control actions open treehole bootstrap and send writer control', async () => {
  const harness = createHarness()

  await harness.actions.handleControl(
    {
      key: 'bootstrap-key',
      ownerProfileId: 'owner',
      type: 'treehole.bootstrap'
    },
    'peer-1'
  )

  assert.deepEqual(harness.homeJoinDetails, { ownerProfileId: 'owner', profileId: 'local' })
  assert.deepEqual(harness.calls, [
    ['treehole.configure'],
    ['treehole.open', 'bootstrap-key'],
    ['home.sendControl', 'peer-1', { type: 'treehole.writer' }]
  ])
})

test('desktop control actions add treehole writers and send bootstrap controls', async () => {
  const { actions, calls } = createHarness()

  await actions.handleControl({ key: 'writer-key', type: 'treehole.writer' }, 'peer-1')
  actions.sendTreeholeBootstrap('peer-2', 'friend')

  assert.deepEqual(calls, [
    ['treehole.addWriter', { key: 'writer-key', type: 'treehole.writer' }],
    ['home.sendControl', 'peer-2', { profileId: 'friend', type: 'treehole.bootstrap' }]
  ])
})

test('desktop control actions store verified avatar media control bytes', async () => {
  const bytes = Uint8Array.from([1, 2, 3])
  const reference = createAvatarMediaReference({
    bytes,
    createdAt: 1000,
    mimeType: 'image/png',
    sha256Hex: () => 'a'.repeat(64)
  })
  const context = {
    contactBook: {
      contactsByProfileId: new Map([
        [
          'profile-a',
          {
            alias: 'Ada',
            avatarMediaSnapshot: reference,
            profileId: 'profile-a'
          }
        ]
      ]),
      outgoingRequestsByProfileId: new Map(),
      ownerProfileId: 'local',
      pendingRequestsByProfileId: new Map()
    },
    profile: { dmEncryptionKeyPair: { publicKey: 'dm-public' } },
    saveContactBook() {}
  }
  const writes = new Map()
  const { actions, calls } = createHarness({
    getProfileContext: () => context,
    storeAvatarMediaBytesControl: (payload) => {
      calls.push(['avatar.store', payload.message.profileId])
      return {
        kind: 'avatar_media_stored',
        profileId: payload.message.profileId,
        storageUri: `file:///app/${payload.message.reference.digest}.png`
      }
    }
  })

  await actions.handleControl(
    {
      bytesBase64: avatarMediaBase64.encode(bytes),
      profileId: 'profile-a',
      reference,
      type: 'kepos.avatar.media.bytes.v1',
      writeBytes: (path, value) => writes.set(path, value)
    },
    'peer-1'
  )

  assert.deepEqual(calls, [
    ['avatar.store', 'profile-a'],
    ['notice', 'Profile image received.'],
    ['render']
  ])
})

test('desktop control actions send local avatar media bytes to a verified peer', async () => {
  const bytes = Uint8Array.from([7, 8, 9])
  const reference = createAvatarMediaReference({
    bytes,
    createdAt: 1000,
    mimeType: 'image/webp',
    sha256Hex: () => 'b'.repeat(64)
  })
  const context = {
    contactBook: { ownerProfileId: 'local' },
    profile: {
      avatarMedia: reference,
      id: 'local'
    },
    saveContactBook() {}
  }
  const { actions, calls } = createHarness({
    getProfileContext: () => context,
    readLocalAvatarMediaBytes: () => bytes
  })

  await actions.sendProfileAvatarMedia('peer-1')

  assert.deepEqual(calls, [
    [
      'home.sendControl',
      'peer-1',
      {
        bytesBase64: avatarMediaBase64.encode(bytes),
        profileId: 'local',
        reference,
        type: 'kepos.avatar.media.bytes.v1'
      }
    ]
  ])
})
