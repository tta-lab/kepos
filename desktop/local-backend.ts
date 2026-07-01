import { createDesktopBackendSession } from '../src/desktop-backend-session.ts'

export function createLocalBackendSession(
  options: Parameters<typeof createDesktopBackendSession>[0]
) {
  return createDesktopBackendSession(options)
}
