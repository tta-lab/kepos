import { createDesktopBackendActions } from './desktop-backend-actions.js'
import { createDesktopControlActions } from './desktop-control-actions.js'
import { getDesktopDirectTransportConfig } from './desktop-direct-transport-config.js'
import { createDesktopLocalBackendHost } from './desktop-local-backend-host.js'
import { createDesktopMessageActions } from './desktop-message-actions.js'
import { createDesktopMessageRequestActions } from './desktop-message-request-actions.js'
import { createDesktopRoomActions } from './desktop-room-actions.js'
import { createDesktopTrustActions } from './desktop-trust-actions.js'
import { createDirectRoomTransport } from './direct-room-transport.js'
import { setDesktopTreehole } from './desktop-state.ts'

export function createDesktopBackendSession({
  controllerState,
  createDirectTransport = createDesktopDirectRoomTransport,
  createId,
  env = globalThis.process?.env || {},
  createLocalBackendHost = createDesktopLocalBackendHost,
  getCurrentDisplayName,
  getProfileContext,
  onChanged,
  onError = console.error,
  setContextFormDraft,
  setDirectComposerRecipient,
  setNotice,
  shortenProfileId,
  storageBasePath,
  updateState
}) {
  let backendRuntime = null
  let dmRuntime = null
  let homeRuntime = null
  let treeholeRuntime = null
  const allowHomeDmBodyFallback = env.KEPOS_ALLOW_HOME_DM_BODY_FALLBACK === '1'

  const displayNameActions = {
    updateDisplayName({ displayName } = {}) {
      controllerState.setCurrentDisplayName(displayName)
      onChanged()
    }
  }
  const messageActions = createDesktopMessageActions({
    allowHomeDmBodyFallback,
    createId,
    getDmRuntime: () => dmRuntime,
    getDmSession: () => controllerState.getDmSession(),
    getHomeRuntime: () => homeRuntime,
    getSession: () => controllerState.getSession(),
    getTreeholeCanPost: () => controllerState.getState().treeholeCanPost,
    getTreeholeRuntime: () => treeholeRuntime,
    onChanged,
    setSession: (nextSession) => {
      controllerState.setSession(nextSession)
    }
  })
  const controlActions = createDesktopControlActions({
    allowHomeDmBodyFallback,
    configureTreeholeRuntime,
    getDmRuntime: () => dmRuntime,
    getHomeJoinDetails: () => controllerState.getHomeJoinDetails(),
    getHomeRuntime: () => homeRuntime,
    getProfileContext,
    getTreeholeRuntime: () => treeholeRuntime,
    onChanged,
    openTreehole,
    setHomeJoinDetails: (nextDetails) => {
      controllerState.setHomeJoinDetails(nextDetails)
    },
    setNotice,
    shortenProfileId
  })
  const messageRequestActions = createDesktopMessageRequestActions({
    createId,
    getDmRuntime: () => dmRuntime,
    getDmSession: () => controllerState.getDmSession(),
    getHomeRuntime: () => homeRuntime,
    getProfileContext,
    onChanged,
    setNotice
  })
  const roomActions = createDesktopRoomActions({
    closeAll: () => backendRuntime.closeAll(),
    configureTreeholeRuntime,
    getDirectTransportConfig: ({ mode }) => getDesktopDirectTransportConfig({ env, mode }),
    getCurrentDisplayName,
    getDmRuntime: () => dmRuntime,
    getHomeRuntime: () => homeRuntime,
    getProfileContext,
    getTreeholeRuntime: () => treeholeRuntime,
    onChanged,
    openTreehole,
    setContextFormDraft,
    setDmSession: (nextSession) => {
      controllerState.setDmSession(nextSession)
    },
    setHomeJoinDetails: (nextDetails) => {
      controllerState.setHomeJoinDetails(nextDetails)
    },
    setSession: (nextSession) => {
      controllerState.setSession(nextSession)
    },
    updateState
  })
  const trustActions = createDesktopTrustActions({
    configureTreeholeRuntime,
    getDmRuntime: () => dmRuntime,
    getHomeJoinDetails: () => controllerState.getHomeJoinDetails(),
    getProfileContext,
    getSelectedRecipientProfileId: () => controllerState.getDirectComposerRecipientProfileId(),
    onChanged,
    setContextFormDraft,
    setDirectComposerRecipient,
    setHomeJoinDetails: (nextDetails) => {
      controllerState.setHomeJoinDetails(nextDetails)
    },
    setNotice
  })
  const backendActions = createDesktopBackendActions({
    displayNameActions,
    messageActions,
    messageRequestActions,
    roomActions,
    trustActions
  })
  const backendHost = createLocalBackendHost({
    actions: backendActions,
    runtimeOptions: {
      onDmSessionChanged: (session) => {
        controllerState.setDmSession(session)
        onChanged()
      },
      onHomeDebugState: (transportDebug) => {
        controllerState.updateState((state) => ({
          ...state,
          peers:
            Number.isInteger(transportDebug?.localPeers) && transportDebug.localPeers > 0
              ? transportDebug.localPeers
              : state.peers,
          transportDebug
        }))
        onChanged()
      },
      onHomeControl: (message, peer) => controlActions.handleControl(message, peer).catch(onError),
      onTreeholeStateChanged: (snapshot) => {
        controllerState.updateState((state) => setDesktopTreehole(state, snapshot))
        onChanged()
      },
      onVerifiedHello: (message, peer) =>
        controlActions.sendTreeholeBootstrap(peer, message.profileId),
      createDirectTransport,
      storageBasePath
    }
  })

  backendRuntime = backendHost.runtime
  dmRuntime = backendHost.dmRuntime
  homeRuntime = backendHost.homeRuntime
  treeholeRuntime = backendHost.treeholeRuntime

  void startDirectMessages().catch(onError)

  function configureTreeholeRuntime() {
    backendRuntime.configure({
      homeJoinDetails: controllerState.getHomeJoinDetails(),
      session: controllerState.getSession()
    })
  }

  async function startDirectMessages() {
    const nick = getCurrentDisplayName()
    const { profile, storage } = getProfileContext(nick)

    controllerState.setDmSession(await dmRuntime.start({ nick, profile, storage }))
    onChanged()
  }

  async function openTreehole(bootstrapKey = null) {
    configureTreeholeRuntime()
    await treeholeRuntime.open({
      bootstrapKey,
      initialPosts: controllerState.getState().treeholePosts,
      initialStatus: controllerState.getState().treeholeStatus
    })
  }

  return {
    backendHost,
    backendRuntime,
    configureTreeholeRuntime,
    controlActions,
    dmRuntime,
    homeRuntime,
    openTreehole,
    roomActions,
    treeholeRuntime
  }
}

function createDesktopDirectRoomTransport(options) {
  return createDirectRoomTransport({
    ...options,
    tcpApi: loadNodeTcpApi()
  })
}

function loadNodeTcpApi() {
  return globalThis.process?.getBuiltinModule?.('node:net') || null
}
