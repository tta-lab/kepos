import type { HomeRoom } from './home-room.ts'
import { createHomeRoom } from './home-room.ts'
import type { SigningIdentity } from './signed-record.ts'
import { createIdentityKeyPair } from './identity.ts'
import { isAvatarMediaReference, type AvatarMediaReference } from './avatar-media.ts'

export type DmEncryptionKeyPair = {
  publicKey: string
  secretKey: string
}

export type LocalProfile = {
  avatarMedia?: AvatarMediaReference
  avatarUri?: string
  displayName: string
  dmEncryptionKeyPair: DmEncryptionKeyPair | null
  homeRoom: HomeRoom
  id: string
  identity: SigningIdentity
}

export function createProfile({
  avatarMedia = null,
  avatarUri = null,
  dmEncryptionKeyPair = null,
  displayName = 'Kepos',
  homeRoomKey = null,
  identity = null
}: {
  avatarMedia?: AvatarMediaReference | null
  avatarUri?: string | null
  displayName?: string | null
  dmEncryptionKeyPair?: DmEncryptionKeyPair | null
  homeRoomKey?: string | null
  identity?: SigningIdentity | null
} = {}): LocalProfile {
  const profileIdentity = identity || createIdentityKeyPair()
  const profileId = cleanRequiredString(profileIdentity.publicKey, 'Profile id is required')

  return {
    id: profileId,
    ...(avatarMedia ? { avatarMedia: cleanAvatarMediaReference(avatarMedia) } : {}),
    ...(avatarUri?.trim() ? { avatarUri: avatarUri.trim() } : {}),
    displayName: displayName?.trim() || 'Kepos',
    dmEncryptionKeyPair,
    identity: profileIdentity,
    homeRoom: createHomeRoom({
      ownerProfileId: profileId,
      roomKey: homeRoomKey || undefined
    })
  }
}

function cleanAvatarMediaReference(value: unknown): AvatarMediaReference {
  if (!isAvatarMediaReference(value)) {
    throw new Error('Invalid avatar media reference')
  }

  return value
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
