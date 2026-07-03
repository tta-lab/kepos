import type { AvatarMediaReference } from './avatar-media.ts'
import type { HomePolicy } from './home-room.ts'
import type { SigningIdentity } from './signed-record.ts'
import {
  createSignedHomeAddressPayload,
  createSignedTrustInvitePayload,
  encodeQrUri
} from './signed-qr-payload.ts'

type ShareQrHomeRoom = {
  address: string
  policy: HomePolicy
  roomKey: string
}

export type ShareQrProfile = {
  avatarMedia?: AvatarMediaReference | null
  avatarUri?: string | null
  displayName: string
  homeRoom?: ShareQrHomeRoom | null
  identity: SigningIdentity
}

export type ShareQrPayloads = {
  debugHomeUri: string
  homeQrKind: 'advanced_home_descriptor'
  homeUri: string
  primaryUri: string
  productQrKind: 'profile'
  profileUri: string
}

export function createShareQrPayloads({
  avatarMedia,
  avatarUri,
  displayName,
  homeRoom,
  identity
}: ShareQrProfile): ShareQrPayloads {
  const homeDescriptor = homeRoom
    ? createSignedHomeAddressPayload({
        address: homeRoom.address,
        identity,
        policy: homeRoom.policy,
        roomKey: homeRoom.roomKey
      })
    : null
  const profileUri = encodeQrUri(
    createSignedTrustInvitePayload({
      avatarMedia,
      avatarUri,
      displayName,
      identity
    })
  )
  const homeUri = homeDescriptor ? encodeQrUri(homeDescriptor) : ''

  return {
    debugHomeUri: homeUri,
    homeQrKind: 'advanced_home_descriptor',
    homeUri,
    primaryUri: profileUri,
    productQrKind: 'profile',
    profileUri
  }
}
