import crypto from 'hypercore-crypto'
import b4a from 'b4a'

const ROOM_KEY_PATTERN = /^[0-9a-f]{64}$/
const TOPIC_PREFIX = 'kepos-room:v1:'
const SUPPORTED_FRAME_TYPES = [
  'chat',
  'kepos.dm.body.v1',
  'kepos.dm.invite.v1',
  'kepos.home.hello.request.v1',
  'kepos.home.hello.v1',
  'kepos.message.request.v1',
  'treehole.bootstrap',
  'treehole.state.v1',
  'treehole.writer'
] as const
const SUPPORTED_FRAME_TYPE_SET = new Set<string>(SUPPORTED_FRAME_TYPES)

export type SupportedFrameType = (typeof SUPPORTED_FRAME_TYPES)[number]
export type ProtocolFrame = {
  type: SupportedFrameType
  [key: string]: unknown
}

export function createRoomKey(): string {
  return b4a.toString(crypto.randomBytes(32), 'hex')
}

export function isRoomKey(value: unknown): value is string {
  return typeof value === 'string' && ROOM_KEY_PATTERN.test(value)
}

export function deriveTopic(roomKey: string): Uint8Array {
  if (!isRoomKey(roomKey)) {
    throw new Error('Invalid room key')
  }

  return crypto.hash(b4a.from(`${TOPIC_PREFIX}${roomKey}`))
}

export function encodeFrame(message: ProtocolFrame): string {
  return `${JSON.stringify(message)}\n`
}

export function decodeFrame(line: string): ProtocolFrame {
  const frame = JSON.parse(line)

  if (!isProtocolFrame(frame)) {
    throw new Error('Unsupported frame')
  }

  return frame
}

function isProtocolFrame(value: unknown): value is ProtocolFrame {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { type?: unknown }).type === 'string' &&
    SUPPORTED_FRAME_TYPE_SET.has((value as { type: string }).type)
  )
}
