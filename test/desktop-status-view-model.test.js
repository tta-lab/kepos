import assert from 'node:assert/strict'
import test from 'node:test'
import { createDesktopState, setDesktopRoom, setDesktopTreehole } from '../src/desktop-state.js'
import { createDesktopStatusViewModel } from '../src/desktop-status-view-model.js'

test('desktop status view model formats the default lobby status', () => {
  assert.deepEqual(createDesktopStatusViewModel({ state: createDesktopState() }), {
    errorDetailLabel: 'none',
    homeStatusLabel: 'Offline',
    noticeLabel: 'Create or join a home.',
    peerLabel: '0',
    profileIdLabel: 'not ready',
    roomKeyLabel: 'not joined',
    treeholeStatusLabel: 'Treehole offline'
  })
})

test('desktop status view model formats room and profile status', () => {
  const state = setDesktopTreehole(
    setDesktopRoom(createDesktopState(), {
      mode: 'host',
      nick: 'Desktop',
      peers: 2,
      roomKey: 'a'.repeat(64)
    }),
    {
      status: 'ready'
    }
  )

  assert.deepEqual(
    createDesktopStatusViewModel({
      session: {
        profileId: 'b'.repeat(64)
      },
      shortenProfileId: (value) => value.slice(0, 6),
      state: {
        ...state,
        lastError: 'raw failure',
        notice: 'Home ready.'
      }
    }),
    {
      errorDetailLabel: 'raw failure',
      homeStatusLabel: 'Connected',
      noticeLabel: 'Home ready.',
      peerLabel: '2',
      profileIdLabel: 'bbbbbb',
      roomKeyLabel: 'aaaaaa',
      treeholeStatusLabel: 'Treehole ready'
    }
  )
})
