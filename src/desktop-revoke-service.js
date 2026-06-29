import { applyLocalContactRevoke } from './revoke-state.ts'

export function createDesktopContactRevoke({
  book,
  profileId,
  revokedAt,
  selectedRecipientProfileId = '',
  threads = []
}) {
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
