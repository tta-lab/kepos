import assert from 'node:assert/strict'
import test from 'node:test'
import { formatTransportDebugLabel } from '../src/transport-debug-label.ts'

test('transport debug label formats an empty state', () => {
  assert.equal(formatTransportDebugLabel(null), 'none')
  assert.equal(formatTransportDebugLabel(undefined), 'none')
})

test('transport debug label preserves the default desktop fields', () => {
  assert.equal(
    formatTransportDebugLabel({
      activeQuery: false,
      connections: 1,
      connecting: 2,
      discovered: 4,
      directEndpoint: { host: '192.168.1.203', port: 40123 },
      dhtFirewalled: false,
      dhtNodes: 3,
      dhtOnline: true,
      frameDecodeErrors: 1,
      frameReads: 5,
      frameWrites: 6,
      byteReads: 500,
      byteWrites: 600,
      isClient: true,
      isServer: true,
      knownPeers: 3,
      lastPeerClient: true,
      lastPeerSelf: false,
      lastPeerTopics: 1,
      lastReadType: 'chat',
      lastWriteType: 'treehole',
      listening: true,
      localPeers: 1,
      readTypes: { chat: 5 },
      stage: 'flushed',
      topics: 1,
      writeTypes: { treehole: 6 }
    }),
    'stage=flushed connections=1 connecting=2 knownPeers=3 discovered=4 localPeers=1 reads=5/500 writes=6/600 decodeErrors=1 lastRead=chat lastWrite=treehole readTypes=chat:5 writeTypes=treehole:6 topics=1 direct=192.168.1.203:40123 client=yes server=yes listening=yes activeQuery=no lastPeerClient=yes lastPeerSelf=no lastPeerTopics=1 dhtOnline=yes dhtFirewalled=no dhtNodes=3'
  )
})

test('transport debug label can include the mobile direct readiness field', () => {
  assert.match(
    formatTransportDebugLabel(
      { directReady: true, stage: 'connecting' },
      { includeDirectReady: true }
    ),
    /directReady=yes/
  )
})
