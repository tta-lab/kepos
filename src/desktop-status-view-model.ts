import {
  createDesktopState,
  getDesktopHomeStatus,
  getDesktopTreeholeStatus
} from './desktop-state.ts'
import { formatTransportDebugLabel } from './transport-debug-label.ts'

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
    transportDebugLabel: formatTransportDebugLabel(state?.transportDebug),
    treeholeStatusLabel: getDesktopTreeholeStatus(state)
  }
}
