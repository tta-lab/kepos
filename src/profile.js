import { createHomeRoom } from './home-room.ts'
import { createIdentityKeyPair } from './identity.js'

export function createProfile({
  dmEncryptionKeyPair = null,
  displayName = 'Kepos',
  homeRoomKey = null,
  identity = null
} = {}) {
  const profileIdentity = identity || createIdentityKeyPair()
  const profileId = cleanRequiredString(profileIdentity.publicKey, 'Profile id is required')

  return {
    id: profileId,
    displayName: displayName?.trim() || 'Kepos',
    dmEncryptionKeyPair,
    identity: profileIdentity,
    homeRoom: createHomeRoom({
      ownerProfileId: profileId,
      roomKey: homeRoomKey || undefined
    })
  }
}

function cleanRequiredString(value, message) {
  const cleaned = value?.trim()

  if (!cleaned) {
    throw new Error(message)
  }

  return cleaned
}
