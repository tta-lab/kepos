import { isHomePolicy } from './home-room.js'

const TRUST_INVITE = 'kepos.trust.invite.v1'
const HOME_ADDRESS = 'kepos.home.address.v1'

export function encodeQrPayload(payload) {
  return JSON.stringify(validatePayload(payload))
}

export function decodeQrPayload(encoded) {
  try {
    return validatePayload(JSON.parse(encoded))
  } catch (error) {
    if (error.message.startsWith('Invalid') || error.message.startsWith('Unsupported')) {
      throw error
    }

    throw new Error('Invalid QR payload')
  }
}

function validatePayload(payload) {
  if (payload?.type === TRUST_INVITE) {
    return {
      type: TRUST_INVITE,
      profileId: cleanRequiredString(payload.profileId, 'Profile id is required')
    }
  }

  if (payload?.type === HOME_ADDRESS) {
    const policy = payload.policy || 'trusted_only'

    if (!isHomePolicy(policy)) {
      throw new Error('Invalid home policy')
    }

    return {
      type: HOME_ADDRESS,
      ownerProfileId: cleanRequiredString(
        payload.ownerProfileId,
        'Home owner profile id is required'
      ),
      address: cleanRequiredString(payload.address, 'Home address is required'),
      policy
    }
  }

  throw new Error('Unsupported QR payload')
}

function cleanRequiredString(value, message) {
  const cleaned = value?.trim()

  if (!cleaned) {
    throw new Error(message)
  }

  return cleaned
}
