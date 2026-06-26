import { createChatSession } from './chat-session.js'

const ROOM_KEY_PATTERN = /^[0-9a-f]{64}$/

export function createHomeJoinSession({ profile, nick }) {
  const homeRoom = profile?.homeRoom

  if (!homeRoom?.ownerProfileId) {
    throw new Error('Home owner profile id is required')
  }

  if (!isRoomKey(homeRoom.roomKey)) {
    throw new Error('Invalid home room key')
  }

  return createJoinSession({
    address: homeRoom.address,
    identity: profile.identity,
    nick,
    ownerProfileId: homeRoom.ownerProfileId,
    policy: homeRoom.policy,
    profileId: profile.id,
    roomKey: homeRoom.roomKey
  })
}

export function createManualHomeJoinSession({
  identity = null,
  nick,
  ownerProfileId = null,
  policy = 'trusted_only',
  profileId = null,
  roomKey
}) {
  if (!isRoomKey(roomKey)) {
    throw new Error('Invalid room key')
  }

  return createJoinSession({
    address: roomKey,
    identity,
    nick,
    ownerProfileId: ownerProfileId?.trim() || null,
    policy,
    profileId,
    roomKey
  })
}

export function createHomeJoinSessionFromAddress({
  address,
  identity = null,
  nick,
  ownerProfileId,
  policy = 'trusted_only',
  profileId = null,
  roomKey
}) {
  if (!isRoomKey(roomKey)) {
    throw new Error('Invalid room key')
  }

  return createJoinSession({
    address,
    identity,
    nick,
    ownerProfileId: ownerProfileId?.trim() || null,
    policy,
    profileId,
    roomKey
  })
}

function createJoinSession({
  address,
  identity,
  nick,
  ownerProfileId,
  policy,
  profileId,
  roomKey
}) {
  return {
    address,
    identity,
    ownerProfileId,
    policy,
    profileId: profileId?.trim() || null,
    roomKey,
    session: createChatSession({
      nick,
      profileId,
      roomKey
    })
  }
}

function isRoomKey(value) {
  return typeof value === 'string' && ROOM_KEY_PATTERN.test(value)
}
