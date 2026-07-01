import assert from 'node:assert/strict'
import test from 'node:test'
import { createDesktopState, setDesktopRoom, setDesktopTreehole } from '../src/desktop-state.ts'
import { createDesktopStatusViewModel } from '../src/desktop-status-view-model.ts'

test('desktop status view model formats the default lobby status', () => {
  assert.deepEqual(createDesktopStatusViewModel({ state: createDesktopState() }), {
    errorDetailLabel: 'none',
    homeStatusLabel: 'Offline',
    noticeLabel: 'Create or join a home.',
    peerLabel: '0',
    profileIdLabel: 'not ready',
    roomKeyLabel: 'not joined',
    transportDebugLabel: 'none',
    treeholeStatusLabel: 'My treehole offline'
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
        notice: 'Home ready.',
        transportDebug: {
          activeQuery: false,
          connections: 1,
          connecting: 2,
          discovered: 4,
          directEndpoint: { host: '192.168.1.203', port: 40123 },
          dhtFirewalled: false,
          dhtNodes: 3,
          dhtOnline: true,
          isClient: true,
          isServer: true,
          knownPeers: 3,
          lastPeerClient: true,
          lastPeerSelf: false,
          lastPeerTopics: 1,
          listening: true,
          localPeers: 1,
          stage: 'flushed',
          topics: 1
        }
      }
    }),
    {
      errorDetailLabel: 'raw failure',
      homeStatusLabel: 'Connected',
      noticeLabel: 'Home ready.',
      peerLabel: '2',
      profileIdLabel: 'bbbbbb',
      roomKeyLabel: 'aaaaaa',
      transportDebugLabel:
        'stage=flushed connections=1 connecting=2 knownPeers=3 discovered=4 localPeers=1 reads=0/0 writes=0/0 decodeErrors=0 topics=1 direct=192.168.1.203:40123 client=yes server=yes listening=yes activeQuery=no lastPeerClient=yes lastPeerSelf=no lastPeerTopics=1 dhtOnline=yes dhtFirewalled=no dhtNodes=3',
      treeholeStatusLabel: 'My treehole ready'
    }
  )
})
