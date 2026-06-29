import type { DesktopState } from './desktop-state.ts'
import { createDesktopState } from './desktop-state.ts'

export function createDesktopControllerState({
  defaultDisplayName = 'Desktop',
  initialState = createDesktopState()
}: {
  defaultDisplayName?: string
  initialState?: DesktopState
} = {}) {
  let currentDisplayName = defaultDisplayName
  let directComposerRecipientProfileId = ''
  let dmSession: unknown = null
  let homeJoinDetails: unknown = null
  let session: unknown = null
  let state = initialState

  return {
    getCurrentDisplayName(): string {
      return currentDisplayName
    },
    getDirectComposerRecipientProfileId(): string {
      return directComposerRecipientProfileId
    },
    getDmSession(): unknown {
      return dmSession
    },
    getHomeJoinDetails(): unknown {
      return homeJoinDetails
    },
    getSession(): unknown {
      return session
    },
    getState(): DesktopState {
      return state
    },
    selectDirectContact(profileId = ''): boolean {
      if (!profileId) return false
      directComposerRecipientProfileId = profileId
      return true
    },
    setCurrentDisplayName(displayName = defaultDisplayName): string {
      currentDisplayName = displayName.trim() || defaultDisplayName
      return currentDisplayName
    },
    setDirectComposerRecipient(profileId = ''): string {
      directComposerRecipientProfileId = profileId.trim()
      return directComposerRecipientProfileId
    },
    setDmSession(nextSession: unknown): void {
      dmSession = nextSession
    },
    setHomeJoinDetails(nextDetails: unknown): void {
      homeJoinDetails = nextDetails
    },
    setSession(nextSession: unknown): void {
      session = nextSession
    },
    setState(nextState: DesktopState): void {
      state = nextState
    },
    updateState(updater: (state: DesktopState) => DesktopState): void {
      state = updater(state)
    }
  }
}
