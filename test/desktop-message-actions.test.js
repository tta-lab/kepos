import assert from 'node:assert/strict'
import test from 'node:test'
import { createDesktopMessageActions } from '../src/desktop-message-actions.js'

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

  actions.sendHomeMessage({ text: 'hello' })

  assert.deepEqual(sent, [{ at: 123, id: 'message-1', text: 'hello' }])
  assert.deepEqual(session.messages, [{ at: 123, id: 'message-1', text: 'hello' }])
  assert.deepEqual(renders, ['render'])
})

test('desktop message actions send direct messages through the dm runtime', () => {
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

  actions.sendDmMessage({ text: 'dm', toProfileId: 'friend' })

  assert.equal(calls.length, 1)
  assert.equal(calls[0].createdAt, 456)
  assert.equal(calls[0].messageId, 'id-0')
  assert.equal(calls[0].requestId, 'id-1')
  assert.equal(calls[0].text, 'dm')
  assert.equal(calls[0].toProfileId, 'friend')
  assert.deepEqual(broadcasts, [{ type: 'control' }])
  assert.deepEqual(renders, ['render'])
})

test('desktop message actions broadcast signed DM body fallback after thread sends', () => {
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

  await actions.postTreehole({ text: 'post' })
  await actions.commentTreehole({ postId: 'post-1', text: 'comment' })
  await actions.commentTreehole({ postId: 'post-1', text: '   ' })
  await actions.likeTreehole('post-1')

  assert.deepEqual(calls, [
    ['post', { createdAt: 789, id: 'id-0', text: 'post' }],
    ['comment', { createdAt: 789, id: 'id-1', postId: 'post-1', text: 'comment' }],
    ['like', { createdAt: 789, postId: 'post-1' }]
  ])
})
