import { applyMessageRequestToContactBook } from './message-request.ts'
import type { ContactBook } from './contact-book.ts'
import type { MessageRequest } from './message-request.ts'
import type { DmEncryptionKeyPair } from './profile.ts'

type ControlMessage = Record<string, unknown> & {
  key?: string
  ownerProfileId?: string
  toProfileId?: string
  type?: string
}

type DmSession = {
  localProfileId: string
}

type AcceptInviteAsRecipient = (payload: {
  acceptedAt: number
  contactBook: ContactBook
  invite: ControlMessage
  recipientEncryptionKeyPair?: DmEncryptionKeyPair | null
}) => unknown | Promise<unknown>

export type DesktopControlMessageResult =
  | {
      appendIncomingRequest: MessageRequest
      book: ContactBook
      kind: 'message_request'
    }
  | {
      kind: 'dm_invite'
    }
  | {
      bootstrapKey: unknown
      kind: 'treehole_bootstrap'
      ownerProfileId: string
      sendWriterPeer: unknown
    }
  | {
      kind: 'treehole_writer'
      writer: ControlMessage
    }
  | null

export async function createDesktopControlMessageResult({
  acceptInviteAsRecipient,
  acceptedAt = Date.now(),
  contactBook,
  currentDmSession,
  fallbackAlias = '',
  message,
  peer,
  recipientEncryptionKeyPair
}: {
  acceptInviteAsRecipient?: AcceptInviteAsRecipient
  acceptedAt?: number
  contactBook?: ContactBook
  currentDmSession?: DmSession | null
  fallbackAlias?: string
  message?: ControlMessage | null
  peer?: unknown
  recipientEncryptionKeyPair?: DmEncryptionKeyPair | null
}): Promise<DesktopControlMessageResult> {
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
    if (!contactBook) return null

    return {
      appendIncomingRequest: message as MessageRequest,
      book: applyMessageRequestToContactBook(contactBook, {
        alias: fallbackAlias,
        request: message as MessageRequest,
        source: 'home_room'
      }),
      kind: 'message_request'
    }
  }

  if (message?.type === 'kepos.dm.invite.v1') {
    if (message.toProfileId !== currentDmSession.localProfileId) return null
    if (!acceptInviteAsRecipient || !contactBook) return null

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
}: {
  createBootstrapControl?: (remoteProfileId: string) => unknown
  createWriterControl?: () => unknown
  isHomeJoined?: boolean
  peer?: unknown
  remoteProfileId?: string
  type?: string
}): {
  payload: unknown
  peer: unknown
} | null {
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
