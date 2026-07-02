import Hyperswarm from 'hyperswarm'
import b4a from 'b4a'
import crypto from 'hypercore-crypto'
import type { DmInvite } from './dm-invite.ts'
import { verifyDmInvite } from './dm-invite.ts'
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
    request: ProfileFriendRequestFrame
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

export type ProfileFriendRequestFrame = MessageRequest | DmInvite

type ProfileFriendRequestAck = {
  fromProfileId: string
  requestId: string
  toProfileId: string
  type: 'kepos.profile.request.ack.v1'
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
  onInvite = () => {},
  onRequest = () => {}
}: {
  awaitDiscoveryFlush?: boolean
  createSwarm?: () => ProfileFriendRequestSwarm
  localProfileId: string
  onDeliveryState?: (delivery: ProfileFriendRequestDeliveryUpdate) => void
  onDiscoveryError?: (error: Error) => void
  onInvite?: (invite: DmInvite) => void
  onRequest?: (request: MessageRequest) => void
}): ProfileFriendRequestRuntime {
  const cleanLocalProfileId = cleanHexProfileId(localProfileId, 'Local profile id is required')
  const incomingFrameIds = new Set<string>()
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

  async function send(
    frame: ProfileFriendRequestFrame
  ): Promise<ProfileFriendRequestDeliveryResult> {
    const validatedFrame = readValidOutgoingFrame(frame)
    if (!validatedFrame) {
      return { reason: 'Invalid signed profile request frame.', state: 'failed' }
    }

    if (validatedFrame.fromProfileId === validatedFrame.toProfileId) {
      return {
        reason: 'Cannot send a profile request frame to the local profile.',
        state: 'failed'
      }
    }

    cleanHexProfileId(validatedFrame.toProfileId, 'Target profile id is required')
    const route = getOrCreateSendRoute(validatedFrame.toProfileId)
    const state = sendOnRoute(route, validatedFrame) ? 'sent' : 'searching'

    if (state === 'searching') {
      onDeliveryState({
        requestId: frameDeliveryId(validatedFrame),
        state,
        toProfileId: validatedFrame.toProfileId
      })
    }

    await flushDiscovery(route.discovery)

    return {
      state: route.sentFrameIds.has(frameDeliveryId(validatedFrame)) ? 'sent' : state
    }
  }

  async function close(): Promise<void> {
    await closeInbox()
    await Promise.all([...sendRoutes.values()].map((route) => closeSendRoute(route)))
    sendRoutes.clear()
    incomingFrameIds.clear()
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
      deliveredFrameIds: new Set(),
      peers: new Set(),
      pendingFrames: new Map(),
      sentFrameIds: new Set(),
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
    let buffer = ''
    route.peers.add(socket)
    socket.on('close', () => route.peers.delete(socket))
    socket.on('error', () => route.peers.delete(socket))
    socket.on('data', (chunk) => {
      buffer += b4a.toString(chunk)
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.trim()) continue
        handleSendRouteLine(route, line)
      }
    })

    for (const frame of route.pendingFrames.values()) {
      sendOnRoute(route, frame)
    }
  }

  function sendOnRoute(
    route: ProfileFriendRequestSendRoute,
    frame: ProfileFriendRequestFrame
  ): boolean {
    const deliveryId = frameDeliveryId(frame)
    route.pendingFrames.set(deliveryId, frame)
    let sent = false

    for (const peer of route.peers) {
      if (peer.destroyed) continue

      peer.write(`${JSON.stringify(frame)}\n`)
      sent = true
    }

    if (sent && !route.sentFrameIds.has(deliveryId)) {
      route.sentFrameIds.add(deliveryId)
      onDeliveryState({
        requestId: deliveryId,
        state: 'sent',
        toProfileId: frame.toProfileId
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
        handleInboxLine(socket, line)
      }
    })
  }

  function handleInboxLine(socket: ProfileFriendRequestSocket, line: string): void {
    try {
      const message: unknown = JSON.parse(line)
      const frame = readValidIncomingFrame(message)
      if (!frame) return

      incomingFrameIds.add(frameDeliveryId(frame))
      socket.write(`${JSON.stringify(createProfileFriendRequestAck(frame))}\n`)
      if (frame.type === 'kepos.message.request.v1') {
        onRequest(frame)
        return
      }

      onInvite(frame)
    } catch {
      // Ignore malformed profile request frames; later valid frames should still work.
    }
  }

  function handleSendRouteLine(route: ProfileFriendRequestSendRoute, line: string): void {
    try {
      const message: unknown = JSON.parse(line)
      const ack = readValidAck(message, route)
      if (!ack || route.deliveredFrameIds.has(ack.requestId)) return

      route.deliveredFrameIds.add(ack.requestId)
      onDeliveryState({
        requestId: ack.requestId,
        state: 'delivered',
        toProfileId: ack.fromProfileId
      })
    } catch {
      // Ignore malformed profile request acknowledgement frames.
    }
  }

  function readValidIncomingFrame(message: unknown): ProfileFriendRequestFrame | null {
    const frame = readValidOutgoingFrame(message)
    if (!frame) return null
    if (frame.toProfileId !== cleanLocalProfileId) return null
    if (frame.fromProfileId === cleanLocalProfileId) return null
    if (incomingFrameIds.has(frameDeliveryId(frame))) return null

    return frame
  }

  function readValidAck(
    message: unknown,
    route: ProfileFriendRequestSendRoute
  ): ProfileFriendRequestAck | null {
    if (!isRecord(message)) return null
    if (message.type !== 'kepos.profile.request.ack.v1') return null
    if (message.fromProfileId !== route.targetProfileId) return null
    if (message.toProfileId !== cleanLocalProfileId) return null
    if (typeof message.requestId !== 'string' || !message.requestId.trim()) return null
    const requestId = message.requestId.trim()
    if (!route.sentFrameIds.has(requestId)) return null

    return {
      fromProfileId: message.fromProfileId,
      requestId,
      toProfileId: message.toProfileId,
      type: 'kepos.profile.request.ack.v1'
    }
  }

  function readValidOutgoingFrame(message: unknown): ProfileFriendRequestFrame | null {
    if (verifyMessageRequest(message)) return message
    if (verifyDmInvite(message)) return message
    return null
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

function frameDeliveryId(frame: ProfileFriendRequestFrame): string {
  if (frame.type === 'kepos.dm.invite.v1') {
    return frame.requestId || frame.inviteId
  }

  return frame.requestId
}

function createProfileFriendRequestAck(frame: ProfileFriendRequestFrame): ProfileFriendRequestAck {
  return {
    fromProfileId: frame.toProfileId,
    requestId: frameDeliveryId(frame),
    toProfileId: frame.fromProfileId,
    type: 'kepos.profile.request.ack.v1'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

export function formatProfileFriendRequestDeliveryState(
  state?: ProfileFriendRequestDeliveryState | string | null
): string {
  if (state === 'sent') return 'Request sent'
  if (state === 'delivered') return 'Request delivered'
  if (state === 'accepted') return 'Request accepted'
  if (state === 'failed') return 'Request failed'
  if (state === 'searching') return 'Looking for profile'
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
  deliveredFrameIds: Set<string>
  discovery: ProfileFriendRequestDiscovery | null
  peers: Set<ProfileFriendRequestSocket>
  pendingFrames: Map<string, ProfileFriendRequestFrame>
  sentFrameIds: Set<string>
  swarm: ProfileFriendRequestSwarm
  targetProfileId: string
}
