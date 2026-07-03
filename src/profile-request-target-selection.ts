import type { ContactBook } from './contact-book.ts'
import {
  createFriendRequestTargetViewModel,
  type FriendRequestTargetViewModel
} from './friend-request-target-view-model.ts'

export type ProfileRequestTargetInput = {
  avatarMediaSnapshot?: FriendRequestTargetViewModel['avatarMediaSnapshot']
  avatarUri?: string
  displayName?: string
  profileId: string
}

export type ProfileRequestTargetSelectionInput = {
  contactBook?: ContactBook | null
  displayNameOverride?: string | null
  shortenProfileId?: (profileId: string) => string
  target: ProfileRequestTargetInput
}

export type ProfileRequestTargetSelection = {
  notice: string
  profileId: string
  target: ProfileRequestTargetInput
  targetView: FriendRequestTargetViewModel
}

export function createProfileRequestTargetSelection({
  contactBook,
  displayNameOverride,
  shortenProfileId,
  target
}: ProfileRequestTargetSelectionInput): ProfileRequestTargetSelection {
  const cleanDisplayName = displayNameOverride?.trim()
  const selectedTarget = cleanDisplayName ? { ...target, displayName: cleanDisplayName } : target
  const targetView = createFriendRequestTargetViewModel({
    contactBook,
    shortenProfileId,
    target: selectedTarget
  })

  return {
    notice: targetView.copy,
    profileId: target.profileId,
    target: selectedTarget,
    targetView
  }
}
