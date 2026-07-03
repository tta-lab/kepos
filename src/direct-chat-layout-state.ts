export type DirectChatLayoutStateInput = {
  recipientProfileId?: string | null
  requestTargetProfileId?: string | null
}

export type DirectChatLayoutState = {
  hasRequestTarget: boolean
  hideContactEmpty: boolean
  hideThreadList: boolean
}

export function createDirectChatLayoutState({
  recipientProfileId,
  requestTargetProfileId
}: DirectChatLayoutStateInput = {}): DirectChatLayoutState {
  const hasRequestTarget = Boolean(
    recipientProfileId?.trim() &&
    requestTargetProfileId?.trim() &&
    recipientProfileId.trim() === requestTargetProfileId.trim()
  )

  return {
    hasRequestTarget,
    hideContactEmpty: hasRequestTarget,
    hideThreadList: hasRequestTarget
  }
}
