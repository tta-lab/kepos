import { openDmInvite } from './dm-invite.ts'
import { acceptDmThread, createDmThread } from './dm-thread.ts'
import { canAcceptDmInviteFromContactBook } from './contact-book.ts'

export function acceptDmInviteAsRecipient({
  acceptedAt = Date.now(),
  canAcceptInvite,
  contactBook,
  invite,
  localProfileId,
  recipientEncryptionKeyPair
}) {
  if (!localProfileId || invite?.toProfileId !== localProfileId) {
    throw new Error('DM invite is not addressed to this profile')
  }

  if (contactBook && !canAcceptDmInviteFromContactBook(contactBook, invite)) {
    throw new Error('DM invite is not authorized')
  }

  if (canAcceptInvite && !canAcceptInvite(invite)) {
    throw new Error('DM invite is not authorized')
  }

  const payload = openDmInvite({ invite, now: acceptedAt, recipientEncryptionKeyPair })

  if (
    payload.channelDiscoveryKey !== invite.channelDiscoveryKey ||
    payload.channelPublicKey !== invite.channelPublicKey
  ) {
    throw new Error('DM invite payload mismatch')
  }

  return acceptDmThread(
    createDmThread({
      channelDiscoveryKey: payload.channelDiscoveryKey,
      channelPublicKey: payload.channelPublicKey,
      createdAt: invite.createdAt,
      localProfileId,
      remoteProfileId: invite.fromProfileId,
      requestId: invite.requestId,
      threadId: payload.threadId
    }),
    { acceptedAt }
  )
}
