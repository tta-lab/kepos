import {
  getDesktopLocalProfile,
  loadDesktopContactBook,
  saveDesktopContactBook
} from './desktop-local-adapters.ts'
import type { AvatarMediaReference } from './avatar-media.ts'
import type { ContactBook } from './contact-book.ts'
import type { LocalProfile } from './profile.ts'

export type DesktopProfileStorage = {
  getItem?: (key: string) => string | null
  removeItem?: (key: string) => unknown
  setItem?: (key: string, value: string) => unknown
}

export type DesktopProfileContext = {
  contactBook: ContactBook
  profile: LocalProfile
  saveContactBook(book: ContactBook): void
  storage: DesktopProfileStorage | null
}

type DesktopProfileProvider = (options: {
  avatarMedia?: AvatarMediaReference | null
  avatarUri?: string | null
  displayName?: string
  storage?: DesktopProfileStorage | null
}) => LocalProfile

type DesktopContactBookLoader = (options: {
  ownerProfileId: string
  storage?: DesktopProfileStorage | null
}) => ContactBook

type DesktopContactBookSaver = (options: {
  book: ContactBook
  storage?: DesktopProfileStorage | null
}) => void

export type DesktopFileStorageFactory = (
  options: { basePath?: string } & Record<string, unknown>
) => DesktopProfileStorage

type DesktopProfileContextOptions = {
  avatarMedia?: AvatarMediaReference | null
  avatarUri?: string | null
  displayName?: string
  getProfile?: DesktopProfileProvider
  loadContactBook?: DesktopContactBookLoader
  saveContactBook?: DesktopContactBookSaver
  storage?: DesktopProfileStorage | null
}

export function createDesktopProfileContext({
  avatarMedia = null,
  avatarUri = null,
  displayName = 'Desktop',
  getProfile = getDesktopLocalProfile,
  loadContactBook = loadDesktopContactBook,
  saveContactBook = saveDesktopContactBook,
  storage = getDefaultStorage()
}: DesktopProfileContextOptions = {}): DesktopProfileContext {
  const profile = getProfile({ avatarMedia, avatarUri, displayName, storage })
  const contactBook = loadContactBook({
    ownerProfileId: profile.id,
    storage
  })

  return {
    contactBook,
    profile,
    saveContactBook(book) {
      return saveContactBook({ book, storage })
    },
    storage
  }
}

export function createDesktopProfileContextFromStorage({
  avatarMedia = null,
  avatarUri = null,
  createFileStorage,
  displayName = 'Desktop',
  storageBasePath,
  storageOptions = {}
}: {
  avatarMedia?: AvatarMediaReference | null
  avatarUri?: string | null
  createFileStorage: DesktopFileStorageFactory
  displayName?: string
  storageBasePath?: string
  storageOptions?: Record<string, unknown>
}): DesktopProfileContext {
  return createDesktopProfileContext({
    avatarMedia,
    avatarUri,
    displayName,
    storage: createFileStorage({
      basePath: storageBasePath,
      ...storageOptions
    })
  })
}

function getDefaultStorage(): DesktopProfileStorage | null {
  return (globalThis as { localStorage?: DesktopProfileStorage }).localStorage || null
}
