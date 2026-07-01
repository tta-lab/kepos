import { createDesktopBackendActions } from './desktop-backend-actions.ts'
import { createDesktopControlActions } from './desktop-control-actions.ts'
import { getDesktopDirectTransportConfig } from './desktop-direct-transport-config.ts'
import { createDesktopLocalBackendHost } from './desktop-local-backend-host.ts'
import { createDesktopMessageActions } from './desktop-message-actions.ts'
import { createDesktopMessageRequestActions } from './desktop-message-request-actions.ts'
import { createDesktopRoomActions } from './desktop-room-actions.ts'
import { createDesktopTrustActions } from './desktop-trust-actions.ts'
import { createDirectRoomTransport } from './direct-room-transport.ts'
import {
  createSha256Hex,
  importDesktopProfileAvatarMedia,
  readDesktopAvatarBytes,
  writeDesktopAvatarBytes
} from './desktop-profile-avatar-media.ts'
import { storeAvatarMediaBytesControl } from './avatar-media-sync.ts'
import { setDesktopTreehole } from './desktop-state.ts'
import type { DesktopState } from './desktop-state.ts'

export function createDesktopBackendSession({
  controllerState,
  createDirectTransport = createDesktopDirectRoomTransport,
  createId,
  env = (globalThis as { process?: { env?: DesktopBackendSessionEnv } }).process?.env || {},
  createLocalBackendHost = createDesktopLocalBackendHost as unknown as DesktopLocalBackendHostFactory,
  getCurrentDisplayName,
  getProfileContext,
  onChanged,
  onError = console.error,
  setContextFormDraft = () => {},
  setDirectComposerRecipient = () => {},
  setProfileRequestTarget,
  setNotice = () => {},
  shortenProfileId,
  storageBasePath,
  updateState
}: DesktopBackendSessionOptions): DesktopBackendSession {
  let backendRuntime: DesktopBackendRuntime
  let dmRuntime: DesktopDmRuntime
  let homeRuntime: DesktopHomeRuntime
  let treeholeRuntime: DesktopTreeholeRuntime
  const allowHomeDmBodyFallback = env.KEPOS_ALLOW_HOME_DM_BODY_FALLBACK === '1'
  let profileRequestTarget: unknown = null
  const publishProfileRequestTarget = (target: unknown): void => {
    profileRequestTarget = target || null
    setProfileRequestTarget?.(profileRequestTarget)
  }

  const displayNameActions = {
    updateAvatarUri({ avatarUri }: { avatarUri?: string } = {}) {
      controllerState.setCurrentAvatarMedia?.(null)
      controllerState.setCurrentAvatarUri(avatarUri)
      onChanged()
    },
    async updateAvatarMedia({
      bytesBase64,
      mimeType
    }: {
      bytesBase64?: string
      mimeType?: string
    } = {}) {
      const avatar = await importDesktopProfileAvatarMedia({
        bytesBase64,
        mimeType,
        storageBasePath
      })
      controllerState.setCurrentAvatarMedia?.(avatar.avatarMedia)
      controllerState.setCurrentAvatarUri(avatar.avatarUri)
      setNotice?.('Profile image updated.')
      onChanged()
      return avatar
    },
    updateDisplayName({ displayName }: { displayName?: string } = {}) {
      controllerState.setCurrentDisplayName(displayName)
      onChanged()
    }
  }
  const messageActions = createDesktopMessageActions({
    allowHomeDmBodyFallback,
    createId,
    getContactBook: () => getProfileContext().contactBook,
    getDmRuntime: () => dmRuntime,
    getDmSession: () => controllerState.getDmSession(),
    getHomeRuntime: () => homeRuntime,
    getProfileRequestTarget: () => profileRequestTarget,
    getSession: () => controllerState.getSession(),
    getTreeholeCanPost: () => controllerState.getState().treeholeCanPost,
    getTreeholeRuntime: () => treeholeRuntime,
    onChanged,
    saveContactBook: (book: unknown) => getProfileContext().saveContactBook(book),
    setSession: (nextSession: unknown) => {
      controllerState.setSession(nextSession)
    },
    setNotice
  } as never)
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
    readLocalAvatarMediaBytes: (
      reference: Parameters<typeof readDesktopAvatarBytes>[0]['reference']
    ) => readDesktopAvatarBytes({ reference, storageBasePath }),
    setHomeJoinDetails: (nextDetails: unknown) => {
      controllerState.setHomeJoinDetails(nextDetails)
    },
    setNotice,
    storeAvatarMediaBytesControl: (payload: Parameters<typeof storeAvatarMediaBytesControl>[0]) =>
      storeAvatarMediaBytesControl({
        ...payload,
        baseUri: storageBasePath,
        sha256Hex: createSha256Hex,
        writeBytes: writeDesktopAvatarBytes
      }),
    shortenProfileId: (profileId = '') => shortenProfileId(profileId)
  } as never)
  const messageRequestActions = createDesktopMessageRequestActions({
    createId,
    getDmRuntime: () => dmRuntime,
    getDmSession: () => controllerState.getDmSession(),
    getHomeRuntime: () => homeRuntime,
    getProfileContext,
    onChanged,
    setNotice
  } as never)
  const roomActions = createDesktopRoomActions({
    closeAll: () => backendRuntime.closeAll(),
    configureTreeholeRuntime,
    getDirectTransportConfig: ({ mode }: { mode?: string } = {}) =>
      getDesktopDirectTransportConfig({ env, mode }),
    getCurrentDisplayName,
    getDmRuntime: () => dmRuntime,
    getHomeRuntime: () => homeRuntime,
    getProfileContext,
    getTreeholeRuntime: () => treeholeRuntime,
    onChanged,
    openTreehole,
    setContextFormDraft,
    setDmSession: (nextSession: unknown) => {
      controllerState.setDmSession(nextSession)
    },
    setHomeJoinDetails: (nextDetails: unknown) => {
      controllerState.setHomeJoinDetails(nextDetails)
    },
    setSession: (nextSession: unknown) => {
      controllerState.setSession(nextSession)
    },
    updateState
  } as never)
  const trustActions = createDesktopTrustActions({
    configureTreeholeRuntime,
    getDmRuntime: () => dmRuntime,
    getHomeJoinDetails: () => controllerState.getHomeJoinDetails(),
    getProfileContext,
    getSelectedRecipientProfileId: () => controllerState.getDirectComposerRecipientProfileId(),
    onChanged,
    setContextFormDraft,
    setDirectComposerRecipient,
    setProfileRequestTarget: publishProfileRequestTarget,
    setHomeJoinDetails: (nextDetails: unknown) => {
      controllerState.setHomeJoinDetails(nextDetails)
    },
    setNotice
  } as never)
  const backendActions = createDesktopBackendActions({
    displayNameActions: displayNameActions as DesktopBackendActionGroup,
    messageActions: messageActions as DesktopBackendActionGroup,
    messageRequestActions: messageRequestActions as DesktopBackendActionGroup,
    roomActions: roomActions as DesktopBackendActionGroup,
    trustActions: trustActions as DesktopBackendActionGroup
  })
  const backendHost = createLocalBackendHost({
    actions: backendActions,
    runtimeOptions: {
      onDmSessionChanged: (session: unknown) => {
        controllerState.setDmSession(session)
        onChanged()
      },
      onHomeDebugState: (transportDebug: DesktopTransportDebug | null) => {
        const localPeers = transportDebug?.localPeers
        controllerState.updateState((state) => ({
          ...state,
          peers:
            Number.isInteger(localPeers) && Number(localPeers) > 0
              ? Number(localPeers)
              : state.peers,
          transportDebug
        }))
        onChanged()
      },
      onHomeControl: (message: unknown, peer: unknown) =>
        controlActions.handleControl(message as Record<string, unknown>, peer).catch(onError),
      onTreeholeStateChanged: (snapshot: Parameters<typeof setDesktopTreehole>[1]) => {
        controllerState.updateState((state) => setDesktopTreehole(state, snapshot))
        onChanged()
      },
      onVerifiedHello: (message: { profileId?: string }, peer: unknown) => {
        controlActions.sendTreeholeBootstrap(peer, message.profileId)
        controlActions.sendProfileAvatarMedia(peer).catch(onError)
      },
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
    if (!backendRuntime) throw new Error('Desktop backend runtime is unavailable')
    backendRuntime.configure({
      homeJoinDetails: controllerState.getHomeJoinDetails(),
      session: controllerState.getSession()
    })
  }

  async function startDirectMessages() {
    const nick = getCurrentDisplayName()
    const { profile, storage } = getProfileContext(nick)

    if (!dmRuntime) throw new Error('Desktop DM runtime is unavailable')
    controllerState.setDmSession(await dmRuntime.start({ nick, profile, storage }))
    onChanged()
  }

  async function openTreehole(bootstrapKey: string | null = null) {
    configureTreeholeRuntime()
    if (!treeholeRuntime) throw new Error('Desktop treehole runtime is unavailable')
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

function createDesktopDirectRoomTransport(options: DirectRoomTransportOptions) {
  return createDirectRoomTransport({
    ...options,
    tcpApi: loadNodeTcpApi()
  })
}

function loadNodeTcpApi(): DirectRoomTransportOptions['tcpApi'] {
  const tcpApi = (
    globalThis as { process?: { getBuiltinModule?: (name: string) => unknown } }
  ).process?.getBuiltinModule?.('node:net')

  return (tcpApi as DirectRoomTransportOptions['tcpApi']) || null
}

type DesktopBackendActionGroup = Record<string, (payload?: unknown) => unknown | Promise<unknown>>

type DesktopBackendSessionOptions = {
  controllerState: DesktopControllerState
  createDirectTransport?: (options: DirectRoomTransportOptions) => unknown
  createId: () => string
  env?: DesktopBackendSessionEnv
  createLocalBackendHost?: DesktopLocalBackendHostFactory
  getCurrentDisplayName: () => string
  getProfileContext: (displayName?: string) => DesktopProfileContext
  onChanged: () => void
  onError?: (error: unknown) => void
  setContextFormDraft?: (draft: unknown) => void
  setDirectComposerRecipient?: (profileId: string) => void
  setProfileRequestTarget?: (target: unknown) => void
  setNotice?: (notice: string) => void
  shortenProfileId: (profileId: string) => string
  storageBasePath?: string | null
  updateState: (updater: (state: DesktopState) => DesktopState) => void
}

type DesktopLocalBackendHostFactory = (options: {
  actions: Record<string, unknown>
  runtimeOptions: Record<string, unknown>
}) => DesktopLocalBackendHostLike

type DesktopBackendSessionEnv = {
  KEPOS_ALLOW_HOME_DM_BODY_FALLBACK?: string
  KEPOS_DIRECT_ADVERTISED_HOST?: string
  KEPOS_DIRECT_LISTEN_HOST?: string
}

type DesktopBackendSession = {
  backendHost: DesktopLocalBackendHostLike
  backendRuntime: DesktopBackendRuntime
  configureTreeholeRuntime: () => void
  controlActions: Record<string, unknown>
  dmRuntime: DesktopDmRuntime
  homeRuntime: DesktopHomeRuntime
  openTreehole: (bootstrapKey?: string | null) => Promise<void>
  roomActions: Record<string, unknown>
  treeholeRuntime: DesktopTreeholeRuntime
}

type DesktopControllerState = {
  getDirectComposerRecipientProfileId: () => string
  getDmSession: () => unknown
  getHomeJoinDetails: () => unknown
  getSession: () => unknown
  getState: () => DesktopState
  setCurrentAvatarMedia?: (avatarMedia: unknown) => unknown
  setCurrentAvatarUri: (avatarUri?: string) => unknown
  setCurrentDisplayName: (displayName?: string) => unknown
  setDmSession: (session: unknown) => unknown
  setHomeJoinDetails: (details: unknown) => unknown
  setSession: (session: unknown) => unknown
  updateState: (updater: (state: DesktopState) => DesktopState) => unknown
}

type DesktopProfileContext = {
  contactBook: unknown
  profile: unknown
  saveContactBook: (book: unknown) => unknown
  storage?: unknown
}

type DesktopLocalBackendHostLike = {
  backendHost?: unknown
  bridge?: unknown
  dmRuntime: DesktopDmRuntime
  homeRuntime: DesktopHomeRuntime
  runtime: DesktopBackendRuntime
  treeholeRuntime: DesktopTreeholeRuntime
}

type DesktopBackendRuntime = {
  closeAll: () => unknown | Promise<unknown>
  configure: (context: unknown) => unknown
}

type DesktopDmRuntime = {
  start: (payload: {
    nick: string
    profile: unknown
    storage?: unknown
  }) => unknown | Promise<unknown>
}

type DesktopHomeRuntime = Record<string, unknown>

type DesktopTreeholeRuntime = {
  open: (payload: {
    bootstrapKey: string | null
    initialPosts: unknown[]
    initialStatus: string
  }) => unknown | Promise<unknown>
}

type DesktopTransportDebug = {
  localPeers?: unknown
  [key: string]: unknown
}

type DirectRoomTransportOptions = NonNullable<Parameters<typeof createDirectRoomTransport>[0]>
