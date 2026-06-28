import {
  getDesktopLocalProfile,
  loadDesktopContactBook,
  saveDesktopContactBook
} from './desktop-local-adapters.js'

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

export function createDesktopProfileContextFromStorage({
  createFileStorage,
  displayName = 'Desktop',
  storageBasePath,
  storageOptions = {}
} = {}) {
  return createDesktopProfileContext({
    displayName,
    storage: createFileStorage({
      basePath: storageBasePath,
      ...storageOptions
    })
  })
}
