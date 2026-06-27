import { ignoreMessageRequest } from './contact-book.ts'

export async function createDesktopMessageRequestAcceptance({
  acceptMessageRequest,
  acceptedAt,
  book,
  message,
  threadId
}) {
  const remoteProfileId = message?.fromProfileId
  if (!remoteProfileId) return null

  const result = await acceptMessageRequest({
    acceptedAt,
    book,
    remoteProfileId,
    threadId
  })

  if (!result) return null

  return {
    book: result.book,
    invite: result.invite
  }
}

export function createDesktopMessageRequestIgnore({
  book,
  hasDmSession = false,
  message = null,
  profileId = ''
}) {
  const requestProfileId = profileId || message?.fromProfileId || message?.profileId
  if (!requestProfileId) return null

  return {
    book: ignoreMessageRequest(book, { profileId: requestProfileId }),
    dismissedMessageId: hasDmSession && message?.id ? message.id : ''
  }
}
