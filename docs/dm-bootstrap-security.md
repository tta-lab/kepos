# Kepos DM Bootstrap And Security

This document defines the target DM bootstrap model for Kepos.

## Decision

Kepos should use explicit signed and encrypted DM invites as the final architecture.

Deterministic pairwise topics are acceptable only as prototype smoke plumbing. They should not become the V1 product architecture.

## Why This Matters

DM is private durable communication. The bootstrap path decides:

- who can discover the DM channel
- who can join the DM channel
- whether the channel can be rotated
- whether a request can be accepted, ignored, or revoked
- how much relationship metadata leaks

If A and B derive a DM topic from public identity keys, anyone who knows both keys can derive the same topic. Even if messages are encrypted later, the topic itself can reveal that A and B have a possible DM channel.

That is too weak for the final model.

## Rejected Simple Model

Rejected V1 product model:

```text
dmTopic = hash("kepos-dm:v1:" + min(profileA, profileB) + ":" + max(profileA, profileB))
```

Why it is tempting:

- no invite storage
- no invite exchange
- easy to test
- both sides can independently find the same channel

Why it is not good enough:

- topic is derivable from public identity keys
- relationship metadata is easier to observe
- channel rotation is awkward
- message request acceptance cannot carry encrypted channel material
- revoke cannot cleanly rotate deterministic discovery material
- hard to make it feel Keet-grade later without migration

## Target Model

DM starts from an explicit invite.

```js
DmInvite {
  type: 'kepos.dm.invite.v1',
  inviteId,
  fromProfileId,
  toProfileId,
  channelPublicKey,
  channelDiscoveryKey,
  createdAt,
  expiresAt?,
  requestId?,
  proof,
  encryptedPayload
}
```

`proof` is a signature from `fromProfileId` over the public invite fields.

`encryptedPayload` is encrypted for `toProfileId` and contains private channel material:

```js
DmInvitePayload {
  channelSecret?,
  channelEncryptionKey,
  initialWriterKey?,
  welcomeMessageId?,
  capabilities
}
```

The exact key material can change when the crypto implementation is chosen, but the boundary should stay the same: public routing fields outside, private channel material inside.

## Trusted DM Flow

1. A trusts B, or B trusts A.
2. One side creates a DM invite.
3. The invite is signed by the sender identity.
4. The private channel payload is encrypted for the recipient identity.
5. The recipient verifies the signature.
6. The recipient decrypts the payload.
7. Both sides join the DM channel.
8. DM messages are stored in the pairwise durable DM log.

The home room may carry an invite notification, but it must not carry DM message contents.

## Message Request Flow

Untrusted sender gets one request.

1. B scans A's profile/home QR.
2. B creates a message request for A.
3. A sees one pending request from B.
4. If A ignores it, B cannot send more normal requests.
5. If A accepts or replies, A creates or accepts a DM invite.
6. The accepted request becomes a durable DM thread.

The request itself is not a full DM channel.

## Revoke And Rotation

Revoke in V1 blocks future access but does not erase old replicated data.

For DM, revoke should:

- stop accepting new DM invites from the revoked profile
- stop issuing new DM invites to the revoked profile
- mark existing DM thread as closed or revoked
- keep old local history unless the user deletes it locally

Current implementation status:

- ContactBook blocks new pending message requests from revoked contacts
- message request acceptance rejects revoked contacts before issuing a new invite or thread
- accepted/revoked DM thread state is modeled locally
- full user-facing revoke controls and automatic key rotation remain later work

Future key rotation should create a new invite and new channel material.

## Storage Model

```js
DmThread {
  threadId,
  localProfileId,
  remoteProfileId,
  channelPublicKey,
  channelDiscoveryKey,
  createdAt,
  acceptedAt?,
  revokedAt?,
  requestId?
}

DmMessage {
  id,
  threadId,
  fromProfileId,
  text,
  createdAt,
  proof
}
```

V1 can persist these locally. Multi-device sync can come after identity/device linking.

## What We Give Up

By rejecting deterministic pairwise topics as product architecture, we give up:

- fastest possible DM smoke implementation
- topic derivation without invite state
- simpler first implementation

We gain:

- cleaner privacy boundary
- channel rotation path
- better message request handoff
- clearer revoke semantics
- less painful path to Keet-grade signing and encryption

## Implementation Stages

### Stage 1: Domain Model

- add `MessageRequest`: done in `src/message-request.ts`
- add signed/encrypted `DmInvite`: done in `src/dm-invite.ts`
- add `DmThread` domain model: done in `src/dm-thread.ts`
- add validation tests: done for message request, invite, and thread domain model
- add request accept and invite accept helpers: done in `src/message-request-acceptance.js` and `src/dm-invite-acceptance.js`

No networking claim yet.

### Stage 2: Local Invite Exchange

- create invite from trusted contact or accepted request
- persist invite/thread locally
- route invite through existing prototype control path only as setup data
- keep DM message contents out of home room traffic: done for the home room protocol; `dm` body frames are rejected

Status: done for desktop and Android setup smoke. Android keeps invite crypto in the Bare backend; React Native UI only passes signed records, ciphertext, public keys, and thread metadata.

### Stage 3: Signed Invites

- use real identity signing
- verify invite proof
- reject malformed or wrong-recipient invites

Status: done for the invite domain model.

### Stage 4: Encrypted Payload

- encrypt private channel payload for the recipient
- stop exposing channel secrets in cleartext control messages

Status: done for the invite domain model with libsodium sealed boxes.

### Stage 5: Dedicated DM Replication

- replicate durable DM thread over its own channel
- remove production dependency on home room for DM contents

Status: implementation done and covered by debug two-device smoke.

The pure thread state model, storage adapters, desktop/Android setup wiring, signed DM message record shape, durable per-thread signed message storage, dedicated DM replication channel primitive, desktop/Android lifecycle wiring, trusted-contact recipient picker, debug two-device signed DM exchange, restart persistence, and desktop revoke close path exist. Remaining work is manual physical QR smoke and any contacts polish revealed by that smoke.

## V1 Rule

V1 should not present deterministic pairwise topic DM as the product architecture.

If a simpler path remains in code for smoke testing, it must be named and treated as prototype-only.
