import Hyperswarm from 'hyperswarm'
import b4a from 'b4a'
import crypto from 'hypercore-crypto'
import { createSignedDmMessage, verifySignedDmMessage } from './dm-message.ts'
import { isDmThreadActive } from './dm-thread.ts'

const DM_TOPIC_PREFIX = 'kepos-dm:v1:'

export function deriveDmTopic(channelDiscoveryKey) {
  return crypto.hash(
    b4a.from(`${DM_TOPIC_PREFIX}${cleanHex32(channelDiscoveryKey, 'Invalid channel key')}`)
  )
}

export function createDmReplicationChannel(options = {}) {
  const createSwarm = options.createSwarm || (() => new Hyperswarm())
  const identity = options.identity
  const localProfileId = cleanHex32(options.localProfileId, 'Local profile id is required')
  const onMessage = options.onMessage || (() => {})
  const onPeerCount = options.onPeerCount || (() => {})
  const peers = new Set()
  const seenMessageIds = new Set()
  let swarm = null
  let thread = null

  function addPeer(socket) {
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
          const message = JSON.parse(line)

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

  async function joinThread(nextThread) {
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

  function sendMessage({ createdAt, messageId, text, threadId }) {
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

  function broadcastMessages(messages) {
    for (const message of messages) {
      if (
        !thread ||
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

  function broadcastFrame(message) {
    const frame = `${JSON.stringify(message)}\n`
    for (const peer of peers) {
      if (!peer.destroyed) {
        peer.write(frame)
      }
    }
  }

  function shouldAcceptMessage(message) {
    if (!thread || message?.threadId !== thread.threadId) {
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

  async function leave() {
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

function cleanHex32(value, message) {
  const hex = value?.trim()?.toLowerCase()

  if (!/^[0-9a-f]{64}$/.test(hex)) {
    throw new Error(message)
  }

  return hex
}
