import { appendLocalMessage, appendRemoteMessage } from './chat-session.ts'
import { createHomeHello, verifyHomeHello } from './home-presence.ts'
import { createP2PRoom } from './p2p-room.js'

export function createDesktopHomeRuntime({
  createDirectTransport = null,
  createHomeHello: createHello = createHomeHello,
  createRoom = createP2PRoom,
  onControl = () => {},
  onDebugState = () => {},
  onError = () => {},
  onPeerCount = () => {},
  onSessionChanged = () => {},
  onVerifiedHello = () => {},
  verifyHomeHello: verifyHello = verifyHomeHello
} = {}) {
  let homeJoinDetails = null
  let directEndpoint = null
  let room = null
  let session = null

  async function join({ homeJoinDetails: nextHomeJoinDetails }) {
    await leave()

    homeJoinDetails = nextHomeJoinDetails
    session = nextHomeJoinDetails?.session || null
    if (!homeJoinDetails || !session) return

    room = createRoom({
      createDirectTransport: homeJoinDetails.directTransport
        ? ({ addPeer, roomKey }) =>
            createDirectTransport?.({
              addPeer,
              ...homeJoinDetails.directTransport,
              onEndpoint: (endpoint) => {
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

  async function leave() {
    await room?.leave()
    room = null
    homeJoinDetails = null
    directEndpoint = null
    session = null
  }

  function emitDebugState(debug) {
    onDebugState({
      ...debug,
      ...(directEndpoint ? { directEndpoint } : {})
    })
  }

  function configure(nextContext) {
    homeJoinDetails = nextContext?.homeJoinDetails || homeJoinDetails
    session = nextContext?.session || session
  }

  function sendMessage(message) {
    const cleanText = message?.text?.trim()
    if (!room || !session || !cleanText) return null

    const cleanMessage = { ...message, text: cleanText }
    session = appendLocalMessage(session, cleanText, cleanMessage)
    room.send(cleanMessage)
    onSessionChanged(session)
    return session
  }

  function sendControl(peer, message) {
    if (!room || !peer || !message) return false

    room.sendControl(peer, message)
    return true
  }

  function broadcastControl(message) {
    if (!room || !message) return false

    room.broadcastControl(message)
    return true
  }

  function requestHomeHello(peer = null) {
    const request = { type: 'kepos.home.hello.request.v1' }

    if (peer) return sendControl(peer, request)
    return broadcastControl(request)
  }

  function sendHomeHello(peer = null) {
    if (!homeJoinDetails?.identity || !homeJoinDetails?.address) return false

    const hello = createHello({
      homeAddress: homeJoinDetails.address,
      identity: homeJoinDetails.identity
    })

    if (peer) return sendControl(peer, hello)
    return broadcastControl(hello)
  }

  function handleControl(message, peer) {
    if (message.type === 'kepos.home.hello.request.v1') {
      sendHomeHello(peer)
      return
    }

    if (message.type === 'kepos.home.hello.v1') {
      if (!verifyHello(message) || message.homeAddress !== homeJoinDetails?.address) return

      onVerifiedHello(message, peer)
      return
    }

    onControl(message, peer)
  }

  function isJoined() {
    return Boolean(room)
  }

  function getSession() {
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
