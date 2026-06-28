import { createDesktopBareFileStorage } from './desktop-bare-file-storage.js'
import { createDesktopProfileContextFromStorage } from './desktop-profile-context-core.js'

export function createDesktopBareProfileContext(options = {}) {
  return createDesktopProfileContextFromStorage({
    ...options,
    createFileStorage: createDesktopBareFileStorage
  })
}
