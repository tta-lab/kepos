export {
  createContactBook,
  createTreeholePolicyFromContactBook,
  getContact,
  trustContact
} from './contact-book.ts'
import { createContactBook, deserializeContactBook, serializeContactBook } from './contact-book.ts'

const CONTACT_BOOK_KEY = 'kepos.contactBook.v1'
const CONTACT_BOOK_FILE = 'contact-book.json'

export function loadContactBookFromStorage({ ownerProfileId, storage }) {
  const stored = storage?.getItem?.(CONTACT_BOOK_KEY)

  if (!stored) {
    return createContactBook({ ownerProfileId })
  }

  return deserializeContactBook(stored)
}

export function saveContactBookToStorage({ book, storage }) {
  storage?.setItem?.(CONTACT_BOOK_KEY, JSON.stringify(serializeContactBook(book)))
}

export async function loadContactBookFromFileSystem({ baseUri, fileSystem, ownerProfileId }) {
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

export async function saveContactBookToFileSystem({ baseUri, book, fileSystem }) {
  const dir = contactBookDir(baseUri)

  await fileSystem.makeDirectoryAsync(dir, { intermediates: true })
  await fileSystem.writeAsStringAsync(
    `${dir}/${CONTACT_BOOK_FILE}`,
    JSON.stringify(serializeContactBook(book))
  )
}

function contactBookPath(baseUri) {
  return `${contactBookDir(baseUri)}/${CONTACT_BOOK_FILE}`
}

function contactBookDir(baseUri) {
  if (!baseUri) {
    throw new Error('App storage directory is unavailable')
  }

  return `${baseUri.replace(/\/+$/, '')}/kepos`
}

function isMissingFileError(error) {
  return error instanceof Error && /not found|no such file|enoent/i.test(error.message)
}
