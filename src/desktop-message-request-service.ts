import { ignoreMessageRequest } from './contact-book.ts'
import type { ContactBook } from './contact-book.ts'

type DesktopMessageRequestMessage = {
  fromProfileId?: string
  id?: string
  profileId?: string
}

type DesktopMessageRequestAcceptanceResult = {
  book: ContactBook
  invite: unknown
}

export async function createDesktopMessageRequestAcceptance({
  acceptMessageRequest,
  acceptedAt,
  book,
  message,
  threadId
}: {
  acceptMessageRequest: (payload: {
    acceptedAt?: number
    book: ContactBook
    remoteProfileId: string
    threadId: string
  }) =>
    | DesktopMessageRequestAcceptanceResult
    | null
    | Promise<DesktopMessageRequestAcceptanceResult | null>
  acceptedAt?: number
  book: ContactBook
  message?: DesktopMessageRequestMessage | null
  threadId: string
}): Promise<DesktopMessageRequestAcceptanceResult | null> {
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
}: {
  book: ContactBook
  hasDmSession?: boolean
  message?: DesktopMessageRequestMessage | null
  profileId?: string
}): {
  book: ContactBook
  dismissedMessageId: string
} | null {
  const requestProfileId = profileId || message?.fromProfileId || message?.profileId
  if (!requestProfileId) return null

  return {
    book: ignoreMessageRequest(book, { profileId: requestProfileId }),
    dismissedMessageId: hasDmSession && message?.id ? message.id : ''
  }
}
