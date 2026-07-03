import type { AvatarMediaReference } from './avatar-media.ts'

export type ProfileAvatarViewModel = {
  imageUri?: string
  initials: string
  label: string
  tone: string
}

export type ResolveAvatarMediaUri = (reference: AvatarMediaReference) => string | null | undefined

export function createProfileAvatarViewModel({
  avatarMediaSnapshot = null,
  avatarUri = '',
  displayName = '',
  profileId = '',
  resolveAvatarMediaUri = null
}: {
  avatarMediaSnapshot?: AvatarMediaReference | null
  avatarUri?: string | null
  displayName?: string | null
  profileId: string
  resolveAvatarMediaUri?: ResolveAvatarMediaUri | null
}): ProfileAvatarViewModel {
  const cleanDisplayName = displayName?.trim() || ''
  const cleanAvatarUri = avatarUri?.trim() || ''
  const imageUri = resolveAvatarImageUri({
    avatarMediaSnapshot,
    avatarUri: cleanAvatarUri,
    resolveAvatarMediaUri
  })
  const fallbackName = profileId.slice(0, 2).toLowerCase() || 'profile'
  const labelName = cleanDisplayName || `Profile ${fallbackName}`

  return {
    ...(imageUri ? { imageUri } : {}),
    initials: readInitials(cleanDisplayName, profileId),
    label: `${labelName} avatar`,
    tone: `avatarTone${hashProfileId(profileId) % 6}`
  }
}

function resolveAvatarImageUri({
  avatarMediaSnapshot,
  avatarUri,
  resolveAvatarMediaUri
}: {
  avatarMediaSnapshot?: AvatarMediaReference | null
  avatarUri: string
  resolveAvatarMediaUri?: ResolveAvatarMediaUri | null
}): string {
  if (avatarMediaSnapshot && resolveAvatarMediaUri) {
    try {
      const resolvedUri = resolveAvatarMediaUri(avatarMediaSnapshot)?.trim()
      if (resolvedUri) return resolvedUri
    } catch {
      // Fall back to the signed URI snapshot if local media resolution fails.
    }
  }

  return avatarUri
}

function readInitials(displayName: string, profileId: string): string {
  if (!displayName) return profileId.slice(0, 2).toUpperCase() || '??'

  const words = displayName.split(/\s+/).filter(Boolean)
  if (words.length >= 2) {
    return words
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase()
  }

  return displayName[0]?.toUpperCase() || '??'
}

function hashProfileId(profileId: string): number {
  let hash = 2166136261

  for (const character of profileId) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619) >>> 0
  }

  return hash
}
