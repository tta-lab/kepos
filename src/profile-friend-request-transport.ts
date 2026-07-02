import Hyperswarm from 'hyperswarm'
import b4a from 'b4a'
import crypto from 'hypercore-crypto'
import type { MessageRequest } from './message-request.ts'
import { verifyMessageRequest } from './message-request.ts'
import type { SigningIdentity } from './signed-record.ts'

const PROFILE_FRIEND_REQUEST_TOPIC_PREFIX = 'kepos-profile-request:v1:'

export type ProfileFriendRequestDeliveryState =
  | 'queued'
  | 'searching'
  | 'sent'
  | 'delivered'
  | 'accepted'
  | 'failed'

export type ProfileFriendRequestDeliveryResult = {
  reason?: string
  state: ProfileFriendRequestDeliveryState
}

export type ProfileFriendRequestTransport = {
  send(
    request: MessageRequest
  ): ProfileFriendRequestDeliveryResult | Promise<ProfileFriendRequestDeliveryResult>
}

export type ProfileFriendRequestRuntime = ProfileFriendRequestTransport & {
  close(): Promise<void>
  open(): Promise<void>
}

export type ProfileFriendRequestLocalProfile = {
  identity: SigningIdentity
  profileId: string
}

export async function sendProfileFriendRequest({
  localProfile,
  request,
  targetProfileId,
  transport = createQueuedProfileFriendRequestTransport()
}: {
  localProfile: ProfileFriendRequestLocalProfile
  request: MessageRequest
  targetProfileId: string
  transport?: ProfileFriendRequestTransport | null
}): Promise<ProfileFriendRequestDeliveryResult> {
  const cleanLocalProfileId = cleanProfileId(
    localProfile?.profileId,
    'Local profile id is required'
  )
  const cleanTargetProfileId = cleanProfileId(targetProfileId, 'Target profile id is required')

  if (localProfile?.identity?.publicKey !== cleanLocalProfileId) {
    throw new Error('Local profile identity mismatch')
  }

  if (request?.fromProfileId !== cleanLocalProfileId) {
    throw new Error('Friend request sender mismatch')
  }

  if (request?.toProfileId !== cleanTargetProfileId) {
    throw new Error('Friend request target mismatch')
  }

  return await Promise.resolve(transport?.send(request) ?? { state: 'queued' })
}

export function createQueuedProfileFriendRequestTransport(): ProfileFriendRequestTransport {
  return {
    send() {
      return {
        reason: 'Profile request P2P route is not connected yet.',
        state: 'queued'
      }
    }
  }
}

export function deriveProfileFriendRequestTopic(profileId: string): Uint8Array {
  return crypto.hash(
    b4a.from(
      `${PROFILE_FRIEND_REQUEST_TOPIC_PREFIX}${cleanHexProfileId(
        profileId,
        'Profile id is required'
      )}`
    )
  )
}

export function createProfileFriendRequestRuntime({
  awaitDiscoveryFlush = true,
  createSwarm = () => new Hyperswarm() as ProfileFriendRequestSwarm,
  localProfileId,
  onDeliveryState = () => {},
  onDiscoveryError = () => {},
  onRequest = () => {}
}: {
  awaitDiscoveryFlush?: boolean
  createSwarm?: () => ProfileFriendRequestSwarm
  localProfileId: string
  onDeliveryState?: (delivery: ProfileFriendRequestDeliveryUpdate) => void
  onDiscoveryError?: (error: Error) => void
  onRequest?: (request: MessageRequest) => void
}): ProfileFriendRequestRuntime {
  const cleanLocalProfileId = cleanHexProfileId(localProfileId, 'Local profile id is required')
  const incomingRequestIds = new Set<string>()
  const sendRoutes = new Map<string, ProfileFriendRequestSendRoute>()
  let inboxSwarm: ProfileFriendRequestSwarm | null = null

  async function open(): Promise<void> {
    await closeInbox()
    inboxSwarm = createSwarm()
    inboxSwarm.on('connection', addInboxPeer)
    const discovery = inboxSwarm.join(deriveProfileFriendRequestTopic(cleanLocalProfileId), {
      client: true,
      server: true
    })
    await flushDiscovery(discovery)
  }

  async function send(request: MessageRequest): Promise<ProfileFriendRequestDeliveryResult> {
    if (!verifyMessageRequest(request)) {
      return { reason: 'Invalid signed friend request.', state: 'failed' }
    }

    if (request.fromProfileId === request.toProfileId) {
      return { reason: 'Cannot send a friend request to the local profile.', state: 'failed' }
    }

    cleanHexProfileId(request.toProfileId, 'Target profile id is required')
    const route = getOrCreateSendRoute(request.toProfileId)
    const state = sendOnRoute(route, request) ? 'sent' : 'searching'

    if (state === 'searching') {
      onDeliveryState({
        requestId: request.requestId,
        state,
        toProfileId: request.toProfileId
      })
    }

    await flushDiscovery(route.discovery)

    return {
      state: route.sentRequestIds.has(request.requestId) ? 'sent' : state
    }
  }

  async function close(): Promise<void> {
    await closeInbox()
    await Promise.all([...sendRoutes.values()].map((route) => closeSendRoute(route)))
    sendRoutes.clear()
    incomingRequestIds.clear()
  }

  async function closeInbox(): Promise<void> {
    if (!inboxSwarm) return

    const closing = inboxSwarm
    inboxSwarm = null
    await closing.destroy()
  }

  function getOrCreateSendRoute(targetProfileId: string): ProfileFriendRequestSendRoute {
    const existing = sendRoutes.get(targetProfileId)
    if (existing) return existing

    const swarm = createSwarm()
    const route: ProfileFriendRequestSendRoute = {
      discovery: null,
      peers: new Set(),
      pendingRequests: new Map(),
      sentRequestIds: new Set(),
      swarm,
      targetProfileId
    }
    swarm.on('connection', (socket) => addSendPeer(route, socket))
    route.discovery = swarm.join(deriveProfileFriendRequestTopic(targetProfileId), {
      client: true,
      server: false
    })
    sendRoutes.set(targetProfileId, route)
    return route
  }

  function addSendPeer(route: ProfileFriendRequestSendRoute, socket: ProfileFriendRequestSocket) {
    route.peers.add(socket)
    socket.on('close', () => route.peers.delete(socket))
    socket.on('error', () => route.peers.delete(socket))

    for (const request of route.pendingRequests.values()) {
      sendOnRoute(route, request)
    }
  }

  function sendOnRoute(route: ProfileFriendRequestSendRoute, request: MessageRequest): boolean {
    route.pendingRequests.set(request.requestId, request)
    let sent = false

    for (const peer of route.peers) {
      if (peer.destroyed) continue

      peer.write(`${JSON.stringify(request)}\n`)
      sent = true
    }

    if (sent && !route.sentRequestIds.has(request.requestId)) {
      route.sentRequestIds.add(request.requestId)
      onDeliveryState({
        requestId: request.requestId,
        state: 'sent',
        toProfileId: request.toProfileId
      })
    }

    return sent
  }

  async function closeSendRoute(route: ProfileFriendRequestSendRoute): Promise<void> {
    for (const peer of route.peers) {
      peer.destroy?.()
    }

    route.peers.clear()
    await route.swarm.destroy()
  }

  function addInboxPeer(socket: ProfileFriendRequestSocket): void {
    let buffer = ''
    socket.on('data', (chunk) => {
      buffer += b4a.toString(chunk)
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.trim()) continue
        handleInboxLine(line)
      }
    })
  }

  function handleInboxLine(line: string): void {
    try {
      const message: unknown = JSON.parse(line)
      if (!shouldAcceptIncomingRequest(message)) return

      incomingRequestIds.add(message.requestId)
      onRequest(message)
    } catch {
      // Ignore malformed profile request frames; later valid frames should still work.
    }
  }

  function shouldAcceptIncomingRequest(message: unknown): message is MessageRequest {
    return (
      verifyMessageRequest(message) &&
      message.toProfileId === cleanLocalProfileId &&
      message.fromProfileId !== cleanLocalProfileId &&
      !incomingRequestIds.has(message.requestId)
    )
  }

  async function flushDiscovery(discovery: ProfileFriendRequestDiscovery | null): Promise<void> {
    if (!discovery) return

    const flushed = Promise.resolve(discovery.flushed())
    if (awaitDiscoveryFlush) {
      await flushed
      return
    }

    flushed.catch(onDiscoveryError)
  }

  return {
    close,
    open,
    send
  }
}

export function formatProfileFriendRequestDeliveryState(
  state?: ProfileFriendRequestDeliveryState | string | null
): string {
  if (state === 'sent') return 'Request sent'
  if (state === 'delivered') return 'Request delivered'
  if (state === 'accepted') return 'Friend'
  if (state === 'failed') return 'Request failed'
  if (state === 'searching') return 'Request searching'
  return 'Request pending'
}

function cleanProfileId(value: unknown, message: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(message)
  }

  return value.trim()
}

function cleanHexProfileId(value: unknown, message: string): string {
  const profileId = cleanProfileId(value, message).toLowerCase()

  if (!/^[0-9a-f]{64}$/.test(profileId)) {
    throw new Error(message)
  }

  return profileId
}

type ProfileFriendRequestDeliveryUpdate = {
  requestId: string
  state: ProfileFriendRequestDeliveryState
  toProfileId: string
}

type ProfileFriendRequestDiscovery = {
  flushed(): unknown | Promise<unknown>
}

type ProfileFriendRequestSwarm = {
  destroy(): unknown | Promise<unknown>
  join(
    topic: Uint8Array,
    options: { client: boolean; server: boolean }
  ): ProfileFriendRequestDiscovery
  on(event: 'connection', handler: (socket: ProfileFriendRequestSocket) => void): unknown
}

type ProfileFriendRequestSocket = {
  destroyed?: boolean
  destroy?: () => unknown
  on(event: 'data', handler: (chunk: Uint8Array) => void): unknown
  on(event: 'close' | 'error', handler: () => void): unknown
  write(frame: string): unknown
}

type ProfileFriendRequestSendRoute = {
  discovery: ProfileFriendRequestDiscovery | null
  peers: Set<ProfileFriendRequestSocket>
  pendingRequests: Map<string, MessageRequest>
  sentRequestIds: Set<string>
  swarm: ProfileFriendRequestSwarm
  targetProfileId: string
}
