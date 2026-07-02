import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  createDesktopState,
  getDesktopHomeStatus,
  getDesktopTreeholeStatus,
  setDesktopRoom,
  setDesktopTab,
  setDesktopTreehole
} from '../src/desktop-state.ts'

describe('desktop state', () => {
  test('starts in the lobby with chat selected', () => {
    const state = createDesktopState()

    assert.equal(state.view, 'lobby')
    assert.equal(state.activeTab, 'chat')
    assert.equal(state.notice, 'Create or join a home.')
    assert.deepEqual(state.messages, [])
    assert.deepEqual(state.treeholePosts, [])
    assert.equal(state.activeHomeOwnerProfileId, '')
  })

  test('setDesktopRoom enters a room with visible peer metadata', () => {
    const state = setDesktopRoom(createDesktopState(), {
      mode: 'host',
      roomKey: 'a'.repeat(64),
      nick: 'Neil',
      ownerProfileId: 'owner-profile',
      peers: 1
    })

    assert.equal(state.view, 'room')
    assert.equal(state.mode, 'host')
    assert.equal(state.roomKey, 'a'.repeat(64))
    assert.equal(state.nick, 'Neil')
    assert.equal(state.peers, 1)
    assert.equal(state.activeHomeOwnerProfileId, 'owner-profile')
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

  test('setDesktopTab accepts people', () => {
    const state = setDesktopTab(createDesktopState(), 'people')

    assert.equal(state.activeTab, 'people')
  })

  test('setDesktopTab rejects unknown tabs', () => {
    assert.throws(() => setDesktopTab(createDesktopState(), 'settings'), /Unknown tab/)
  })

  test('getDesktopHomeStatus uses product status words', () => {
    assert.equal(getDesktopHomeStatus(createDesktopState()), 'Offline')
    assert.equal(
      getDesktopHomeStatus(setDesktopRoom(createDesktopState(), { roomKey: 'a'.repeat(64) })),
      'Waiting for friends'
    )
    assert.equal(
      getDesktopHomeStatus(
        setDesktopRoom(createDesktopState(), {
          peers: 2,
          roomKey: 'a'.repeat(64)
        })
      ),
      'Connected'
    )
  })

  test('getDesktopTreeholeStatus maps internal states to product words', () => {
    assert.equal(getDesktopTreeholeStatus(createDesktopState()), 'Treehole offline')
    assert.equal(
      getDesktopTreeholeStatus(setDesktopTreehole(createDesktopState(), { status: 'starting' })),
      'Syncing posts'
    )
    assert.equal(
      getDesktopTreeholeStatus(setDesktopTreehole(createDesktopState(), { status: 'ready' })),
      'Treehole ready'
    )
    assert.equal(
      getDesktopTreeholeStatus(setDesktopTreehole(createDesktopState(), { status: 'waiting' })),
      'Syncing posts'
    )
  })
})
