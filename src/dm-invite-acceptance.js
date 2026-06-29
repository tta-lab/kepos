import { openDmInvite } from './dm-invite.ts'
import { acceptDmThread, createDmThread } from './dm-thread.ts'
import { canAcceptDmInviteFromContactBook, isContactRevoked } from './contact-book.ts'

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
