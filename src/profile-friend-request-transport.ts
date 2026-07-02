import type { MessageRequest } from './message-request.ts'
import type { SigningIdentity } from './signed-record.ts'

export type ProfileFriendRequestDeliveryState =
  | 'queued'
  | 'searching'
  | 'sent'
  | 'delivered'
  | 'accepted'
  | 'failed'

export type ProfileFriendRequestDeliveryResult = {
  reason?: string
  state: ProfileFriendRequestDeliveryState
}

export type ProfileFriendRequestTransport = {
  send(
    request: MessageRequest
  ): ProfileFriendRequestDeliveryResult | Promise<ProfileFriendRequestDeliveryResult>
}

export type ProfileFriendRequestLocalProfile = {
  identity: SigningIdentity
  profileId: string
}

export async function sendProfileFriendRequest({
  localProfile,
  request,
  targetProfileId,
  transport = createQueuedProfileFriendRequestTransport()
}: {
  localProfile: ProfileFriendRequestLocalProfile
  request: MessageRequest
  targetProfileId: string
  transport?: ProfileFriendRequestTransport | null
}): Promise<ProfileFriendRequestDeliveryResult> {
  const cleanLocalProfileId = cleanProfileId(
    localProfile?.profileId,
    'Local profile id is required'
  )
  const cleanTargetProfileId = cleanProfileId(targetProfileId, 'Target profile id is required')

  if (localProfile?.identity?.publicKey !== cleanLocalProfileId) {
    throw new Error('Local profile identity mismatch')
  }

  if (request?.fromProfileId !== cleanLocalProfileId) {
    throw new Error('Friend request sender mismatch')
  }

  if (request?.toProfileId !== cleanTargetProfileId) {
    throw new Error('Friend request target mismatch')
  }

  return await Promise.resolve(transport?.send(request) ?? { state: 'queued' })
}

export function createQueuedProfileFriendRequestTransport(): ProfileFriendRequestTransport {
  return {
    send() {
      return {
        reason: 'Profile request P2P route is not connected yet.',
        state: 'queued'
      }
    }
  }
}

export function formatProfileFriendRequestDeliveryState(
  state?: ProfileFriendRequestDeliveryState | string | null
): string {
  if (state === 'sent') return 'Request sent'
  if (state === 'delivered') return 'Request delivered'
  if (state === 'accepted') return 'Friend'
  if (state === 'failed') return 'Request failed'
  if (state === 'searching') return 'Request searching'
  return 'Request pending'
}

function cleanProfileId(value: unknown, message: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(message)
  }

  return value.trim()
}
