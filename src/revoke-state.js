import { createTreeholePolicyFromContactBook } from './contact-book-storage.js'
import { revokeContact } from './contact-book.ts'
import { revokeDmThread } from './dm-thread.ts'

export function applyLocalContactRevoke({ book, profileId, revokedAt = Date.now(), threads = [] }) {
  const nextBook = revokeContact(book, { profileId, revokedAt })
  const revokedThreadIds = []
  const nextThreads = threads.map((thread) => {
    if (thread.remoteProfileId !== profileId) {
      return thread
    }

    revokedThreadIds.push(thread.threadId)
    return revokeDmThread(thread, { revokedAt })
  })

  return {
    book: nextBook,
    nextThreads,
    revokedAt,
    revokedThreadIds,
    treeholePolicy: createTreeholePolicyFromContactBook(nextBook)
  }
}
