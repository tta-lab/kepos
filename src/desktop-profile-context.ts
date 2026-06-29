import { createDesktopFileStorage } from './desktop-file-storage.js'
import type {
  DesktopFileStorageFactory,
  DesktopProfileContext
} from './desktop-profile-context-core.ts'
export {
  createDesktopProfileContext,
  createDesktopProfileContextFromStorage
} from './desktop-profile-context-core.ts'
import { createDesktopProfileContextFromStorage } from './desktop-profile-context-core.ts'

type DesktopFileProfileContextOptions = {
  displayName?: string
  storageBasePath?: string
  storageOptions?: Record<string, unknown>
}

export function createDesktopFileProfileContext({
  displayName = 'Desktop',
  storageBasePath,
  storageOptions = {}
}: DesktopFileProfileContextOptions = {}): DesktopProfileContext {
  return createDesktopProfileContextFromStorage({
    createFileStorage: createDesktopFileStorage as DesktopFileStorageFactory,
    displayName,
    storageBasePath,
    storageOptions
  })
}
