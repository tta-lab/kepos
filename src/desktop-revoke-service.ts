import { applyLocalContactRevoke } from './revoke-state.ts'
import type { ContactBook } from './contact-book.ts'
import type { DmThread } from './dm-thread.ts'

type DesktopContactRevokeResult = ReturnType<typeof applyLocalContactRevoke> & {
  shouldClearRecipient: boolean
}

export function createDesktopContactRevoke({
  book,
  profileId,
  revokedAt,
  selectedRecipientProfileId = '',
  threads = []
}: {
  book: ContactBook
  profileId: string
  revokedAt?: number
  selectedRecipientProfileId?: string
  threads?: DmThread[]
}): DesktopContactRevokeResult {
  const result = applyLocalContactRevoke({
    book,
    profileId,
    revokedAt,
    threads
  })

  return {
    ...result,
    shouldClearRecipient: selectedRecipientProfileId === profileId
  }
}
