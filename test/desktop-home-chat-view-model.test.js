import assert from 'node:assert/strict'
import test from 'node:test'
import { createDesktopHomeChatViewModel } from '../src/desktop-home-chat-view-model.js'

test('desktop home chat view model formats live chat messages', () => {
  const viewModel = createDesktopHomeChatViewModel({
    messages: [
      {
        direction: 'out',
        nick: 'Desktop',
        text: 'hello'
      },
      {
        direction: 'in',
        nick: 'Ada',
        text: 'hi'
      }
    ]
  })

  assert.deepEqual(viewModel, [
    {
      className: 'item outgoing',
      meta: 'Desktop',
      text: 'hello'
    },
    {
      className: 'item incoming',
      meta: 'Ada',
      text: 'hi'
    }
  ])
})

test('desktop home chat view model defaults to an empty list', () => {
  assert.deepEqual(createDesktopHomeChatViewModel(), [])
})
