export type TransportDebugLabelState = {
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
  directReady?: boolean
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

export type TransportDebugLabelOptions = {
  includeDirectReady?: boolean
}

export function formatTransportDebugLabel(
  debug?: TransportDebugLabelState | null,
  options: TransportDebugLabelOptions = {}
): string {
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
    options.includeDirectReady ? `directReady=${debug.directReady ? 'yes' : 'no'}` : null,
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
