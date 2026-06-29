import { openDmInvite } from './dm-invite.ts'
import type { DmEncryptionKeyPair, DmInvite } from './dm-invite.ts'
import { acceptDmThread, createDmThread } from './dm-thread.ts'
import type { DmThread } from './dm-thread.ts'
import { canAcceptDmInviteFromContactBook, isContactRevoked } from './contact-book.ts'
import type { ContactBook } from './contact-book.ts'

export function acceptDmInviteAsRecipient({
  acceptedAt = Date.now(),
  canAcceptInvite,
  contactBook,
  invite,
  localProfileId,
  recipientEncryptionKeyPair
}: {
  acceptedAt?: number
  canAcceptInvite?: (invite: DmInvite) => boolean
  contactBook?: ContactBook | null
  invite: DmInvite
  localProfileId: string
  recipientEncryptionKeyPair: DmEncryptionKeyPair
}): DmThread {
  if (!localProfileId || invite?.toProfileId !== localProfileId) {
    throw new Error('DM invite is not addressed to this profile')
  }

  if (contactBook && isContactRevoked(contactBook, invite.fromProfileId)) {
    throw new Error('DM invite is not authorized')
  }

  const isContactBookAuthorized =
    contactBook && canAcceptDmInviteFromContactBook(contactBook, invite)
  const isExplicitlyAuthorized = canAcceptInvite && canAcceptInvite(invite)

  if (!isContactBookAuthorized && !isExplicitlyAuthorized) {
    throw new Error('DM invite is not authorized')
  }

  const payload = openDmInvite({ invite, now: acceptedAt, recipientEncryptionKeyPair })
  const channelDiscoveryKey = requireString(
    payload.channelDiscoveryKey,
    'Channel discovery key is required'
  )
  const channelPublicKey = requireString(payload.channelPublicKey, 'Channel public key is required')
  const threadId = requireString(payload.threadId, 'Thread id is required')

  if (
    channelDiscoveryKey !== invite.channelDiscoveryKey ||
    channelPublicKey !== invite.channelPublicKey
  ) {
    throw new Error('DM invite payload mismatch')
  }

  return acceptDmThread(
    createDmThread({
      channelDiscoveryKey,
      channelPublicKey,
      createdAt: invite.createdAt,
      localProfileId,
      remoteProfileId: invite.fromProfileId,
      requestId: invite.requestId,
      threadId
    }),
    { acceptedAt }
  )
}

function requireString(value: unknown, message: string): string {
  const cleaned = typeof value === 'string' ? value.trim() : ''

  if (!cleaned) {
    throw new Error(message)
  }

  return cleaned
}
