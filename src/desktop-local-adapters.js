import { loadContactBookFromStorage, saveContactBookToStorage } from './contact-book-storage.js'
import { createDmEncryptionKeyPair } from './dm-invite.ts'
import { getOrCreateLocalProfile } from './local-profile.js'

export function getDesktopLocalProfile({
  displayName = 'Desktop',
  storage = globalThis.localStorage
} = {}) {
  return getOrCreateLocalProfile({
    createDmEncryptionKeyPair,
    displayName,
    storage
  })
}

export function loadDesktopContactBook({ ownerProfileId, storage = globalThis.localStorage }) {
  return loadContactBookFromStorage({
    ownerProfileId,
    storage
  })
}

export function saveDesktopContactBook({ book, storage = globalThis.localStorage }) {
  return saveContactBookToStorage({
    book,
    storage
  })
}
