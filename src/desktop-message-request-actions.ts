import {
  createDesktopMessageRequestAcceptance,
  createDesktopMessageRequestIgnore
} from './desktop-message-request-service.ts'
import type { ContactBook } from './contact-book.ts'
import type { DesktopProfileContext } from './desktop-profile-context-core.ts'
import {
  createQueuedProfileFriendRequestTransport,
  type ProfileFriendRequestFrame,
  type ProfileFriendRequestTransport
} from './profile-friend-request-transport.ts'
import { formatProfileFriendAcceptanceDeliveryNotice } from './profile-friend-request-delivery.ts'

type MessageRequestMessage = {
  fromProfileId?: string
  id?: string
  profileId?: string
}

type MessageRequestAcceptanceResult = {
  book: ContactBook
  invite: unknown
}

type DmRuntime = {
  acceptMessageRequest(
    payload: unknown
  ): MessageRequestAcceptanceResult | null | Promise<MessageRequestAcceptanceResult | null>
  dismissMessage(payload: { id: string }): unknown
}

type MessageRequestAcceptance = typeof createDesktopMessageRequestAcceptance
type MessageRequestIgnore = typeof createDesktopMessageRequestIgnore

export type DesktopMessageRequestActions = {
  acceptMessageRequest(message?: MessageRequestMessage | null): Promise<void>
  ignoreMessageRequest(payload?: {
    message?: MessageRequestMessage | null
    profileId?: string
  }): void
}

export function createDesktopMessageRequestActions({
  acceptMessageRequest = createDesktopMessageRequestAcceptance,
  createId,
  getDmRuntime,
  getDmSession,
  getFriendRequestTransport = () => createQueuedProfileFriendRequestTransport(),
  getProfileContext,
  ignoreMessageRequest = createDesktopMessageRequestIgnore,
  now = () => Date.now(),
  onChanged = () => {},
  setNotice
}: {
  acceptMessageRequest?: MessageRequestAcceptance
  createId: () => string
  getDmRuntime: () => DmRuntime
  getDmSession: () => unknown
  getFriendRequestTransport?: () => ProfileFriendRequestTransport | null
  getProfileContext: () => Pick<DesktopProfileContext, 'contactBook' | 'saveContactBook'>
  ignoreMessageRequest?: MessageRequestIgnore
  now?: () => number
  onChanged?: () => void
  setNotice: (notice: string) => void
}): DesktopMessageRequestActions {
  async function acceptIncomingMessageRequest(
    message?: MessageRequestMessage | null
  ): Promise<void> {
    const dmSession = getDmSession()
    if (!dmSession) return

    const context = getProfileContext()
    const result = await acceptMessageRequest({
      acceptMessageRequest: (payload) => getDmRuntime().acceptMessageRequest(payload),
      acceptedAt: now(),
      book: context.contactBook,
      message,
      threadId: createId()
    })

    if (!result) return

    context.saveContactBook(result.book)
    const delivery = await getFriendRequestTransport()?.send(
      result.invite as ProfileFriendRequestFrame
    )
    setNotice(formatProfileFriendAcceptanceDeliveryNotice(delivery?.state))
    onChanged()
  }

  function ignoreIncomingMessageRequest({
    message = null,
    profileId = ''
  }: {
    message?: MessageRequestMessage | null
    profileId?: string
  } = {}): void {
    const context = getProfileContext()
    const result = ignoreMessageRequest({
      book: context.contactBook as ContactBook,
      hasDmSession: Boolean(getDmSession()),
      message,
      profileId
    })
    if (!result) return

    context.saveContactBook(result.book)

    if (result.dismissedMessageId) {
      getDmRuntime().dismissMessage({ id: result.dismissedMessageId })
    }

    setNotice('Friend request ignored.')
    onChanged()
  }

  return {
    acceptMessageRequest: acceptIncomingMessageRequest,
    ignoreMessageRequest: ignoreIncomingMessageRequest
  }
}
