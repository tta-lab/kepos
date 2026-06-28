import Hyperswarm from 'hyperswarm'
import b4a from 'b4a'
import { decodeFrame, deriveTopic, encodeFrame } from './protocol.js'

export function createP2PRoom(options = {}) {
  const createSwarm = options.createSwarm || (() => new Hyperswarm())
  const awaitDiscoveryFlush = options.awaitDiscoveryFlush ?? true
  const onDiscoveryError = options.onDiscoveryError || (() => {})
  const onMessage = options.onMessage || (() => {})
  const onControl = options.onControl || (() => {})
  const onDebugState = options.onDebugState || (() => {})
  const onPeer = options.onPeer || (() => {})
  const onPeerCount = options.onPeerCount || (() => {})
  const peers = new Set()
  const seenMessages = new Set()
  let currentTopic = null
  let lastPeerInfo = null
  let swarm = null
  let nick = 'anon'

  function emitDebugState(stage) {
    onDebugState(getDebugState(stage))
  }

  function getDebugState(stage = 'snapshot') {
    const discovery = getDiscovery()
    return {
      activeQuery: Boolean(discovery?._activeQuery),
      connections: getCollectionSize(swarm?.connections),
      connecting: Number(swarm?.connecting || 0),
      discovered: getCollectionSize(discovery?._discovered),
      destroyed: Boolean(swarm?.destroyed),
      dhtFirewalled: Boolean(swarm?.dht?.firewalled),
      dhtNodes: getCollectionSize(swarm?.dht?.nodes),
      dhtOnline: Boolean(swarm?.dht?.online),
      isClient: Boolean(discovery?.isClient),
      isServer: Boolean(discovery?.isServer),
      knownPeers: getCollectionSize(swarm?.peers),
      lastPeerClient: Boolean(lastPeerInfo?.client),
      lastPeerSelf: Boolean(
        lastPeerInfo?.publicKey &&
        swarm?.keyPair?.publicKey &&
        b4a.equals(lastPeerInfo.publicKey, swarm.keyPair.publicKey)
      ),
      lastPeerTopics: getCollectionSize(lastPeerInfo?.topics),
      listening: Boolean(swarm?.listening),
      localPeers: peers.size,
      refreshes: Number(discovery?._refreshes || 0),
      stage,
      topics: getCollectionSize(
        typeof swarm?.topics === 'function' ? swarm.topics() : swarm?.topics
      )
    }
  }

  function getDiscovery() {
    if (!swarm || !currentTopic || typeof swarm.status !== 'function') return null

    try {
      return swarm.status(currentTopic)
    } catch {
      return null
    }
  }

  function addPeer(socket, peerInfo = null) {
    lastPeerInfo = peerInfo
    peers.add(socket)
    onPeerCount(peers.size)
    emitDebugState('peer-open')
    onPeer(socket)

    let buffer = ''
    socket.on('data', (chunk) => {
      buffer += b4a.toString(chunk)
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.trim()) {
          continue
        }

        try {
          const message = decodeFrame(line)

          if (message.type === 'chat') {
            if (shouldSkipMessage(message)) {
              continue
            }

            seenMessages.add(message.id)
            onMessage(message)
            continue
          }

          onControl(message, socket)
        } catch {
          // Ignore malformed peer frames in the prototype.
        }
      }
    })

    socket.on('close', () => {
      lastPeerInfo = peerInfo
      peers.delete(socket)
      onPeerCount(peers.size)
      emitDebugState('peer-close')
    })
    socket.on('error', () => {
      lastPeerInfo = peerInfo
      peers.delete(socket)
      onPeerCount(peers.size)
      emitDebugState('peer-error')
    })
  }

  async function join({ roomKey, nick: nextNick }) {
    nick = nextNick?.trim() || 'anon'
    swarm = createSwarm()
    swarm.on('connection', addPeer)
    emitDebugState('created')

    currentTopic = deriveTopic(roomKey)
    const discovery = swarm.join(currentTopic, {
      client: true,
      server: true
    })
    emitDebugState('joined-topic')

    if (awaitDiscoveryFlush) {
      await discovery.flushed()
      emitDebugState('flushed')
      return
    }

    discovery
      .flushed()
      .then(() => emitDebugState('flushed'))
      .catch(onDiscoveryError)
  }

  function send({ id, text, at }) {
    broadcastFrame({
      type: 'chat',
      id,
      nick,
      text,
      at
    })
    seenMessages.add(id)
  }

  function broadcastControl(message) {
    broadcastFrame(message)
  }

  function sendControl(peer, message) {
    if (!peers.has(peer) || peer.destroyed) {
      return
    }

    peer.write(encodeFrame(message))
  }

  function broadcastFrame(message) {
    const frame = encodeFrame(message)
    for (const peer of peers) {
      if (!peer.destroyed) {
        peer.write(frame)
      }
    }
  }

  function shouldSkipMessage(message) {
    return !message.id || seenMessages.has(message.id)
  }

  async function leave() {
    for (const peer of peers) {
      peer.destroy?.()
    }

    peers.clear()
    onPeerCount(0)

    if (swarm) {
      await swarm.destroy()
      swarm = null
    }
    currentTopic = null
    emitDebugState('left')
  }

  return {
    addPeer,
    broadcastControl,
    getDebugState,
    join,
    leave,
    send,
    sendControl
  }
}

function getCollectionSize(value) {
  if (!value) return 0
  if (typeof value.size === 'number') return value.size
  if (typeof value.length === 'number') return value.length
  if (typeof value[Symbol.iterator] === 'function') return Array.from(value).length
  if (typeof value === 'object') return Object.keys(value).length
  return 0
}
