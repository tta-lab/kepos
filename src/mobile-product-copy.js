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

export function getMobileTabButtonLabel(label, badgeCount) {
  if (badgeCount > 0) {
    return `${label}, ${badgeCount} pending`
  }

  return label
}

export function formatPendingBadgeCount(badgeCount) {
  return badgeCount > 99 ? '99+' : String(badgeCount)
}

export function shortenProfileId(value) {
  return value ? `${value.slice(0, 8)}...${value.slice(-8)}` : ''
}

export function displayDirectPeer(profileId, displayName = '') {
  return displayName?.trim() || `Profile ${shortenProfileId(profileId)}`
}

export function displayPostAuthor(post) {
  return post.authorDisplayName || post.author || shortenProfileId(post.authorProfileId) || 'anon'
}

export function formatMobilePostTime(
  value,
  formatTime = (nextValue, options) => new Date(nextValue).toLocaleTimeString([], options)
) {
  return formatTime(value, {
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function getMobileTreeholeEmptyCopy(status) {
  if (status === 'waiting' || status === 'waiting-for-bootstrap') {
    return 'Waiting for the home owner to share the treehole.'
  }

  if (status === 'starting') {
    return 'Starting the treehole.'
  }

  return 'Write the first post from this phone.'
}
