import { isHomePolicy } from './home-room.ts'

const TRUST_INVITE = 'kepos.trust.invite.v1'
const HOME_ADDRESS = 'kepos.home.address.v1'
const ROOM_KEY_PATTERN = /^[0-9a-f]{64}$/

type HomePolicy = 'public' | 'trusted_only'

export type TrustInviteQrPayload = {
  profileId: string
  type: typeof TRUST_INVITE
}

export type HomeAddressQrPayload = {
  address: string
  ownerProfileId: string
  policy: HomePolicy
  roomKey: string
  type: typeof HOME_ADDRESS
}

export type QrPayload = TrustInviteQrPayload | HomeAddressQrPayload

export function encodeQrPayload(payload: unknown): string {
  return JSON.stringify(validatePayload(payload))
}

export function decodeQrPayload(encoded: string): QrPayload {
  try {
    return validatePayload(JSON.parse(encoded))
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.startsWith('Invalid') || error.message.startsWith('Unsupported'))
    ) {
      throw error
    }

    throw new Error('Invalid QR payload')
  }
}

function validatePayload(payload: unknown): QrPayload {
  const value = asRecord(payload)

  if (value.type === TRUST_INVITE) {
    return {
      type: TRUST_INVITE,
      profileId: cleanRequiredString(value.profileId, 'Profile id is required')
    }
  }

  if (value.type === HOME_ADDRESS) {
    const policy = value.policy || 'trusted_only'
    const address = cleanRequiredString(value.address, 'Home address is required')
    const roomKey = cleanRequiredString(value.roomKey || address, 'Home room key is required')

    if (!isHomePolicy(policy)) {
      throw new Error('Invalid home policy')
    }

    if (!isRoomKey(roomKey)) {
      throw new Error('Invalid home room key')
    }

    return {
      type: HOME_ADDRESS,
      ownerProfileId: cleanRequiredString(
        value.ownerProfileId,
        'Home owner profile id is required'
      ),
      address,
      roomKey,
      policy: policy as HomePolicy
    }
  }

  throw new Error('Unsupported QR payload')
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid QR payload')
  }

  return value as Record<string, unknown>
}

function cleanRequiredString(value: unknown, message: string): string {
  const cleaned = typeof value === 'string' ? value.trim() : ''

  if (!cleaned) {
    throw new Error(message)
  }

  return cleaned
}

function isRoomKey(value: unknown): value is string {
  return typeof value === 'string' && ROOM_KEY_PATTERN.test(value)
}
