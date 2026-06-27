import { applyMessageRequestToContactBook } from './message-request.ts'

export async function createDesktopControlMessageResult({
  acceptInviteAsRecipient,
  acceptedAt = Date.now(),
  contactBook,
  currentDmSession,
  fallbackAlias = '',
  message,
  peer,
  recipientEncryptionKeyPair
}) {
  if (message?.type === 'treehole.bootstrap') {
    return {
      bootstrapKey: message.key,
      kind: 'treehole_bootstrap',
      ownerProfileId: message.ownerProfileId || '',
      sendWriterPeer: peer || null
    }
  }

  if (message?.type === 'treehole.writer') {
    return {
      kind: 'treehole_writer',
      writer: message
    }
  }

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

export function createDesktopTreeholeControlSendResult({
  createBootstrapControl,
  createWriterControl,
  isHomeJoined,
  peer,
  remoteProfileId = '',
  type
}) {
  if (!isHomeJoined || !peer) return null

  const payload =
    type === 'bootstrap'
      ? createBootstrapControl?.(remoteProfileId)
      : type === 'writer'
        ? createWriterControl?.()
        : null

  if (!payload) return null

  return {
    payload,
    peer
  }
}
