import Hyperswarm from 'hyperswarm'
import b4a from 'b4a'
import { decodeFrame, deriveTopic, encodeFrame } from './protocol.js'

export function createP2PRoom(options = {}) {
  const createSwarm = options.createSwarm || (() => new Hyperswarm())
  const onMessage = options.onMessage || (() => {})
  const onDirectMessage = options.onDirectMessage || (() => {})
  const onControl = options.onControl || (() => {})
  const onPeer = options.onPeer || (() => {})
  const onPeerCount = options.onPeerCount || (() => {})
  const peers = new Set()
  const seenMessages = new Set()
  let swarm = null
  let nick = 'anon'

  function addPeer(socket) {
    peers.add(socket)
    onPeerCount(peers.size)
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

          if (message.type === 'dm') {
            if (shouldSkipMessage(message)) {
              continue
            }

            seenMessages.add(message.id)
            onDirectMessage(message)
            continue
          }

          onControl(message)
        } catch {
          // Ignore malformed peer frames in the prototype.
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

  async function join({ roomKey, nick: nextNick }) {
    nick = nextNick?.trim() || 'anon'
    swarm = createSwarm()
    swarm.on('connection', addPeer)

    const discovery = swarm.join(deriveTopic(roomKey), {
      client: true,
      server: true
    })
    await discovery.flushed()
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

  function sendDirectMessage({ id, fromProfileId, toProfileId, text, at }) {
    broadcastFrame({
      type: 'dm',
      id,
      fromProfileId,
      toProfileId,
      nick,
      text,
      at
    })
    seenMessages.add(id)
  }

  function broadcastControl(message) {
    broadcastFrame(message)
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
  }

  return {
    addPeer,
    broadcastControl,
    join,
    leave,
    send,
    sendDirectMessage
  }
}
