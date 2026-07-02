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
