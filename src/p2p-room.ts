import Hyperswarm from 'hyperswarm'
import b4a from 'b4a'
import { decodeFrame, deriveTopic, encodeFrame } from './protocol.ts'
import type { ProtocolFrame } from './protocol.ts'

export function createP2PRoom(options: P2PRoomOptions = {}): P2PRoom {
  const createSwarm = options.createSwarm || (() => new Hyperswarm() as unknown as P2PSwarm)
  const createDirectTransport = options.createDirectTransport || null
  const awaitDiscoveryFlush = options.awaitDiscoveryFlush ?? true
  const onDiscoveryError = options.onDiscoveryError || (() => {})
  const onMessage = options.onMessage || (() => {})
  const onControl = options.onControl || (() => {})
  const onDebugState = options.onDebugState || (() => {})
  const onPeer = options.onPeer || (() => {})
  const onPeerCount = options.onPeerCount || (() => {})
  const peers = new Set<P2PSocket>()
  const seenMessages = new Set<string>()
  let currentTopic: Uint8Array | null = null
  let directEndpoint: DirectEndpoint | null = null
  let directReady = false
  let directTransport: DirectTransport | null = null
  let frameDecodeErrors = 0
  let frameReads = 0
  let frameWrites = 0
  let byteReads = 0
  let byteWrites = 0
  let lastReadType: string | null = null
  let lastWriteType: string | null = null
  const readTypes = new Map<string, number>()
  const writeTypes = new Map<string, number>()
  let lastPeerInfo: PeerInfo | null = null
  let swarm: P2PSwarm | null = null
  let nick = 'anon'

  function emitDebugState(stage: string): void {
    onDebugState(getDebugState(stage))
  }

  function getDebugState(stage = 'snapshot'): P2PDebugState {
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

  function getDiscovery(): SwarmDiscoveryStatus | null {
    if (!swarm || !currentTopic || typeof swarm.status !== 'function') return null

    try {
      return swarm.status(currentTopic)
    } catch {
      return null
    }
  }

  function addPeer(socket: P2PSocket, peerInfo: PeerInfo | null = null): void {
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

            seenMessages.add(message.id as string)
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

  async function join({
    roomKey,
    nick: nextNick
  }: {
    roomKey: string
    nick?: string
  }): Promise<void> {
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

    Promise.resolve(discovery.flushed())
      .then(() => emitDebugState('flushed'))
      .catch(onDiscoveryError)
  }

  function send({ id, text, at }: { id: string; text: string; at?: number }): void {
    broadcastFrame({
      type: 'chat',
      id,
      nick,
      text,
      at
    })
    seenMessages.add(id)
  }

  function broadcastControl(message: ProtocolFrame): void {
    broadcastFrame(message)
  }

  function sendControl(peer: P2PSocket, message: ProtocolFrame): void {
    if (!peers.has(peer) || peer.destroyed) {
      return
    }

    writeFrame(peer, message)
    emitDebugState('peer-write')
  }

  function broadcastFrame(message: ProtocolFrame): void {
    for (const peer of peers) {
      if (!peer.destroyed) {
        writeFrame(peer, message)
      }
    }
    emitDebugState('peer-write')
  }

  function writeFrame(peer: P2PSocket, message: ProtocolFrame): void {
    const frame = b4a.from(encodeFrame(message))
    peer.write(frame)
    frameWrites += 1
    byteWrites += frame.byteLength || frame.length || 0
    lastWriteType = message.type
    incrementType(writeTypes, message.type)
  }

  function shouldSkipMessage(message: ProtocolFrame): boolean {
    return typeof message.id !== 'string' || seenMessages.has(message.id)
  }

  async function leave(): Promise<void> {
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

function getCollectionSize(value: unknown): number {
  if (!value) return 0
  if (typeof (value as { size?: unknown }).size === 'number') {
    return (value as { size: number }).size
  }
  if (typeof (value as { length?: unknown }).length === 'number') {
    return (value as { length: number }).length
  }
  if (typeof (value as { [Symbol.iterator]?: unknown })[Symbol.iterator] === 'function') {
    return Array.from(value as Iterable<unknown>).length
  }
  if (typeof value === 'object') return Object.keys(value).length
  return 0
}

function incrementType(counts: Map<string, number>, type: string): void {
  counts.set(type, (counts.get(type) || 0) + 1)
}

export type P2PRoom = {
  addPeer(socket: P2PSocket, peerInfo?: PeerInfo | null): void
  broadcastControl(message: ProtocolFrame): void
  getDebugState(stage?: string): P2PDebugState
  join(payload: { roomKey: string; nick?: string }): Promise<void>
  leave(): Promise<void>
  send(payload: { id: string; text: string; at?: number }): void
  sendControl(peer: P2PSocket, message: ProtocolFrame): void
}

type P2PRoomOptions = {
  awaitDiscoveryFlush?: boolean
  createDirectTransport?:
    | ((options: { addPeer: P2PRoom['addPeer']; roomKey: string }) => DirectTransport)
    | null
  createSwarm?: () => P2PSwarm
  onControl?: (message: ProtocolFrame, peer: P2PSocket) => void
  onDebugState?: (state: P2PDebugState) => void
  onDiscoveryError?: (error: unknown) => void
  onMessage?: (message: ProtocolFrame) => void
  onPeer?: (peer: P2PSocket) => void
  onPeerCount?: (peerCount: number) => void
}

type P2PSwarm = {
  connections?: unknown
  connecting?: number
  destroyed?: boolean
  dht?: {
    firewalled?: boolean
    nodes?: unknown
    online?: boolean
  }
  join(
    topic: Uint8Array,
    options: { client: boolean; server: boolean }
  ): {
    flushed(): unknown | Promise<unknown>
  }
  keyPair?: {
    publicKey?: Uint8Array
  }
  listening?: boolean
  on(event: 'connection', handler: (socket: P2PSocket, peerInfo?: PeerInfo) => void): unknown
  peers?: unknown
  status?(topic: Uint8Array): SwarmDiscoveryStatus | null
  topics?: unknown | (() => unknown)
  destroy(): unknown | Promise<unknown>
}

type P2PSocket = {
  destroyed?: boolean
  destroy?: () => unknown
  on(event: 'data', handler: (chunk: Uint8Array) => void): unknown
  on(event: 'close' | 'error', handler: () => void): unknown
  write(frame: Uint8Array): unknown
}

type PeerInfo = {
  client?: boolean
  publicKey?: Uint8Array
  topics?: unknown
}

type SwarmDiscoveryStatus = {
  _activeQuery?: unknown
  _discovered?: unknown
  _refreshes?: number
  isClient?: boolean
  isServer?: boolean
}

type DirectEndpoint = {
  host: string
  port: number
}

type DirectTransport = {
  close?: () => unknown | Promise<unknown>
  ready?: Promise<DirectEndpoint | null>
}

type P2PDebugState = Record<string, unknown> & {
  byteReads: number
  byteWrites: number
  directReady: boolean
  frameDecodeErrors: number
  frameReads: number
  frameWrites: number
  localPeers: number
  readTypes: Record<string, number>
  stage: string
  writeTypes: Record<string, number>
}
