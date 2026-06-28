import { createDesktopHomeJoinDetails } from './desktop-home-join-service.js'
import { applyDesktopHomeQr } from './desktop-qr-service.js'
import { createDesktopState, setDesktopRoom, setDesktopTreehole } from './desktop-state.js'

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
}) {
  async function leaveHome() {
    await closeAll()
    setSession(null)
    setDmSession(null)
    setHomeJoinDetails(null)
    configureTreeholeRuntime()
    updateState(() => createInitialState())
    onChanged()
  }

  async function joinHome({ createTreehole, displayName, homeAddress = null, mode, roomKey } = {}) {
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

  async function joinHomeUri({ displayName = 'Desktop', uri } = {}) {
    if (!uri) return

    const { contactBook, profile } = getProfileContext(displayName)
    const homeAddress = applyHomeQr({
      book: contactBook,
      localProfileId: profile.id,
      uri
    })

    setContextFormDraft({ homeQrUri: '' })
    await joinHome({
      createTreehole: false,
      homeAddress,
      mode: 'peer'
    })
  }

  return {
    joinHome,
    joinHomeUri,
    leaveHome
  }
}
