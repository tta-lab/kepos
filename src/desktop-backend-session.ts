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
  createProfileHomeDescriptorFrame,
  createProfileFriendRequestRuntime,
  type ProfileHomeDescriptorFrame,
  type ProfileFriendRequestRuntime
} from './profile-friend-request-transport.ts'
import type { ProfileFriendRequestDeliveryState } from './profile-friend-request-delivery.ts'
import { updateOutgoingFriendRequestDeliveryState, type ContactBook } from './contact-book.ts'
import { createTreeholePolicyFromContactBook } from './contact-book-storage.ts'
import type { MessageRequest } from './message-request.ts'
import type { DmInvite } from './dm-invite.ts'
import type { LocalProfile } from './profile.ts'
import { createSignedHomeAddressPayload } from './signed-qr-payload.ts'
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
  createProfileRequestRuntime = createProfileFriendRequestRuntime as ProfileRequestRuntimeFactory,
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
  let profileRequestRuntime: ProfileFriendRequestRuntime | null = null
  let treeholeRuntime: DesktopTreeholeRuntime
  const allowDebugHomeDmBodyFallback = env.KEPOS_ALLOW_DEBUG_HOME_DM_BODY_FALLBACK === '1'
  const allowDebugHomeTrustFallback = env.KEPOS_ALLOW_DEBUG_HOME_TRUST_FALLBACK === '1'
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
    allowDebugHomeDmBodyFallback,
    createId,
    getContactBook: () => getProfileContext().contactBook,
    getDmRuntime: () => dmRuntime,
    getDmSession: () => controllerState.getDmSession(),
    getFriendRequestTransport: () => profileRequestRuntime,
    getHomeRuntime: () => homeRuntime,
    getLocalProfile: () => {
      const context = getProfileContext() as {
        profile: {
          id: string
          identity: {
            publicKey: string
            secretKey: string
          }
        }
      }

      return {
        identity: context.profile.identity,
        profileId: context.profile.id
      }
    },
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
    allowDebugHomeDmBodyFallback,
    allowDebugHomeTrustFallback,
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
    getFriendRequestTransport: () => profileRequestRuntime,
    getProfileContext,
    onChanged,
    setNotice
  } as never)
  const roomActions = createDesktopRoomActions({
    closeHome: () => closeHomeRuntimes(),
    configureTreeholeRuntime,
    getDirectTransportConfig: ({ mode }: { mode?: string } = {}) =>
      getDesktopDirectTransportConfig({ env, mode }),
    getCurrentDisplayName,
    getHomeRuntime: () => homeRuntime,
    getProfileContext,
    getTreeholeRuntime: () => treeholeRuntime,
    onChanged,
    openTreehole,
    setContextFormDraft,
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
    const { contactBook, profile } = getProfileContext()
    const homeJoinDetails = controllerState.getHomeJoinDetails()
    const session = controllerState.getSession()
    const profileTreeholeSession =
      profile?.id && profile.homeRoom?.roomKey
        ? {
            nick: getCurrentDisplayName(),
            profileId: profile.id,
            roomKey: profile.homeRoom.roomKey
          }
        : null
    const profileTreeholeJoinDetails =
      profile?.id && profile.identity
        ? {
            identity: profile.identity,
            ownerProfileId: profile.id,
            treeholePolicy: createTreeholePolicyFromContactBook(contactBook)
          }
        : null

    backendRuntime.configure({
      homeJoinDetails,
      session,
      treeholeHomeJoinDetails: homeJoinDetails || profileTreeholeJoinDetails,
      treeholeSession: session || profileTreeholeSession
    })
  }

  async function startDirectMessages() {
    const nick = getCurrentDisplayName()
    const { profile, storage } = getProfileContext(nick)

    if (!dmRuntime) throw new Error('Desktop DM runtime is unavailable')
    controllerState.setDmSession(await dmRuntime.start({ nick, profile, storage }))
    await startProfileRequestRuntime(profile)
    configureTreeholeRuntime()
    await openTreehole(null, 'profile')
    onChanged()
  }

  async function startProfileRequestRuntime(profile: { id?: string }): Promise<void> {
    if (!profile.id) return

    await profileRequestRuntime?.close()
    profileRequestRuntime = createProfileRequestRuntime({
      localProfileId: profile.id,
      onDeliveryState: ({ requestId, state, toProfileId }) => {
        const context = getProfileContext()
        const nextBook = updateOutgoingFriendRequestDeliveryState(context.contactBook, {
          deliveryState: state,
          profileId: toProfileId,
          requestId
        })
        if (nextBook === context.contactBook) return

        context.saveContactBook(nextBook)
        onChanged()
      },
      onDiscoveryError: onError,
      onInvite: (invite) => {
        controlActions
          .handleControl(invite as Record<string, unknown>, undefined, { source: 'profile' })
          .then(() => sendLocalHomeDescriptor(invite.fromProfileId))
          .catch(onError)
      },
      onHomeDescriptor: (frame) => {
        controlActions
          .handleControl(frame as Record<string, unknown>, undefined, { source: 'profile' })
          .catch(onError)
      },
      onRequest: (request) => {
        controlActions
          .handleControl(request as Record<string, unknown>, undefined, { source: 'profile' })
          .catch(onError)
      }
    })
    await profileRequestRuntime.open()
  }

  async function sendLocalHomeDescriptor(toProfileId = ''): Promise<void> {
    const { profile } = getProfileContext()
    const homeRoom = profile?.homeRoom
    if (!profileRequestRuntime || !profile?.identity || !homeRoom?.roomKey || !toProfileId) {
      return
    }

    try {
      const descriptor = createSignedHomeAddressPayload({
        address: homeRoom.address || homeRoom.roomKey,
        identity: profile.identity,
        policy: homeRoom.policy || 'trusted_only',
        roomKey: homeRoom.roomKey
      })
      await profileRequestRuntime.send(
        createProfileHomeDescriptorFrame({
          descriptor,
          toProfileId
        })
      )
    } catch {
      // Home entry metadata should not block accepting a DM invite.
    }
  }

  async function closeHomeRuntimes(): Promise<unknown[]> {
    return await (backendRuntime.closeHome?.() ?? Promise.all([backendRuntime.closeAll()]))
  }

  async function openTreehole(
    bootstrapKey: string | null = null,
    scope: 'profile' | 'home' = bootstrapKey ? 'home' : 'profile'
  ) {
    configureTreeholeRuntime()
    if (!treeholeRuntime) throw new Error('Desktop treehole runtime is unavailable')
    await treeholeRuntime.open({
      bootstrapKey,
      initialPosts: controllerState.getState().treeholePosts,
      initialStatus: controllerState.getState().treeholeStatus,
      scope
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
  createProfileRequestRuntime?: ProfileRequestRuntimeFactory
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
  KEPOS_ALLOW_DEBUG_HOME_DM_BODY_FALLBACK?: string
  KEPOS_ALLOW_DEBUG_HOME_TRUST_FALLBACK?: string
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
  openTreehole: (bootstrapKey?: string | null, scope?: 'profile' | 'home') => Promise<void>
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
  contactBook: ContactBook
  profile: LocalProfile
  saveContactBook: (book: unknown) => unknown
  storage?: unknown
}

type ProfileRequestRuntimeFactory = (options: {
  localProfileId: string
  onDeliveryState?: (delivery: {
    requestId: string
    state: ProfileFriendRequestDeliveryState
    toProfileId: string
  }) => void
  onDiscoveryError?: (error: Error) => void
  onHomeDescriptor?: (frame: ProfileHomeDescriptorFrame) => void
  onInvite?: (invite: DmInvite) => void
  onRequest?: (request: MessageRequest) => void
}) => ProfileFriendRequestRuntime

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
  closeHome?: () => unknown[] | Promise<unknown[]>
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
    scope?: 'profile' | 'home'
  }) => unknown | Promise<unknown>
}

type DesktopTransportDebug = {
  localPeers?: unknown
  [key: string]: unknown
}

type DirectRoomTransportOptions = NonNullable<Parameters<typeof createDirectRoomTransport>[0]>
