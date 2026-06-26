import type { DmEncryptionKeyPair, DmInvite, DmInvitePayload } from '../src/dm-invite.ts'
import { createDmEncryptionKeyPair, createDmInvite } from '../src/dm-invite.ts'
import type { MessageRequest } from '../src/message-request.ts'
import { createMessageRequest } from '../src/message-request.ts'
import { createSigningKeyPair } from '../src/signed-record.ts'

const from = createSigningKeyPair()
const to = createSigningKeyPair()
const recipientEncryption: DmEncryptionKeyPair = createDmEncryptionKeyPair()
const invitePayload: DmInvitePayload = {
  capabilities: ['text'],
  channelEncryptionKey: 'a'.repeat(64)
}

const invite: DmInvite = createDmInvite({
  channelDiscoveryKey: 'b'.repeat(64),
  channelPublicKey: 'c'.repeat(64),
  createdAt: 1000,
  fromIdentity: from,
  inviteId: 'invite-1',
  payload: invitePayload,
  recipientEncryptionPublicKey: recipientEncryption.publicKey,
  requestId: 'request-1',
  toProfileId: to.publicKey
})

const request: MessageRequest = createMessageRequest({
  createdAt: 1000,
  fromIdentity: from,
  requestId: 'request-1',
  senderEncryptionPublicKey: recipientEncryption.publicKey,
  text: 'hello',
  toProfileId: to.publicKey
})

if (invite.fromProfileId !== from.publicKey || request.fromProfileId !== from.publicKey) {
  throw new Error('DM bootstrap type probe failed')
}
