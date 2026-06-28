export function getMobileHomeStatus({ online, session }) {
  if (!session) {
    return 'Offline'
  }

  if (online > 0) {
    return 'Connected'
  }

  return 'Waiting for friends'
}

export function getMobileTreeholeStatus(status) {
  if (status === 'ready') {
    return 'Treehole ready'
  }

  if (status === 'starting') {
    return 'Treehole starting'
  }

  if (status === 'waiting' || status === 'waiting-for-bootstrap') {
    return 'Waiting treehole'
  }

  return 'Treehole offline'
}

export function getMobileBackendNotice(status) {
  if (
    status === 'joining' ||
    status === 'preparing' ||
    status === 'joining-swarm' ||
    status === 'opening-dm' ||
    status === 'opening-treehole'
  ) {
    return 'Starting home...'
  }

  if (
    status === 'opening-treehole-store' ||
    status === 'opening-treehole-replication' ||
    status === 'opening-treehole-state'
  ) {
    return 'Syncing treehole...'
  }

  if (status === 'joined') {
    return 'Connected.'
  }

  if (status === 'left') {
    return 'Left home.'
  }

  return 'Home status updated.'
}

export function getMobileRoomSurface(activeTab) {
  if (activeTab === 'dm') {
    return 'Direct messages'
  }

  if (activeTab === 'treehole') {
    return 'Treehole'
  }

  if (activeTab === 'people') {
    return 'People'
  }

  return 'Home chat'
}

export function formatMobileTrustSource(source) {
  if (source === 'profile_qr' || source === 'person_qr') return 'Profile QR'
  if (source === 'home_room') return 'Home'
  if (source === 'message_request') return 'Message request'
  return 'local trust'
}

export function formatMobileTrustTime(
  trustedAt,
  formatDate = (value) => new Date(value).toLocaleDateString()
) {
  if (!Number.isFinite(trustedAt)) return 'recently'
  return formatDate(trustedAt)
}

export function formatRequestPreview(text) {
  return text?.trim() || 'No message yet'
}

export function formatMessageRequestTitle(request) {
  const name = request?.alias?.trim() || 'Someone'
  return `${name} wants to start a direct chat.`
}
