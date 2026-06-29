export interface MobileTabMessage {
  direction?: string
  type?: string
}

export interface MobileTabBadgesInput {
  dmMessages?: readonly MobileTabMessage[]
  pendingRequests?: readonly unknown[]
}

export interface MobileRoomSessionPreview {
  roomKey?: string | null
}

export function getMobileTabBadges({
  dmMessages = [],
  pendingRequests = []
}: MobileTabBadgesInput) {
  return {
    direct: dmMessages.filter(
      (message) => message?.type === 'kepos.message.request.v1' && message?.direction === 'in'
    ).length,
    people: pendingRequests.length
  }
}

export function getMobileRoomKeyPreview(session?: MobileRoomSessionPreview | null) {
  const roomKey = session?.roomKey || ''
  return roomKey ? `${roomKey.slice(0, 8)}...${roomKey.slice(-8)}` : ''
}
