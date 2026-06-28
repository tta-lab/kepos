import Hyperswarm from 'hyperswarm'
import b4a from 'b4a'
import { decodeFrame, deriveTopic, encodeFrame } from './protocol.js'

export function createP2PRoom(options = {}) {
  const createSwarm = options.createSwarm || (() => new Hyperswarm())
  const createDirectTransport = options.createDirectTransport || null
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
  let directEndpoint = null
  let directReady = false
  let directTransport = null
  let frameDecodeErrors = 0
  let frameReads = 0
  let frameWrites = 0
  let byteReads = 0
  let byteWrites = 0
  let lastReadType = null
  let lastWriteType = null
  const readTypes = new Map()
  const writeTypes = new Map()
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
      ...(directEndpoint ? { directEndpoint } : {}),
      directReady,
      discovered: getCollectionSize(discovery?._discovered),
      destroyed: Boolean(swarm?.destroyed),
      dhtFirewalled: Boolean(swarm?.dht?.firewalled),
      dhtNodes: getCollectionSize(swarm?.dht?.nodes),
      dhtOnline: Boolean(swarm?.dht?.online),
      byteReads,
      byteWrites,
      frameDecodeErrors,
      frameReads,
      frameWrites,
      ...(lastReadType ? { lastReadType } : {}),
      ...(lastWriteType ? { lastWriteType } : {}),
      readTypes: Object.fromEntries(readTypes),
      writeTypes: Object.fromEntries(writeTypes),
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
      byteReads += chunk?.byteLength || chunk?.length || 0
      buffer += b4a.toString(chunk)
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.trim()) {
          continue
        }

        try {
          const message = decodeFrame(line)
          frameReads += 1
          lastReadType = message.type
          incrementType(readTypes, message.type)

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
          frameDecodeErrors += 1
          // Ignore malformed peer frames in the prototype.
        }
      }
      emitDebugState('peer-data')
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

    if (createDirectTransport) {
      directTransport = createDirectTransport({
        addPeer,
        roomKey
      })
      directTransport?.ready?.then?.((endpoint) => {
        directEndpoint = endpoint || null
        directReady = Boolean(endpoint)
        emitDebugState('direct-ready')
      })
      emitDebugState('direct-started')
    }

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

    writeFrame(peer, message)
    emitDebugState('peer-write')
  }

  function broadcastFrame(message) {
    for (const peer of peers) {
      if (!peer.destroyed) {
        writeFrame(peer, message)
      }
    }
    emitDebugState('peer-write')
  }

  function writeFrame(peer, message) {
    const frame = b4a.from(encodeFrame(message))
    peer.write(frame)
    frameWrites += 1
    byteWrites += frame.byteLength || frame.length || 0
    lastWriteType = message.type
    incrementType(writeTypes, message.type)
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

    await directTransport?.close?.()
    directEndpoint = null
    directReady = false
    directTransport = null

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

function incrementType(counts, type) {
  counts.set(type, (counts.get(type) || 0) + 1)
}
