export function getMobileTabBadges({ dmMessages = [], pendingRequests = [] }) {
  return {
    direct: dmMessages.filter(
      (message) => message?.type === 'kepos.message.request.v1' && message?.direction === 'in'
    ).length,
    people: pendingRequests.length
  }
}

export function getMobileRoomKeyPreview(session) {
  const roomKey = session?.roomKey || ''
  return roomKey ? `${roomKey.slice(0, 8)}...${roomKey.slice(-8)}` : ''
}
