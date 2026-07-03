import { createDesktopBareFileStorage } from './desktop-bare-file-storage.ts'
import { createDesktopProfileContextFromStorage } from './desktop-profile-context-core.ts'
import type { DesktopProfileContext } from './desktop-profile-context-core.ts'

type DesktopBareProfileContextOptions = Omit<
  Parameters<typeof createDesktopProfileContextFromStorage>[0],
  'createFileStorage'
>

export function createDesktopBareProfileContext(
  options: DesktopBareProfileContextOptions = {}
): DesktopProfileContext {
  return createDesktopProfileContextFromStorage({
    ...options,
    createFileStorage: createDesktopBareFileStorage
  })
}
