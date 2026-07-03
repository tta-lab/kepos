import { appendLocalMessage, appendRemoteMessage } from './chat-session.ts'
import type { ChatMessage, ChatSession } from './chat-session.ts'
import { createHomeHello, verifyHomeHello } from './home-presence.ts'
import type { HomeHello } from './home-presence.ts'
import { createP2PRoom } from './p2p-room.ts'
import type { SigningIdentity } from './signed-record.ts'

export function createDesktopHomeRuntime({
  createDirectTransport = null,
  createHomeHello: createHello = createHomeHello,
  createRoom = createP2PRoom as unknown as HomeRoomFactory,
  onControl = () => {},
  onDebugState = () => {},
  onError = () => {},
  onPeerCount = () => {},
  onSessionChanged = () => {},
  onVerifiedHello = () => {},
  verifyHomeHello: verifyHello = verifyHomeHello as (hello: unknown) => boolean
}: DesktopHomeRuntimeOptions = {}): DesktopHomeRuntime {
  let homeJoinDetails: HomeJoinDetails | null = null
  let directEndpoint: unknown = null
  let room: HomeRoom | null = null
  let session: ChatSession | null = null

  async function join({
    homeJoinDetails: nextHomeJoinDetails
  }: {
    homeJoinDetails?: HomeJoinDetails | null
  }): Promise<void> {
    await leave()

    homeJoinDetails = nextHomeJoinDetails || null
    session = nextHomeJoinDetails?.session || null
    if (!homeJoinDetails || !session) return

    const currentHomeJoinDetails = homeJoinDetails
    room = createRoom({
      createDirectTransport: currentHomeJoinDetails.directTransport
        ? ({ addPeer, roomKey }) =>
            createDirectTransport?.({
              addPeer,
              ...currentHomeJoinDetails.directTransport,
              onEndpoint: (endpoint: unknown) => {
                directEndpoint = endpoint
                emitDebugState({ stage: 'direct-endpoint' })
              },
              roomKey
            })
        : undefined,
      onControl: (message, peer) => handleControl(message, peer),
      onDebugState: emitDebugState,
      onDiscoveryError: (error) => {
        onError(new Error(`Home discovery unavailable: ${error.message}`))
      },
      onMessage: (message) => {
        if (!session) return

        session = appendRemoteMessage(session, message)
        onSessionChanged(session)
      },
      onPeer: (peer) => {
        sendHomeHello(peer)
        requestHomeHello(peer)
      },
      onPeerCount
    })

    await room.join({ nick: session.nick, roomKey: session.roomKey })
  }

  async function leave(): Promise<void> {
    await room?.leave()
    room = null
    homeJoinDetails = null
    directEndpoint = null
    session = null
  }

  function emitDebugState(debug: Record<string, unknown>): void {
    onDebugState({
      ...debug,
      ...(directEndpoint ? { directEndpoint } : {})
    })
  }

  function configure(nextContext: HomeRuntimeContext | null | undefined): void {
    homeJoinDetails = nextContext?.homeJoinDetails || homeJoinDetails
    session = nextContext?.session || session
  }

  function sendMessage(message: Partial<ChatMessage>): ChatSession | null {
    const cleanText = message?.text?.trim()
    if (!room || !session || !cleanText) return null

    const cleanMessage = { ...message, text: cleanText }
    session = appendLocalMessage(session, cleanText, cleanMessage)
    room.send(cleanMessage)
    onSessionChanged(session)
    return session
  }

  function sendControl(peer: unknown, message: HomeControlMessage | null | undefined): boolean {
    if (!room || !peer || !message) return false

    room.sendControl(peer, message)
    return true
  }

  function broadcastControl(message: HomeControlMessage | null | undefined): boolean {
    if (!room || !message) return false

    room.broadcastControl(message)
    return true
  }

  function requestHomeHello(peer: unknown = null): boolean {
    const request: HomeHelloRequest = { type: 'kepos.home.hello.request.v1' }

    if (peer) return sendControl(peer, request)
    return broadcastControl(request)
  }

  function sendHomeHello(peer: unknown = null): boolean {
    if (!homeJoinDetails?.identity || !homeJoinDetails?.address) return false

    const hello = createHello({
      homeAddress: homeJoinDetails.address,
      identity: homeJoinDetails.identity
    })

    if (peer) return sendControl(peer, hello)
    return broadcastControl(hello)
  }

  function handleControl(message: HomeControlMessage, peer: unknown): void {
    if (message.type === 'kepos.home.hello.request.v1') {
      sendHomeHello(peer)
      return
    }

    if (message.type === 'kepos.home.hello.v1') {
      const hello = message as HomeHelloLike
      if (!verifyHello(hello) || hello.homeAddress !== homeJoinDetails?.address) return

      onVerifiedHello(hello, peer)
      return
    }

    onControl(message, peer)
  }

  function isJoined(): boolean {
    return Boolean(room)
  }

  function getSession(): ChatSession | null {
    return session
  }

  return {
    broadcastControl,
    configure,
    getSession,
    isJoined,
    join,
    leave,
    requestHomeHello,
    sendControl,
    sendHomeHello,
    sendMessage
  }
}

type DirectTransportFactory = (options: Record<string, unknown>) => unknown

type HomeRoom = {
  broadcastControl(message: HomeControlMessage): unknown
  join(options: { nick: string; roomKey: string }): unknown | Promise<unknown>
  leave(): unknown | Promise<unknown>
  send(message: Partial<ChatMessage>): unknown
  sendControl(peer: unknown, message: HomeControlMessage): unknown
}

type HomeRoomFactory = (options: {
  createDirectTransport?: ((options: { addPeer: unknown; roomKey: string }) => unknown) | undefined
  onControl(message: HomeControlMessage, peer: unknown): void
  onDebugState(debug: Record<string, unknown>): void
  onDiscoveryError(error: Error): void
  onMessage(message: ChatMessage): void
  onPeer(peer: unknown): void
  onPeerCount(peers: number): void
}) => HomeRoom

type DesktopHomeRuntimeOptions = {
  createDirectTransport?: DirectTransportFactory | null
  createHomeHello?: (options: { homeAddress: string; identity: SigningIdentity }) => HomeHello
  createRoom?: HomeRoomFactory
  onControl?: (message: HomeControlMessage, peer: unknown) => void
  onDebugState?: (debug: Record<string, unknown>) => void
  onError?: (error: Error) => void
  onPeerCount?: (peers: number) => void
  onSessionChanged?: (session: ChatSession) => void
  onVerifiedHello?: (hello: HomeHelloLike, peer: unknown) => void
  verifyHomeHello?: (hello: unknown) => boolean
}

type HomeJoinDetails = {
  address?: string
  directTransport?: Record<string, unknown> | null
  identity?: SigningIdentity
  session?: ChatSession | null
}

type HomeRuntimeContext = {
  homeJoinDetails?: HomeJoinDetails | null
  session?: ChatSession | null
}

type HomeHelloRequest = {
  type: 'kepos.home.hello.request.v1'
}

type HomeHelloLike = {
  homeAddress?: string
  type: 'kepos.home.hello.v1'
  [key: string]: unknown
}

type HomeControlMessage =
  | HomeHelloRequest
  | HomeHelloLike
  | (Record<string, unknown> & { type: string })

export type DesktopHomeRuntime = {
  broadcastControl(message: HomeControlMessage | null | undefined): boolean
  configure(nextContext?: HomeRuntimeContext | null): void
  getSession(): ChatSession | null
  isJoined(): boolean
  join(options: { homeJoinDetails?: HomeJoinDetails | null }): Promise<void>
  leave(): Promise<void>
  requestHomeHello(peer?: unknown): boolean
  sendControl(peer: unknown, message: HomeControlMessage | null | undefined): boolean
  sendHomeHello(peer?: unknown): boolean
  sendMessage(message: Partial<ChatMessage>): ChatSession | null
}
