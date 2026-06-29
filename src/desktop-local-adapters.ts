import { loadContactBookFromStorage, saveContactBookToStorage } from './contact-book-storage.ts'
import type { ContactBook } from './contact-book.ts'
import { createDmEncryptionKeyPair } from './dm-invite.ts'
import { getOrCreateLocalProfile } from './local-profile.ts'
import type { LocalProfile } from './profile.ts'

type DesktopLocalStorage = {
  getItem?: (key: string) => string | null
  setItem?: (key: string, value: string) => unknown
}

export function getDesktopLocalProfile({
  displayName = 'Desktop',
  storage = getDefaultStorage()
}: {
  displayName?: string
  storage?: DesktopLocalStorage | null
} = {}): LocalProfile {
  return getOrCreateLocalProfile({
    createDmEncryptionKeyPair,
    displayName,
    storage
  })
}

export function loadDesktopContactBook({
  ownerProfileId,
  storage = getDefaultStorage()
}: {
  ownerProfileId: string
  storage?: DesktopLocalStorage | null
}): ContactBook {
  return loadContactBookFromStorage({
    ownerProfileId,
    storage
  })
}

export function saveDesktopContactBook({
  book,
  storage = getDefaultStorage()
}: {
  book: ContactBook
  storage?: DesktopLocalStorage | null
}): void {
  return saveContactBookToStorage({
    book,
    storage
  })
}

function getDefaultStorage(): DesktopLocalStorage | null {
  return (globalThis as { localStorage?: DesktopLocalStorage }).localStorage || null
}
