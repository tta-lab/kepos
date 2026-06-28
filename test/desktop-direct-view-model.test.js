import assert from 'node:assert/strict'
import test from 'node:test'
import { createDesktopDirectMessageListViewModel } from '../src/desktop-direct-view-model.js'

test('desktop direct view model formats normal direct messages', () => {
  const viewModel = createDesktopDirectMessageListViewModel({
    messages: [
      {
        direction: 'out',
        text: 'hello',
        toProfileId: 'b'.repeat(64),
        type: 'kepos.dm.message.v1'
      },
      {
        direction: 'in',
        fromProfileId: 'c'.repeat(64),
        nick: 'Ada',
        text: 'hi',
        type: 'kepos.dm.message.v1'
      }
    ],
    shortenProfileId: (profileId) => profileId.slice(0, 4)
  })

  assert.deepEqual(viewModel, [
    {
      actions: null,
      className: 'item outgoing',
      meta: 'You to Profile bbbb',
      text: 'hello'
    },
    {
      actions: null,
      className: 'item incoming',
      meta: 'Ada to you',
      text: 'hi'
    }
  ])
})

test('desktop direct view model formats message request actions', () => {
  const message = {
    direction: 'in',
    fromProfileId: 'b'.repeat(64),
    nick: 'Ada',
    text: 'can we chat?',
    type: 'kepos.message.request.v1'
  }

  const viewModel = createDesktopDirectMessageListViewModel({
    messages: [message],
    shortenProfileId: (profileId) => profileId.slice(0, 4)
  })

  assert.deepEqual(viewModel, [
    {
      actions: {
        acceptMessage: message,
        ignoreMessage: message
      },
      className: 'item incoming',
      meta: 'Ada wants to start a direct chat.',
      text: 'can we chat?'
    }
  ])
})

test('desktop direct view model formats outgoing message requests', () => {
  const viewModel = createDesktopDirectMessageListViewModel({
    messages: [
      {
        direction: 'out',
        text: 'hello',
        toProfileId: 'b'.repeat(64),
        type: 'kepos.message.request.v1'
      }
    ],
    shortenProfileId: (profileId) => profileId.slice(0, 4)
  })

  assert.equal(viewModel[0].meta, 'You asked someone to start a direct chat')
  assert.equal(viewModel[0].actions, null)
})
