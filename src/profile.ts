import type { HomeRoom } from './home-room.ts'
import { createHomeRoom } from './home-room.ts'
import type { SigningIdentity } from './signed-record.ts'
import { createIdentityKeyPair } from './identity.ts'

export type DmEncryptionKeyPair = {
  publicKey: string
  secretKey: string
}

export type LocalProfile = {
  displayName: string
  dmEncryptionKeyPair: DmEncryptionKeyPair | null
  homeRoom: HomeRoom
  id: string
  identity: SigningIdentity
}

export function createProfile({
  dmEncryptionKeyPair = null,
  displayName = 'Kepos',
  homeRoomKey = null,
  identity = null
}: {
  displayName?: string | null
  dmEncryptionKeyPair?: DmEncryptionKeyPair | null
  homeRoomKey?: string | null
  identity?: SigningIdentity | null
} = {}): LocalProfile {
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

function cleanRequiredString(value: unknown, message: string): string {
  if (typeof value !== 'string') {
    throw new Error(message)
  }

  const cleaned = value?.trim()

  if (!cleaned) {
    throw new Error(message)
  }

  return cleaned
}
