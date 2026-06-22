import { createProfile } from './profile.js'

const PROFILE_ID_KEY = 'kepos.profile.id'

export function getOrCreateLocalProfile({
  createId = createProfileId,
  displayName = 'Kepos',
  storage = getDefaultStorage()
} = {}) {
  const existingId = storage?.getItem?.(PROFILE_ID_KEY)?.trim()
  const id = existingId || createId()

  if (!existingId) {
    storage?.setItem?.(PROFILE_ID_KEY, id)
  }

  return createProfile({
    id,
    displayName
  })
}

function createProfileId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function getDefaultStorage() {
  try {
    return globalThis.localStorage || null
  } catch {
    return null
  }
}
