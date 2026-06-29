import {
  getDesktopLocalProfile,
  loadDesktopContactBook,
  saveDesktopContactBook
} from './desktop-local-adapters.ts'
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
  displayName?: string
  getProfile?: DesktopProfileProvider
  loadContactBook?: DesktopContactBookLoader
  saveContactBook?: DesktopContactBookSaver
  storage?: DesktopProfileStorage | null
}

export function createDesktopProfileContext({
  displayName = 'Desktop',
  getProfile = getDesktopLocalProfile,
  loadContactBook = loadDesktopContactBook,
  saveContactBook = saveDesktopContactBook,
  storage = getDefaultStorage()
}: DesktopProfileContextOptions = {}): DesktopProfileContext {
  const profile = getProfile({ displayName, storage })
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
  createFileStorage,
  displayName = 'Desktop',
  storageBasePath,
  storageOptions = {}
}: {
  createFileStorage: DesktopFileStorageFactory
  displayName?: string
  storageBasePath?: string
  storageOptions?: Record<string, unknown>
}): DesktopProfileContext {
  return createDesktopProfileContext({
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
