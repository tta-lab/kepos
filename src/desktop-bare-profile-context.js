import { createDesktopBareFileStorage } from './desktop-bare-file-storage.js'
import { createDesktopProfileContextFromStorage } from './desktop-profile-context-core.ts'

export function createDesktopBareProfileContext(options = {}) {
  return createDesktopProfileContextFromStorage({
    ...options,
    createFileStorage: createDesktopBareFileStorage
  })
}
