export interface MobileTabMessage {
  direction?: string
  type?: string
}

export interface MobileTabBadgesInput {
  dmMessages?: readonly MobileTabMessage[]
  outgoingRequests?: readonly unknown[]
  pendingRequests?: readonly unknown[]
}

export interface MobileRoomSessionPreview {
  roomKey?: string | null
}

export function getMobileTabBadges({
  dmMessages = [],
  outgoingRequests = [],
  pendingRequests = []
}: MobileTabBadgesInput) {
  return {
    direct: dmMessages.filter(
      (message) => message?.type === 'kepos.message.request.v1' && message?.direction === 'in'
    ).length,
    people: pendingRequests.length + outgoingRequests.length
  }
}

export function getMobileRoomKeyPreview(session?: MobileRoomSessionPreview | null) {
  const roomKey = session?.roomKey || ''
  return roomKey ? `${roomKey.slice(0, 8)}...${roomKey.slice(-8)}` : ''
}
