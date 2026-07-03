import { createDefaultSecureHexId } from './secure-id.ts'

const HOME_POLICIES = new Set(['trusted_only', 'public'])
const ROOM_KEY_PATTERN = /^[0-9a-f]{64}$/

export type HomePolicy = 'trusted_only' | 'public'

export type HomeRoom = {
  address: string
  ownerProfileId: string
  policy: HomePolicy
  roomKey: string
}

export function createHomeRoom({
  ownerProfileId,
  address = null,
  roomKey = address || createRoomKey(),
  policy = 'trusted_only'
}: {
  address?: string | null
  ownerProfileId: string
  policy?: unknown
  roomKey?: string | null
}): HomeRoom {
  const cleanOwnerProfileId = cleanRequiredString(
    ownerProfileId,
    'Home owner profile id is required'
  )
  const cleanRoomKey = cleanRequiredString(roomKey, 'Home room key is required')

  if (!isRoomKey(cleanRoomKey)) {
    throw new Error('Invalid home room key')
  }

  const cleanAddress = cleanRequiredString(address || cleanRoomKey, 'Home address is required')

  if (!isHomePolicy(policy)) {
    throw new Error('Invalid home policy')
  }

  return {
    ownerProfileId: cleanOwnerProfileId,
    address: cleanAddress,
    roomKey: cleanRoomKey,
    policy: policy as HomePolicy
  }
}

export function isHomePolicy(policy: unknown): policy is HomePolicy {
  return typeof policy === 'string' && HOME_POLICIES.has(policy)
}

function createRoomKey(): string {
  return createDefaultSecureHexId(32)
}

function isRoomKey(value: unknown): value is string {
  return typeof value === 'string' && ROOM_KEY_PATTERN.test(value)
}

function cleanRequiredString(value: unknown, message: string): string {
  const cleaned = typeof value === 'string' ? value.trim() : ''

  if (!cleaned) {
    throw new Error(message)
  }

  return cleaned
}
