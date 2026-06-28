import {
  createDesktopState,
  getDesktopHomeStatus,
  getDesktopTreeholeStatus
} from './desktop-state.js'

export function createDesktopStatusViewModel({
  session = null,
  shortenProfileId = (value) => value,
  state = createDesktopState()
} = {}) {
  const inRoom = state?.view === 'room'

  return {
    errorDetailLabel: state?.lastError || 'none',
    homeStatusLabel: getDesktopHomeStatus(state),
    noticeLabel: state?.notice || '',
    peerLabel: String(state?.peers || 0),
    profileIdLabel: session?.profileId ? shortenProfileId(session.profileId) : 'not ready',
    roomKeyLabel: inRoom ? shortenProfileId(state.roomKey) : 'not joined',
    transportDebugLabel: formatTransportDebug(state?.transportDebug),
    treeholeStatusLabel: getDesktopTreeholeStatus(state)
  }
}

function formatTransportDebug(debug) {
  if (!debug) return 'none'

  return [
    `stage=${debug.stage || 'unknown'}`,
    `connections=${debug.connections ?? 0}`,
    `connecting=${debug.connecting ?? 0}`,
    `knownPeers=${debug.knownPeers ?? 0}`,
    `discovered=${debug.discovered ?? 0}`,
    `localPeers=${debug.localPeers ?? 0}`,
    `reads=${debug.frameReads ?? 0}/${debug.byteReads ?? 0}`,
    `writes=${debug.frameWrites ?? 0}/${debug.byteWrites ?? 0}`,
    `decodeErrors=${debug.frameDecodeErrors ?? 0}`,
    debug.lastReadType ? `lastRead=${debug.lastReadType}` : null,
    debug.lastWriteType ? `lastWrite=${debug.lastWriteType}` : null,
    formatFrameTypes('readTypes', debug.readTypes),
    formatFrameTypes('writeTypes', debug.writeTypes),
    `topics=${debug.topics ?? 0}`,
    debug.directEndpoint?.host && debug.directEndpoint?.port
      ? `direct=${debug.directEndpoint.host}:${debug.directEndpoint.port}`
      : null,
    `client=${debug.isClient ? 'yes' : 'no'}`,
    `server=${debug.isServer ? 'yes' : 'no'}`,
    `listening=${debug.listening ? 'yes' : 'no'}`,
    `activeQuery=${debug.activeQuery ? 'yes' : 'no'}`,
    `lastPeerClient=${debug.lastPeerClient ? 'yes' : 'no'}`,
    `lastPeerSelf=${debug.lastPeerSelf ? 'yes' : 'no'}`,
    `lastPeerTopics=${debug.lastPeerTopics ?? 0}`,
    `dhtOnline=${debug.dhtOnline ? 'yes' : 'no'}`,
    `dhtFirewalled=${debug.dhtFirewalled ? 'yes' : 'no'}`,
    `dhtNodes=${debug.dhtNodes ?? 0}`
  ]
    .filter(Boolean)
    .join(' ')
}

function formatFrameTypes(label, counts) {
  if (!counts || typeof counts !== 'object') return null

  const entries = Object.entries(counts)
  if (entries.length === 0) return null

  return `${label}=${entries.map(([type, count]) => `${type}:${count}`).join(',')}`
}
