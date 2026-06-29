import { createDesktopMainBackendSessionCore } from './desktop-main-backend-session-core.ts'
import { createDesktopFileProfileContext } from './desktop-profile-context.ts'

export function createDesktopMainBackendSession({
  createProfileContext = createDesktopFileProfileContext,
  ...options
}: Parameters<typeof createDesktopMainBackendSessionCore>[0] = {}) {
  return createDesktopMainBackendSessionCore({
    ...options,
    createProfileContext
  })
}
