import crypto from 'hypercore-crypto'
import b4a from 'b4a'

const ROOM_KEY_PATTERN = /^[0-9a-f]{64}$/
const TOPIC_PREFIX = 'kepos-room:v1:'
const SUPPORTED_FRAME_TYPES = new Set([
  'chat',
  'kepos.dm.body.v1',
  'kepos.dm.invite.v1',
  'kepos.home.hello.request.v1',
  'kepos.home.hello.v1',
  'kepos.message.request.v1',
  'treehole.bootstrap',
  'treehole.state.v1',
  'treehole.writer'
])

export function createRoomKey() {
  return b4a.toString(crypto.randomBytes(32), 'hex')
}

export function isRoomKey(value) {
  return typeof value === 'string' && ROOM_KEY_PATTERN.test(value)
}

export function deriveTopic(roomKey) {
  if (!isRoomKey(roomKey)) {
    throw new Error('Invalid room key')
  }

  return crypto.hash(b4a.from(`${TOPIC_PREFIX}${roomKey}`))
}

export function encodeFrame(message) {
  return `${JSON.stringify(message)}\n`
}

export function decodeFrame(line) {
  const frame = JSON.parse(line)

  if (!SUPPORTED_FRAME_TYPES.has(frame?.type)) {
    throw new Error('Unsupported frame')
  }

  return frame
}
