import type { ContactBook } from './contact-book.ts'
import {
  createFriendRequestTargetViewModel,
  shouldBlockChatSendForFriendRequestTarget,
  type FriendRequestTargetViewModel
} from './friend-request-target-view-model.ts'

type DirectChatSendGateTarget = {
  avatarMediaSnapshot?: FriendRequestTargetViewModel['avatarMediaSnapshot']
  avatarUri?: string
  displayName?: string
  profileId?: string
}

export type DirectChatSendGateInput = {
  contactBook?: ContactBook | null
  profileRequestTarget?: DirectChatSendGateTarget | null
  recipientProfileId?: string | null
  shortenProfileId?: (profileId: string) => string
}

export type DirectChatSendGate = {
  canSend: boolean
  notice?: string
  requestTarget: FriendRequestTargetViewModel
}

export function createDirectChatSendGate({
  contactBook,
  profileRequestTarget,
  recipientProfileId,
  shortenProfileId
}: DirectChatSendGateInput): DirectChatSendGate | null {
  const cleanRecipient = recipientProfileId?.trim()
  if (!cleanRecipient) return null

  const requestTarget = createFriendRequestTargetViewModel({
    contactBook,
    shortenProfileId,
    target:
      profileRequestTarget?.profileId === cleanRecipient
        ? { ...profileRequestTarget, profileId: cleanRecipient }
        : { profileId: cleanRecipient }
  })

  if (shouldBlockChatSendForFriendRequestTarget(requestTarget)) {
    return {
      canSend: false,
      notice: requestTarget.copy,
      requestTarget
    }
  }

  return {
    canSend: true,
    requestTarget
  }
}
