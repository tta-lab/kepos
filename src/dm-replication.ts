import Hyperswarm from 'hyperswarm'
import b4a from 'b4a'
import crypto from 'hypercore-crypto'
import { createSignedDmMessage, verifySignedDmMessage } from './dm-message.ts'
import { isDmThreadActive } from './dm-thread.ts'
import type { DmMessage } from './dm-message.ts'
import type { DmThread } from './dm-thread.ts'
import type { SigningIdentity } from './signed-record.ts'

const DM_TOPIC_PREFIX = 'kepos-dm:v1:'

export function deriveDmTopic(channelDiscoveryKey: string): Uint8Array {
  return crypto.hash(
    b4a.from(`${DM_TOPIC_PREFIX}${cleanHex32(channelDiscoveryKey, 'Invalid channel key')}`)
  )
}

export function createDmReplicationChannel(
  options: DmReplicationChannelOptions = {}
): DmReplicationChannel {
  const createSwarm = options.createSwarm || (() => new Hyperswarm() as DmSwarm)
  const identity = options.identity
  const localProfileId = cleanHex32(options.localProfileId, 'Local profile id is required')
  const onMessage = options.onMessage || (() => {})
  const onPeerCount = options.onPeerCount || (() => {})
  const peers = new Set<DmSocket>()
  const seenMessageIds = new Set<string>()
  let swarm: DmSwarm | null = null
  let thread: DmThread | null = null

  function addPeer(socket: DmSocket): void {
    peers.add(socket)
    onPeerCount(peers.size)

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
          const message: unknown = JSON.parse(line)

          if (!shouldAcceptMessage(message)) {
            continue
          }

          seenMessageIds.add(message.messageId)
          onMessage(message)
        } catch {
          // Ignore malformed peer frames; later valid DM frames should still work.
        }
      }
    })

    socket.on('close', () => {
      peers.delete(socket)
      onPeerCount(peers.size)
    })
    socket.on('error', () => {
      peers.delete(socket)
      onPeerCount(peers.size)
    })
  }

  async function joinThread(nextThread: DmThread): Promise<void> {
    if (!isDmThreadActive(nextThread)) {
      throw new Error('Accepted DM thread is required')
    }

    if (nextThread.localProfileId !== localProfileId) {
      throw new Error('DM thread does not belong to local profile')
    }

    thread = nextThread
    swarm = createSwarm()
    swarm.on('connection', addPeer)

    const discovery = swarm.join(deriveDmTopic(thread.channelDiscoveryKey), {
      client: true,
      server: true
    })
    await discovery.flushed()
  }

  function sendMessage({
    createdAt,
    messageId,
    text,
    threadId
  }: {
    createdAt?: number
    messageId: string
    text: string
    threadId: string
  }): DmMessage {
    if (!thread || thread.threadId !== threadId) {
      throw new Error('DM thread is not joined')
    }

    if (identity?.publicKey !== localProfileId) {
      throw new Error('DM identity does not match local profile')
    }

    const message = createSignedDmMessage({
      createdAt,
      identity,
      messageId,
      text,
      threadId
    })

    broadcastFrame(message)
    seenMessageIds.add(message.messageId)
    return message
  }

  function broadcastMessages(messages: unknown[]): void {
    for (const message of messages) {
      if (
        !thread ||
        !isDmMessage(message) ||
        message?.threadId !== thread.threadId ||
        message.fromProfileId !== localProfileId ||
        !verifySignedDmMessage(message)
      ) {
        continue
      }

      broadcastFrame(message)
      seenMessageIds.add(message.messageId)
    }
  }

  function broadcastFrame(message: DmMessage): void {
    const frame = `${JSON.stringify(message)}\n`
    for (const peer of peers) {
      if (!peer.destroyed) {
        peer.write(frame)
      }
    }
  }

  function shouldAcceptMessage(message: unknown): message is DmMessage {
    if (!thread || !isDmMessage(message) || message.threadId !== thread.threadId) {
      return false
    }

    if (
      message.fromProfileId !== thread.remoteProfileId ||
      message.fromProfileId === localProfileId ||
      seenMessageIds.has(message.messageId)
    ) {
      return false
    }

    return verifySignedDmMessage(message)
  }

  async function leave(): Promise<void> {
    for (const peer of peers) {
      peer.destroy?.()
    }

    peers.clear()
    onPeerCount(0)
    thread = null

    if (swarm) {
      await swarm.destroy()
      swarm = null
    }
  }

  return {
    addPeer,
    broadcastMessages,
    joinThread,
    leave,
    sendMessage
  }
}

function cleanHex32(value: string | undefined, message: string): string {
  const hex = value?.trim()?.toLowerCase()

  if (!hex || !/^[0-9a-f]{64}$/.test(hex)) {
    throw new Error(message)
  }

  return hex as string
}

function isDmMessage(message: unknown): message is DmMessage {
  return (
    !!message &&
    typeof message === 'object' &&
    typeof (message as DmMessage).threadId === 'string' &&
    typeof (message as DmMessage).messageId === 'string' &&
    typeof (message as DmMessage).fromProfileId === 'string'
  )
}

export type DmReplicationChannel = {
  addPeer(socket: DmSocket): void
  broadcastMessages(messages: unknown[]): void
  joinThread(thread: DmThread): Promise<void>
  leave(): Promise<void>
  sendMessage(payload: {
    createdAt?: number
    messageId: string
    text: string
    threadId: string
  }): DmMessage
}

type DmReplicationChannelOptions = {
  createSwarm?: () => DmSwarm
  identity?: SigningIdentity
  localProfileId?: string
  onMessage?: (message: DmMessage) => void
  onPeerCount?: (peerCount: number) => void
}

type DmSwarm = {
  destroy(): unknown | Promise<unknown>
  join(
    topic: Uint8Array,
    options: { client: boolean; server: boolean }
  ): {
    flushed(): unknown | Promise<unknown>
  }
  on(event: 'connection', handler: (socket: DmSocket) => void): unknown
}

type DmSocket = {
  destroyed?: boolean
  destroy?: () => unknown
  on(event: 'data', handler: (chunk: Uint8Array) => void): unknown
  on(event: 'close' | 'error', handler: () => void): unknown
  write(frame: string): unknown
}
