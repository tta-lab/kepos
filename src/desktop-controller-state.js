import { createDesktopState } from './desktop-state.js'

export function createDesktopControllerState({
  defaultDisplayName = 'Desktop',
  initialState = createDesktopState()
} = {}) {
  let currentDisplayName = defaultDisplayName
  let directComposerRecipientProfileId = ''
  let dmSession = null
  let homeJoinDetails = null
  let session = null
  let state = initialState

  return {
    getCurrentDisplayName() {
      return currentDisplayName
    },
    getDirectComposerRecipientProfileId() {
      return directComposerRecipientProfileId
    },
    getDmSession() {
      return dmSession
    },
    getHomeJoinDetails() {
      return homeJoinDetails
    },
    getSession() {
      return session
    },
    getState() {
      return state
    },
    selectDirectContact(profileId = '') {
      if (!profileId) return false
      directComposerRecipientProfileId = profileId
      return true
    },
    setCurrentDisplayName(displayName = defaultDisplayName) {
      currentDisplayName = displayName.trim() || defaultDisplayName
      return currentDisplayName
    },
    setDirectComposerRecipient(profileId = '') {
      directComposerRecipientProfileId = profileId.trim()
      return directComposerRecipientProfileId
    },
    setDmSession(nextSession) {
      dmSession = nextSession
    },
    setHomeJoinDetails(nextDetails) {
      homeJoinDetails = nextDetails
    },
    setSession(nextSession) {
      session = nextSession
    },
    setState(nextState) {
      state = nextState
    },
    updateState(updater) {
      state = updater(state)
    }
  }
}
