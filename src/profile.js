import { createHomeRoom } from './home-room.js'

export function createProfile({ id = createProfileId(), displayName = 'Kepos' } = {}) {
  const profileId = cleanRequiredString(id, 'Profile id is required')

  return {
    id: profileId,
    displayName: displayName?.trim() || 'Kepos',
    homeRoom: createHomeRoom({
      ownerProfileId: profileId
    })
  }
}

function createProfileId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function cleanRequiredString(value, message) {
  const cleaned = value?.trim()

  if (!cleaned) {
    throw new Error(message)
  }

  return cleaned
}
