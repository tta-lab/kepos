import { createDesktopHomeJoinDetails } from './desktop-home-join-service.ts'
import { applyDesktopHomeQr } from './desktop-qr-service.ts'
import { createDesktopState, setDesktopRoom, setDesktopTreehole } from './desktop-state.ts'
import { readTrustedContactHomeDescriptor } from './signed-qr-scan.ts'
import type { DesktopState } from './desktop-state.ts'
import type { DesktopProfileContext } from './desktop-profile-context-core.ts'

type DesktopHomeAddress = Record<string, unknown> & {
  address: string
  book?: DesktopProfileContext['contactBook']
  ownerProfileId: string
  roomKey: string
}

type DesktopHomeJoinDetails = {
  homeJoinDetails: Record<string, unknown> & {
    directTransport?: Record<string, unknown>
    ownerProfileId?: string | null
    profileId?: string | null
    roomKey?: string
  }
  mode?: string
  session: unknown
}

type DirectTransportConfig = Record<string, unknown> & {
  mode?: string
}

type DmRuntime = {
  start(payload: {
    nick: string
    profile: DesktopProfileContext['profile']
    storage: DesktopProfileContext['storage']
  }): unknown | Promise<unknown>
}

type HomeRuntime = {
  join(payload: {
    homeJoinDetails: DesktopHomeJoinDetails['homeJoinDetails']
  }): unknown | Promise<unknown>
  requestHomeHello(): unknown
}

type TreeholeRuntime = {
  canPost(): boolean
}

type RoomActionPayload = {
  createTreehole?: boolean
  displayName?: string
  homeAddress?: DesktopHomeAddress | null
  mode?: string
  roomKey?: string
  uri?: string
  profileId?: string
}

export type DesktopRoomActions = {
  enterContactHome(payload?: RoomActionPayload): Promise<void>
  joinHome(payload?: RoomActionPayload): Promise<void>
  joinHomeUri(payload?: RoomActionPayload): Promise<void>
  leaveHome(): Promise<void>
}

export function createDesktopRoomActions({
  applyHomeQr = applyDesktopHomeQr,
  closeAll,
  configureTreeholeRuntime,
  createHomeJoinDetails = createDesktopHomeJoinDetails,
  createInitialState = createDesktopState,
  getCurrentDisplayName,
  getDmRuntime,
  getDirectTransportConfig = () => null,
  getHomeRuntime,
  getProfileContext,
  getTreeholeRuntime,
  onChanged = () => {},
  openTreehole,
  setContextFormDraft = () => {},
  setDmSession,
  setHomeJoinDetails,
  setSession,
  updateState
}: {
  applyHomeQr?: (options: {
    book: DesktopProfileContext['contactBook']
    localProfileId: string
    uri: string
  }) => DesktopHomeAddress
  closeAll: () => unknown | Promise<unknown>
  configureTreeholeRuntime: () => void
  createHomeJoinDetails?: (options: {
    contactBook: DesktopProfileContext['contactBook']
    homeAddress?: DesktopHomeAddress | null
    mode?: string
    nick: string
    profile: DesktopProfileContext['profile']
    roomKey?: string
  }) => DesktopHomeJoinDetails
  createInitialState?: () => DesktopState
  getCurrentDisplayName: () => string
  getDmRuntime: () => DmRuntime
  getDirectTransportConfig?: (options: { mode?: string }) => DirectTransportConfig | null
  getHomeRuntime: () => HomeRuntime
  getProfileContext: (displayName?: string) => DesktopProfileContext
  getTreeholeRuntime: () => TreeholeRuntime
  onChanged?: () => void
  openTreehole: (bootstrapKey?: unknown) => unknown | Promise<unknown>
  setContextFormDraft?: (draft: Record<string, unknown>) => void
  setDmSession: (session: unknown) => void
  setHomeJoinDetails: (details: DesktopHomeJoinDetails['homeJoinDetails'] | null) => void
  setSession: (session: unknown) => void
  updateState: (updater: (state: DesktopState) => DesktopState) => void
}): DesktopRoomActions {
  async function leaveHome(): Promise<void> {
    await closeAll()
    setSession(null)
    setDmSession(null)
    setHomeJoinDetails(null)
    configureTreeholeRuntime()
    updateState(() => createInitialState())
    onChanged()
  }

  async function joinHome({
    createTreehole,
    displayName,
    homeAddress = null,
    mode,
    roomKey
  }: RoomActionPayload = {}): Promise<void> {
    await leaveHome()

    const nick = displayName?.trim() || getCurrentDisplayName()
    const { contactBook, profile, storage } = getProfileContext(nick)
    const homeJoin = createHomeJoinDetails({
      contactBook,
      homeAddress,
      mode,
      nick,
      profile,
      roomKey
    })
    const directTransport = getDirectTransportConfig({ mode })
    if (directTransport) {
      homeJoin.homeJoinDetails = {
        ...homeJoin.homeJoinDetails,
        directTransport: {
          ...directTransport,
          mode: directTransport.mode || mode
        }
      }
    }

    setContextFormDraft({ roomKey: homeJoin.homeJoinDetails.roomKey })
    setHomeJoinDetails(homeJoin.homeJoinDetails)
    setSession(homeJoin.session)
    configureTreeholeRuntime()
    setDmSession(await getDmRuntime().start({ nick, profile, storage }))
    updateState((state) => {
      const roomState = setDesktopRoom(state, {
        mode: homeJoin.mode,
        nick,
        ownerProfileId:
          homeJoin.homeJoinDetails.ownerProfileId || (createTreehole ? profile.id : ''),
        peers: 0,
        roomKey: homeJoin.homeJoinDetails.roomKey
      })

      return { ...roomState, notice: 'Joining home...' }
    })
    onChanged()

    await getHomeRuntime().join({ homeJoinDetails: homeJoin.homeJoinDetails })

    if (createTreehole) {
      await openTreehole()
      getHomeRuntime().requestHomeHello()
    } else {
      updateState((state) =>
        setDesktopTreehole(state, {
          canPost: getTreeholeRuntime().canPost(),
          posts: [],
          status: 'waiting-for-bootstrap'
        })
      )
    }

    updateState((state) => ({ ...state, notice: 'Home joined.' }))
    onChanged()
  }

  async function joinHomeUri({
    displayName = 'Desktop',
    uri
  }: RoomActionPayload = {}): Promise<void> {
    if (!uri) return

    const { contactBook, profile, saveContactBook } = getProfileContext(displayName)
    const homeAddress = applyHomeQr({
      book: contactBook,
      localProfileId: profile.id,
      uri
    })
    if (homeAddress.book && homeAddress.book !== contactBook) {
      saveContactBook(homeAddress.book)
    }

    setContextFormDraft({ homeQrUri: '' })
    await joinHome({
      createTreehole: false,
      homeAddress,
      mode: 'peer'
    })
  }

  async function enterContactHome({
    displayName,
    profileId
  }: RoomActionPayload = {}): Promise<void> {
    if (!profileId) return

    const { contactBook } = getProfileContext(displayName)
    const homeDescriptor = readTrustedContactHomeDescriptor({ book: contactBook, profileId })

    await joinHome({
      createTreehole: false,
      displayName,
      homeAddress: {
        address: homeDescriptor.address,
        ownerProfileId: homeDescriptor.ownerProfileId,
        policy: homeDescriptor.policy,
        roomKey: homeDescriptor.roomKey
      },
      mode: 'peer'
    })
  }

  return {
    enterContactHome,
    joinHome,
    joinHomeUri,
    leaveHome
  }
}
