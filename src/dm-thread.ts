const DM_THREAD_VERSION = 1
const HEX_32 = /^[0-9a-f]{64}$/

export type DmThreadState = 'pending' | 'accepted' | 'revoked'

export type DmThread = {
  acceptedAt?: number
  channelDiscoveryKey: string
  channelPublicKey: string
  createdAt: number
  localProfileId: string
  remoteProfileId: string
  requestId?: string
  revokedAt?: number
  state: DmThreadState
  threadId: string
}

export type SerializedDmThread = {
  thread: DmThread
  version: typeof DM_THREAD_VERSION
}

export function createDmThread({
  channelDiscoveryKey,
  channelPublicKey,
  createdAt = Date.now(),
  localProfileId,
  remoteProfileId,
  requestId,
  threadId
}: {
  channelDiscoveryKey: string
  channelPublicKey: string
  createdAt?: number
  localProfileId: string
  remoteProfileId: string
  requestId?: string
  threadId: string
}): DmThread {
  const cleanLocalProfileId = cleanProfileId(localProfileId)
  const cleanRemoteProfileId = cleanProfileId(remoteProfileId)

  if (cleanLocalProfileId === cleanRemoteProfileId) {
    throw new Error('Remote profile must differ')
  }

  return dropEmpty({
    threadId: cleanString(threadId, 'Thread id is required'),
    localProfileId: cleanLocalProfileId,
    remoteProfileId: cleanRemoteProfileId,
    channelPublicKey: cleanChannelKey(channelPublicKey),
    channelDiscoveryKey: cleanChannelKey(channelDiscoveryKey),
    requestId: cleanOptionalString(requestId),
    createdAt: cleanTimestamp(createdAt, 'Created timestamp is required'),
    state: 'pending'
  }) as DmThread
}

export function acceptDmThread(thread: unknown, { acceptedAt }: { acceptedAt: number }): DmThread {
  const cleanThread = cleanDmThread(thread)

  if (cleanThread.revokedAt !== undefined) {
    return {
      ...cleanThread,
      state: 'revoked'
    }
  }

  return {
    ...cleanThread,
    acceptedAt: cleanTimestamp(acceptedAt, 'Accepted timestamp is required'),
    state: 'accepted'
  }
}

export function revokeDmThread(thread: unknown, { revokedAt }: { revokedAt: number }): DmThread {
  return {
    ...cleanDmThread(thread),
    revokedAt: cleanTimestamp(revokedAt, 'Revoked timestamp is required'),
    state: 'revoked'
  }
}

export function isDmThreadActive(thread: unknown): boolean {
  try {
    const cleanThread = cleanDmThread(thread)

    return cleanThread.state === 'accepted' && cleanThread.revokedAt === undefined
  } catch {
    return false
  }
}

export function serializeDmThread(thread: unknown): SerializedDmThread {
  return {
    version: DM_THREAD_VERSION,
    thread: cleanDmThread(thread)
  }
}

export function deserializeDmThread(stored: SerializedDmThread | string): DmThread {
  const value = typeof stored === 'string' ? JSON.parse(stored) : stored

  if (value?.version !== DM_THREAD_VERSION) {
    throw new Error('Unsupported DM thread version')
  }

  return cleanDmThread(value.thread)
}

function cleanDmThread(thread: unknown = {}): DmThread {
  const value = asRecord(thread)
  const state = cleanState(value.state)
  const localProfileId = cleanProfileId(value.localProfileId)
  const remoteProfileId = cleanProfileId(value.remoteProfileId)

  if (localProfileId === remoteProfileId) {
    throw new Error('Remote profile must differ')
  }

  const cleanThread = dropEmpty({
    threadId: cleanString(value.threadId, 'Thread id is required'),
    localProfileId,
    remoteProfileId,
    channelPublicKey: cleanChannelKey(value.channelPublicKey),
    channelDiscoveryKey: cleanChannelKey(value.channelDiscoveryKey),
    requestId: cleanOptionalString(value.requestId),
    createdAt: cleanTimestamp(value.createdAt, 'Created timestamp is required'),
    acceptedAt:
      value.acceptedAt === undefined
        ? undefined
        : cleanTimestamp(value.acceptedAt, 'Accepted timestamp is required'),
    revokedAt:
      value.revokedAt === undefined
        ? undefined
        : cleanTimestamp(value.revokedAt, 'Revoked timestamp is required'),
    state
  }) as DmThread

  if (state === 'accepted' && cleanThread.acceptedAt === undefined) {
    throw new Error('Accepted timestamp is required')
  }

  if (state === 'revoked' && cleanThread.revokedAt === undefined) {
    throw new Error('Revoked timestamp is required')
  }

  return cleanThread
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') {
    throw new Error('Expected object')
  }

  return value as Record<string, unknown>
}

function cleanState(value: unknown): DmThreadState {
  const state = cleanString(value, 'Thread state is required')

  if (!['pending', 'accepted', 'revoked'].includes(state)) {
    throw new Error('Invalid thread state')
  }

  return state as DmThreadState
}

function cleanProfileId(value: unknown): string {
  const profileId = cleanHex32(value, 'Invalid profile id')

  if (!profileId) {
    throw new Error('Invalid profile id')
  }

  return profileId
}

function cleanChannelKey(value: unknown): string {
  const key = cleanHex32(value, 'Invalid channel key')

  if (!key) {
    throw new Error('Invalid channel key')
  }

  return key
}

function cleanHex32(value: unknown, message: string): string | null {
  const hex = cleanString(value, message).toLowerCase()

  return HEX_32.test(hex) ? hex : null
}

function cleanTimestamp(value: unknown, message: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error(message)
  }

  return value as number
}

function cleanString(value: unknown, message: string): string {
  const cleaned = typeof value === 'string' ? value.trim() : ''

  if (!cleaned) {
    throw new Error(message)
  }

  return cleaned
}

function cleanOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value.trim() || undefined : undefined
}

function dropEmpty(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== null)
  )
}
