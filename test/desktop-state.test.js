import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  createDesktopState,
  setDesktopRoom,
  setDesktopTab,
  setDesktopTreehole
} from '../src/desktop-state.js'

describe('desktop state', () => {
  test('starts in the lobby with chat selected', () => {
    const state = createDesktopState()

    assert.equal(state.view, 'lobby')
    assert.equal(state.activeTab, 'chat')
    assert.deepEqual(state.messages, [])
    assert.deepEqual(state.treeholePosts, [])
  })

  test('setDesktopRoom enters a room with visible peer metadata', () => {
    const state = setDesktopRoom(createDesktopState(), {
      mode: 'host',
      roomKey: 'a'.repeat(64),
      nick: 'Neil',
      peers: 1
    })

    assert.equal(state.view, 'room')
    assert.equal(state.mode, 'host')
    assert.equal(state.roomKey, 'a'.repeat(64))
    assert.equal(state.nick, 'Neil')
    assert.equal(state.peers, 1)
  })

  test('setDesktopTreehole stores ready status and feed posts', () => {
    const state = setDesktopTreehole(createDesktopState(), {
      canPost: false,
      status: 'ready',
      posts: [{ id: 'post-1', author: 'Ada', text: 'hello' }]
    })

    assert.equal(state.treeholeStatus, 'ready')
    assert.equal(state.treeholeCanPost, false)
    assert.deepEqual(state.treeholePosts, [{ id: 'post-1', author: 'Ada', text: 'hello' }])
  })

  test('setDesktopTab accepts direct messages', () => {
    const state = setDesktopTab(createDesktopState(), 'dm')

    assert.equal(state.activeTab, 'dm')
  })

  test('setDesktopTab rejects unknown tabs', () => {
    assert.throws(() => setDesktopTab(createDesktopState(), 'settings'), /Unknown tab/)
  })
})
