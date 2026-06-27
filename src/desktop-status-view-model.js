import {
  createDesktopState,
  getDesktopHomeStatus,
  getDesktopTreeholeStatus
} from './desktop-state.js'

export function createDesktopStatusViewModel({
  session = null,
  shortenProfileId = (value) => value,
  state = createDesktopState()
} = {}) {
  const inRoom = state?.view === 'room'

  return {
    errorDetailLabel: state?.lastError || 'none',
    homeStatusLabel: getDesktopHomeStatus(state),
    noticeLabel: state?.notice || '',
    peerLabel: String(state?.peers || 0),
    profileIdLabel: session?.profileId ? shortenProfileId(session.profileId) : 'not ready',
    roomKeyLabel: inRoom ? shortenProfileId(state.roomKey) : 'not joined',
    treeholeStatusLabel: getDesktopTreeholeStatus(state)
  }
}
