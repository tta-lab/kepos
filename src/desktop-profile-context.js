import {
  getDesktopLocalProfile,
  loadDesktopContactBook,
  saveDesktopContactBook
} from './desktop-local-adapters.js'
import { createDesktopFileStorage } from './desktop-file-storage.js'

export function createDesktopProfileContext({
  displayName = 'Desktop',
  getProfile = getDesktopLocalProfile,
  loadContactBook = loadDesktopContactBook,
  saveContactBook = saveDesktopContactBook,
  storage = globalThis.localStorage
} = {}) {
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

export function createDesktopFileProfileContext({
  displayName = 'Desktop',
  storageBasePath,
  storageOptions = {}
} = {}) {
  return createDesktopProfileContext({
    displayName,
    storage: createDesktopFileStorage({
      basePath: storageBasePath,
      ...storageOptions
    })
  })
}
