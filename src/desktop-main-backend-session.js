import { createDesktopMainBackendSessionCore } from './desktop-main-backend-session-core.js'
import { createDesktopFileProfileContext } from './desktop-profile-context.js'

export function createDesktopMainBackendSession({
  createProfileContext = createDesktopFileProfileContext,
  ...options
} = {}) {
  return createDesktopMainBackendSessionCore({
    ...options,
    createProfileContext
  })
}
