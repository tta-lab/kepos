import assert from 'node:assert/strict'
import test from 'node:test'
import { createAvatarMediaReference } from '../src/avatar-media.ts'
import { createContactBook, recordOutgoingFriendRequest } from '../src/contact-book.ts'
import { createDesktopMessageActions } from '../src/desktop-message-actions.ts'

test('desktop message actions send home chat through the home runtime', () => {
  const renders = []
  let session = { messages: [] }
  const sent = []
  const actions = createDesktopMessageActions({
    createId: () => 'message-1',
    getHomeRuntime: () => ({
      isJoined: () => true,
      sendMessage(message) {
        sent.push(message)
        return { messages: [message] }
      }
    }),
    getSession: () => session,
    now: () => 123,
    onChanged: () => renders.push('render'),
    setSession: (nextSession) => {
      session = nextSession
    }
  })

  actions.sendHomeMessage({ text: '  hello  ' })

  assert.deepEqual(sent, [{ at: 123, id: 'message-1', text: 'hello' }])
  assert.deepEqual(session.messages, [{ at: 123, id: 'message-1', text: 'hello' }])
  assert.deepEqual(renders, ['render'])
})

test('desktop message actions send direct messages through the dm runtime without Home control', async () => {
  const broadcasts = []
  const calls = []
  const renders = []
  let nextId = 0
  const actions = createDesktopMessageActions({
    createId: () => `id-${nextId++}`,
    getDmRuntime: () => ({
      sendMessageOrRequest(payload) {
        calls.push(payload)
        payload.broadcastControl({ type: 'control' })
        return { ok: true }
      }
    }),
    getDmSession: () => ({ messages: [] }),
    getHomeRuntime: () => ({
      broadcastControl: (message) => broadcasts.push(message),
      isJoined: () => true
    }),
    now: () => 456,
    onChanged: () => renders.push('render')
  })

  await actions.sendDmMessage({ text: '  dm  ', toProfileId: 'friend' })

  assert.equal(calls.length, 1)
  assert.equal(calls[0].createdAt, 456)
  assert.equal(calls[0].messageId, 'id-0')
  assert.equal(calls[0].requestId, 'id-1')
  assert.equal(calls[0].text, 'dm')
  assert.equal(calls[0].toProfileId, 'friend')
  assert.deepEqual(broadcasts, [])
  assert.deepEqual(renders, ['render'])
})

test('desktop message actions mark direct threads read through the dm runtime', () => {
  const calls = []
  const renders = []
  const actions = createDesktopMessageActions({
    getDmRuntime: () => ({
      markThreadRead(payload) {
        calls.push(payload)
        return { threadId: 'thread-1' }
      }
    }),
    now: () => 1234,
    onChanged: () => renders.push('render')
  })

  actions.markDmThreadRead({ profileId: 'friend' })
  actions.markDmThreadRead({ profileId: 'friend', readAt: 2000 })

  assert.deepEqual(calls, [
    { profileId: 'friend', readAt: 1234 },
    { profileId: 'friend', readAt: 2000 }
  ])
  assert.deepEqual(renders, ['render', 'render'])
})

test('desktop message actions ignore blank read marker profiles', () => {
  const calls = []
  const actions = createDesktopMessageActions({
    getDmRuntime: () => ({
      markThreadRead(payload) {
        calls.push(payload)
      }
    })
  })

  actions.markDmThreadRead({ profileId: ' ' })

  assert.deepEqual(calls, [])
})

test('desktop message actions record queued outgoing friend requests when direct send creates a request', async () => {
  const savedBooks = []
  let nextId = 0
  const actions = createDesktopMessageActions({
    createId: () => `id-${nextId++}`,
    getContactBook: () => createContactBook({ ownerProfileId: 'local' }),
    getDmRuntime: () => ({
      sendMessageOrRequest(payload) {
        return {
          kind: 'request',
          request: {
            requestId: payload.requestId,
            text: payload.text,
            toProfileId: payload.toProfileId
          }
        }
      }
    }),
    getDmSession: () => ({ messages: [] }),
    getHomeRuntime: () => ({
      broadcastControl() {},
      isJoined: () => true
    }),
    now: () => 456,
    saveContactBook: (book) => savedBooks.push(book)
  })

  await actions.sendDmMessage({ text: '  hello  ', toProfileId: 'friend' })

  assert.equal(savedBooks.length, 1)
  assert.equal(savedBooks[0].outgoingRequestsByProfileId.get('friend').deliveryState, 'queued')
  assert.equal(savedBooks[0].outgoingRequestsByProfileId.get('friend').requestId, 'id-1')
  assert.equal(savedBooks[0].outgoingRequestsByProfileId.get('friend').text, 'hello')
})

test('desktop message actions preserve scanned Home descriptors on outgoing friend requests', async () => {
  const savedBooks = []
  const avatarMedia = createAvatarMediaReference({
    bytes: Uint8Array.from([1, 2, 3]),
    createdAt: 1000,
    mimeType: 'image/png',
    sha256Hex: () => 'a'.repeat(64)
  })
  const homeDescriptor = {
    address: 'c'.repeat(64),
    createdAt: 1000,
    expiresAt: null,
    ownerProfileId: 'friend',
    policy: 'trusted_only',
    proof: {
      createdAt: 1000,
      signature: 'signed-home',
      signerProfileId: 'friend',
      type: 'kepos.home.address.v1',
      version: 1
    },
    roomKey: 'd'.repeat(64),
    type: 'kepos.home.address.v1'
  }
  const actions = createDesktopMessageActions({
    createId: () => 'id',
    getContactBook: () => createContactBook({ ownerProfileId: 'local' }),
    getDmRuntime: () => ({
      sendMessageOrRequest(payload) {
        return {
          kind: 'request',
          request: {
            requestId: payload.requestId,
            text: payload.text,
            toProfileId: payload.toProfileId
          }
        }
      }
    }),
    getDmSession: () => ({ messages: [] }),
    getHomeRuntime: () => ({
      broadcastControl() {},
      isJoined: () => true
    }),
    getProfileRequestTarget: () => ({
      avatarMediaSnapshot: avatarMedia,
      avatarUri: avatarMedia.uri,
      displayName: 'Ada Lovelace',
      homeDescriptor,
      profileId: 'friend'
    }),
    saveContactBook: (book) => savedBooks.push(book)
  })

  await actions.sendDmMessage({ text: 'hello', toProfileId: 'friend' })

  assert.equal(savedBooks[0].outgoingRequestsByProfileId.get('friend').homeAddress, 'c'.repeat(64))
  assert.equal(savedBooks[0].outgoingRequestsByProfileId.get('friend').homeRoomKey, 'd'.repeat(64))
  assert.equal(
    savedBooks[0].outgoingRequestsByProfileId.get('friend').avatarUriSnapshot,
    avatarMedia.uri
  )
  assert.equal(
    savedBooks[0].outgoingRequestsByProfileId.get('friend').displayNameSnapshot,
    'Ada Lovelace'
  )
  assert.deepEqual(
    savedBooks[0].outgoingRequestsByProfileId.get('friend').avatarMediaSnapshot,
    avatarMedia
  )
  assert.deepEqual(
    savedBooks[0].outgoingRequestsByProfileId.get('friend').proof,
    homeDescriptor.proof
  )
})

test('desktop message actions do not send duplicate outgoing friend requests', async () => {
  const calls = []
  const requestedBook = recordOutgoingFriendRequest(
    createContactBook({ ownerProfileId: 'local' }),
    {
      alias: 'Friend',
      profileId: 'friend',
      requestedAt: 1000,
      requestId: 'request-1',
      text: 'hello'
    }
  )
  const actions = createDesktopMessageActions({
    getContactBook: () => requestedBook,
    getDmRuntime: () => ({
      sendMessageOrRequest() {
        calls.push('dm')
      }
    }),
    getDmSession: () => ({ messages: [] }),
    getHomeRuntime: () => ({
      broadcastControl() {},
      isJoined: () => true
    }),
    setNotice: (notice) => calls.push(['notice', notice])
  })

  await actions.sendDmMessage({ text: 'again', toProfileId: 'friend' })

  assert.deepEqual(calls, [['notice', 'Your request is pending. Wait for them to accept.']])
})

test('desktop message actions do not broadcast signed DM bodies over Home by default', () => {
  const broadcasts = []
  const signedMessage = {
    fromProfileId: 'local',
    messageId: 'message-1',
    threadId: 'thread-1',
    type: 'kepos.dm.message.v1'
  }
  const actions = createDesktopMessageActions({
    createId: () => 'id',
    getDmRuntime: () => ({
      sendMessageOrRequest() {
        return { kind: 'message', message: signedMessage }
      }
    }),
    getDmSession: () => ({ messages: [] }),
    getHomeRuntime: () => ({
      broadcastControl: (message) => broadcasts.push(message),
      isJoined: () => true
    }),
    now: () => 456
  })

  actions.sendDmMessage({ text: 'dm', toProfileId: 'friend' })

  assert.deepEqual(broadcasts, [])
})

test('desktop message actions can enable debug Home DM body fallback explicitly', () => {
  const broadcasts = []
  const signedMessage = {
    fromProfileId: 'local',
    messageId: 'message-1',
    threadId: 'thread-1',
    type: 'kepos.dm.message.v1'
  }
  const actions = createDesktopMessageActions({
    allowHomeDmBodyFallback: true,
    createId: () => 'id',
    getDmRuntime: () => ({
      sendMessageOrRequest() {
        return { kind: 'message', message: signedMessage }
      }
    }),
    getDmSession: () => ({ messages: [] }),
    getHomeRuntime: () => ({
      broadcastControl: (message) => broadcasts.push(message),
      isJoined: () => true
    }),
    now: () => 456
  })

  actions.sendDmMessage({ text: 'dm', toProfileId: 'friend' })

  assert.deepEqual(broadcasts, [
    {
      message: signedMessage,
      type: 'kepos.dm.body.v1'
    }
  ])
})

test('desktop message actions gate unavailable sends', async () => {
  const calls = []
  const actions = createDesktopMessageActions({
    getDmRuntime: () => ({ sendMessageOrRequest: () => calls.push('dm') }),
    getDmSession: () => null,
    getHomeRuntime: () => ({
      isJoined: () => false,
      sendMessage: () => calls.push('home')
    }),
    getSession: () => null,
    getTreeholeCanPost: () => false,
    getTreeholeRuntime: () => ({
      post: () => calls.push('post')
    }),
    onChanged: () => calls.push('render')
  })

  actions.sendHomeMessage({ text: 'hello' })
  actions.sendDmMessage({ text: 'dm', toProfileId: 'friend' })
  await actions.postTreehole({ text: 'post' })

  assert.deepEqual(calls, [])
})

test('desktop message actions ignore blank composer text', async () => {
  const calls = []
  const actions = createDesktopMessageActions({
    getDmRuntime: () => ({ sendMessageOrRequest: () => calls.push('dm') }),
    getDmSession: () => ({ messages: [] }),
    getHomeRuntime: () => ({
      isJoined: () => true,
      sendMessage: () => calls.push('home')
    }),
    getSession: () => ({ messages: [] }),
    getTreeholeCanPost: () => true,
    getTreeholeRuntime: () => ({
      comment: () => calls.push('comment'),
      post: () => calls.push('post')
    }),
    onChanged: () => calls.push('render')
  })

  actions.sendHomeMessage({ text: '   ' })
  actions.sendDmMessage({ text: '   ', toProfileId: 'friend' })
  await actions.postTreehole({ text: '   ' })
  await actions.commentTreehole({ postId: 'post-1', text: '   ' })

  assert.deepEqual(calls, [])
})

test('desktop message actions write treehole posts comments and likes', async () => {
  const calls = []
  const actions = createDesktopMessageActions({
    createId: () => `id-${calls.length}`,
    getTreeholeCanPost: () => true,
    getTreeholeRuntime: () => ({
      comment: (payload) => calls.push(['comment', payload]),
      like: (payload) => calls.push(['like', payload]),
      post: (payload) => calls.push(['post', payload])
    }),
    now: () => 789
  })

  await actions.postTreehole({ text: '  post  ' })
  await actions.commentTreehole({ postId: 'post-1', text: '  comment  ' })
  await actions.commentTreehole({ postId: 'post-1', text: '   ' })
  await actions.likeTreehole('post-1')

  assert.deepEqual(calls, [
    ['post', { createdAt: 789, id: 'id-0', text: 'post' }],
    ['comment', { createdAt: 789, id: 'id-1', postId: 'post-1', text: 'comment' }],
    ['like', { createdAt: 789, postId: 'post-1' }]
  ])
})
