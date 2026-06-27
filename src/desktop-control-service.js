import { applyMessageRequestToContactBook } from './message-request.ts'

export async function createDesktopControlMessageResult({
  acceptInviteAsRecipient,
  acceptedAt = Date.now(),
  contactBook,
  currentDmSession,
  fallbackAlias = '',
  message,
  recipientEncryptionKeyPair
}) {
  if (!currentDmSession) return null

  if (message?.type === 'kepos.message.request.v1') {
    if (message.toProfileId !== currentDmSession.localProfileId) return null

    return {
      appendIncomingRequest: message,
      book: applyMessageRequestToContactBook(contactBook, {
        alias: fallbackAlias,
        request: message,
        source: 'home_room'
      }),
      kind: 'message_request'
    }
  }

  if (message?.type === 'kepos.dm.invite.v1') {
    if (message.toProfileId !== currentDmSession.localProfileId) return null

    await acceptInviteAsRecipient({
      acceptedAt,
      contactBook,
      invite: message,
      recipientEncryptionKeyPair
    })

    return {
      kind: 'dm_invite'
    }
  }

  return null
}
