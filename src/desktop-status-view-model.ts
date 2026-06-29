import {
  createDesktopState,
  getDesktopHomeStatus,
  getDesktopTreeholeStatus
} from './desktop-state.ts'

type ShortenProfileId = (value: string) => string

type DesktopSessionLike = {
  profileId?: string
}

type DesktopTransportDebug = {
  activeQuery?: boolean
  byteReads?: number
  byteWrites?: number
  connecting?: number
  connections?: number
  dhtFirewalled?: boolean
  dhtNodes?: number
  dhtOnline?: boolean
  directEndpoint?: {
    host?: string
    port?: number
  }
  discovered?: number
  frameDecodeErrors?: number
  frameReads?: number
  frameWrites?: number
  isClient?: boolean
  isServer?: boolean
  knownPeers?: number
  lastPeerClient?: boolean
  lastPeerSelf?: boolean
  lastPeerTopics?: number
  lastReadType?: string
  lastWriteType?: string
  listening?: boolean
  localPeers?: number
  readTypes?: Record<string, number>
  stage?: string
  topics?: number
  writeTypes?: Record<string, number>
}

type DesktopStateLike = ReturnType<typeof createDesktopState> & {
  transportDebug?: DesktopTransportDebug | null
}

export type DesktopStatusViewModel = {
  errorDetailLabel: string
  homeStatusLabel: string
  noticeLabel: string
  peerLabel: string
  profileIdLabel: string
  roomKeyLabel: string
  transportDebugLabel: string
  treeholeStatusLabel: string
}

export function createDesktopStatusViewModel({
  session = null,
  shortenProfileId = (value) => value,
  state = createDesktopState()
}: {
  session?: DesktopSessionLike | null
  shortenProfileId?: ShortenProfileId
  state?: DesktopStateLike
} = {}): DesktopStatusViewModel {
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

function formatTransportDebug(debug?: DesktopTransportDebug | null): string {
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

function formatFrameTypes(label: string, counts?: Record<string, number>): string | null {
  if (!counts || typeof counts !== 'object') return null

  const entries = Object.entries(counts)
  if (entries.length === 0) return null

  return `${label}=${entries.map(([type, count]) => `${type}:${count}`).join(',')}`
}
