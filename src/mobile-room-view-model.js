export function getMobileTabBadges({ dmMessages = [], pendingRequests = [] }) {
  return {
    direct: dmMessages.filter(
      (message) => message?.type === 'kepos.message.request.v1' && message?.direction === 'in'
    ).length,
    people: pendingRequests.length
  }
}
