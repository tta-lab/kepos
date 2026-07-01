export {
  createContactBook,
  createTreeholePolicyFromContactBook,
  getContact,
  recordOutgoingFriendRequest,
  trustContact
} from './contact-book.ts'
import { createContactBook, deserializeContactBook, serializeContactBook } from './contact-book.ts'
import type { ContactBook } from './contact-book.ts'

const CONTACT_BOOK_KEY = 'kepos.contactBook.v1'
const CONTACT_BOOK_FILE = 'contact-book.json'

type SyncStorage = {
  getItem?: (key: string) => string | null | undefined
  setItem?: (key: string, value: string) => unknown
}

type AsyncFileSystem = {
  makeDirectoryAsync(path: string, options: { intermediates: boolean }): Promise<unknown> | unknown
  readAsStringAsync(path: string): Promise<string> | string
  writeAsStringAsync(path: string, value: string): Promise<unknown> | unknown
}

export function loadContactBookFromStorage({
  ownerProfileId,
  storage
}: {
  ownerProfileId: string
  storage?: SyncStorage | null
}): ContactBook {
  const stored = storage?.getItem?.(CONTACT_BOOK_KEY)

  if (!stored) {
    return createContactBook({ ownerProfileId })
  }

  return deserializeContactBook(stored)
}

export function saveContactBookToStorage({
  book,
  storage
}: {
  book: ContactBook
  storage?: SyncStorage | null
}): void {
  storage?.setItem?.(CONTACT_BOOK_KEY, JSON.stringify(serializeContactBook(book)))
}

export async function loadContactBookFromFileSystem({
  baseUri,
  fileSystem,
  ownerProfileId
}: {
  baseUri: string
  fileSystem: AsyncFileSystem
  ownerProfileId: string
}): Promise<ContactBook> {
  const path = contactBookPath(baseUri)

  try {
    return deserializeContactBook(await fileSystem.readAsStringAsync(path))
  } catch (error) {
    if (isMissingFileError(error)) {
      return createContactBook({ ownerProfileId })
    }

    throw new Error('Corrupt contact book storage', { cause: error })
  }
}

export async function saveContactBookToFileSystem({
  baseUri,
  book,
  fileSystem
}: {
  baseUri: string
  book: ContactBook
  fileSystem: AsyncFileSystem
}): Promise<void> {
  const dir = contactBookDir(baseUri)

  await fileSystem.makeDirectoryAsync(dir, { intermediates: true })
  await fileSystem.writeAsStringAsync(
    `${dir}/${CONTACT_BOOK_FILE}`,
    JSON.stringify(serializeContactBook(book))
  )
}

function contactBookPath(baseUri: string): string {
  return `${contactBookDir(baseUri)}/${CONTACT_BOOK_FILE}`
}

function contactBookDir(baseUri: string): string {
  if (!baseUri) {
    throw new Error('App storage directory is unavailable')
  }

  return `${baseUri.replace(/\/+$/, '')}/kepos`
}

function isMissingFileError(error: unknown): boolean {
  return error instanceof Error && /not found|no such file|enoent/i.test(error.message)
}
