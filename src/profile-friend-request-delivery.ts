export type ProfileFriendRequestDeliveryState =
  | 'queued'
  | 'searching'
  | 'sent'
  | 'delivered'
  | 'accepted'
  | 'failed'

export function formatProfileFriendRequestDeliveryState(
  state?: ProfileFriendRequestDeliveryState | string | null
): string {
  if (state === 'sent') return 'Request sent'
  if (state === 'delivered') return 'Request delivered'
  if (state === 'accepted') return 'Request accepted'
  if (state === 'failed') return 'Request failed'
  if (state === 'searching') return 'Looking for profile'
  return 'Request pending'
}

export function formatProfileFriendAcceptanceDeliveryNotice(
  state?: ProfileFriendRequestDeliveryState | string | null
): string {
  if (state === 'delivered') return 'Friend request accepted. Invite delivered.'
  if (state === 'sent') return 'Friend request accepted. Invite sent.'
  if (state === 'failed') return 'Friend request accepted locally. Invite delivery failed.'
  if (state === 'queued' || state === 'searching') {
    return 'Friend request accepted locally. Waiting for profile delivery.'
  }

  return 'Friend request accepted.'
}
