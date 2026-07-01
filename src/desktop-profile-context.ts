import { createDesktopFileStorage } from './desktop-file-storage.ts'
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
  avatarMedia?: DesktopProfileContext['profile']['avatarMedia'] | null
  avatarUri?: string | null
  displayName?: string
  storageBasePath?: string
  storageOptions?: Record<string, unknown>
}

export function createDesktopFileProfileContext({
  avatarMedia = null,
  avatarUri = null,
  displayName = 'Desktop',
  storageBasePath,
  storageOptions = {}
}: DesktopFileProfileContextOptions = {}): DesktopProfileContext {
  return createDesktopProfileContextFromStorage({
    avatarMedia,
    avatarUri,
    createFileStorage: createDesktopFileStorage as DesktopFileStorageFactory,
    displayName,
    storageBasePath,
    storageOptions
  })
}
