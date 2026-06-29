import {
  createDesktopMessageRequestAcceptance,
  createDesktopMessageRequestIgnore
} from './desktop-message-request-service.ts'

export function createDesktopMessageRequestActions({
  acceptMessageRequest = createDesktopMessageRequestAcceptance,
  createId,
  getDmRuntime,
  getDmSession,
  getHomeRuntime,
  getProfileContext,
  ignoreMessageRequest = createDesktopMessageRequestIgnore,
  now = () => Date.now(),
  onChanged = () => {},
  setNotice
}) {
  async function acceptIncomingMessageRequest(message) {
    const homeRuntime = getHomeRuntime()
    const dmSession = getDmSession()
    if (!homeRuntime.isJoined() || !dmSession) return

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
    homeRuntime.broadcastControl(result.invite)
    setNotice('Message request accepted.')
    onChanged()
  }

  function ignoreIncomingMessageRequest({ message = null, profileId = '' } = {}) {
    const context = getProfileContext()
    const result = ignoreMessageRequest({
      book: context.contactBook,
      hasDmSession: Boolean(getDmSession()),
      message,
      profileId
    })
    if (!result) return

    context.saveContactBook(result.book)

    if (result.dismissedMessageId) {
      getDmRuntime().dismissMessage({ id: result.dismissedMessageId })
    }

    setNotice('Message request ignored.')
    onChanged()
  }

  return {
    acceptMessageRequest: acceptIncomingMessageRequest,
    ignoreMessageRequest: ignoreIncomingMessageRequest
  }
}
