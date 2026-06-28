import { createDesktopFileStorage } from './desktop-file-storage.js'
export {
  createDesktopProfileContext,
  createDesktopProfileContextFromStorage
} from './desktop-profile-context-core.js'
import { createDesktopProfileContextFromStorage } from './desktop-profile-context-core.js'

export function createDesktopFileProfileContext({
  displayName = 'Desktop',
  storageBasePath,
  storageOptions = {}
} = {}) {
  return createDesktopProfileContextFromStorage({
    createFileStorage: createDesktopFileStorage,
    displayName,
    storageBasePath,
    storageOptions
  })
}
