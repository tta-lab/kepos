import { createTreeholePolicyFromContactBook } from './contact-book-storage.ts'
import { revokeContact } from './contact-book.ts'
import type { ContactBook } from './contact-book.ts'
import { revokeDmThread } from './dm-thread.ts'
import type { DmThread } from './dm-thread.ts'

type TreeholePolicy = ReturnType<typeof createTreeholePolicyFromContactBook>

export function applyLocalContactRevoke({
  book,
  profileId,
  revokedAt = Date.now(),
  threads = []
}: {
  book: ContactBook
  profileId: string
  revokedAt?: number
  threads?: DmThread[]
}): {
  book: ContactBook
  nextThreads: DmThread[]
  revokedAt: number
  revokedThreadIds: string[]
  treeholePolicy: TreeholePolicy
} {
  const nextBook = revokeContact(book, { profileId, revokedAt })
  const revokedThreadIds: string[] = []
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
