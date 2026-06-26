# Kepos Keet-Grade Identity And Security

This document describes the target model for moving Kepos from prototype identity to Keet-grade identity and security.

## Current State

Kepos currently treats `profileId` as the stable local identity. The latest direction is to make `profileId` equal to an identity public key and persist local identity key material on each device.

This is the right V1 shape and now includes real signing for protocol-critical records, but it is not yet Keet-grade:

- no seed phrase
- no hierarchical deterministic identity
- no device attestation
- no multi-device account linking

Implemented V1 pieces:

- `profileId === identity.publicKey`
- Ed25519-compatible signing and verification through `hypercore-crypto`
- deterministic `compact-encoding` signed records
- signed home address payloads
- signed trust grants
- signed profile/home/message-request QR payload routing
- signed DM invites and DM messages
- signed treehole events and writer grants

The current key pair should still be treated as V1 identity key material, not as a complete Keet-grade security system.

## Keet-Grade Target

Keet-style identity appears to use a root identity based on deterministic key material. Public sources describe `keet-identity-key` as hierarchical deterministic Ed25519 keypairs for Keet identity. The important concepts for Kepos are:

- root identity public key
- root identity secret derived from a seed phrase
- derived profile discovery keypair
- derived device keypairs
- proof that a device key is attested by the root identity
- encryption keys derived for profile/home/channel use

The product-level user should not see this machinery. The user sees a profile, home, trust relationship, and messages. Internally, those objects are backed by key material.

## Identity Model

Target shape:

```js
Identity {
  publicKey,
  secretKey,
  seedPhrase?,
  deviceKeyPair,
  deviceProof
}

Profile {
  id: identity.publicKey,
  displayName,
  identityPublicKey: identity.publicKey,
  homeRoom
}
```

`profile.id` should remain the public identity key for now. This keeps trust, post ownership, and DM routing simple while making the meaning more precise.

## Home Model

Profile and home are 1:1, but identity key and home key are different.

```js
HomeRoom {
  ownerProfileId,
  address,
  roomKey,
  policy
}
```

The home key is a transport/access capability. The identity key proves who owns that home. This separation matters because:

- identity should be stable and hard to rotate
- home access can be rotated after leak or revoke
- knowing a profile should not automatically reveal every transport topic
- future home payloads can be signed by the identity key

## Trust Model

Trust should reference identity public keys.

```js
ContactBook {
  ownerProfileId,
  contacts: [
    {
      profileId,
      alias,
      displayNameSnapshot?,
      homeAddress?,
      homePolicy?,
      trustedAt?,
      revokedAt?,
      source,
      proof?
    }
  ]
}
```

The V1 ContactBook is local to one profile/device. It is the local identity's contact and trust database.

Signed trust grants can be embedded in or derived from ContactBook records:

```js
SignedTrustGrant {
  ownerProfileId,
  trustedProfileId,
  createdAt,
  revokedAt?,
  proof
}
```

For V1 product architecture, `proof` must be a signature from `ownerProfileId` over the grant contents. Unsigned grants can exist only in prototype or migration paths.

## Device Model

Phase 1 says one device equals one profile. Keet-grade identity should allow later multi-device linking.

Future shape:

```js
Device {
  devicePublicKey,
  identityPublicKey,
  proof,
  label,
  createdAt
}
```

The device proof says: this device key is authorized by the root identity. Device linking should not require changing the profile id.

## DM Security

DM must not ride the room/home swarm as the production path.

Target:

- trust or accepted request creates a pairwise DM channel
- the DM channel has its own discovery key/topic
- channel setup is authorized by identity keys
- message payloads are encrypted for the pair
- room peers cannot see DM transport frames

The current DM-over-home-swarm path is useful only as a smoke/prototype path.

## Message Requests

Untrusted users should not get a full DM channel. The target is closer to WeChat:

- untrusted sender can send one message request
- recipient can accept, reply, or ignore
- reply or accept upgrades to a DM channel
- repeated untrusted requests from the same identity are blocked unless recipient resets state

The request should be signed by the sender identity in V1 product architecture.

## Implementation Status And Plan

Done in V1:

1. Keep `profileId === identity.publicKey`.
2. Replace placeholder identity keys with a real Ed25519-compatible keypair module.
3. Persist local identity key material per platform using V1 storage envelopes and fail-closed validation.
4. Add signed home address payloads.
5. Add signed trust grants.
6. Add pairwise DM channel setup.
7. Add one-message request inbox.

Later Keet-grade work:

1. Evaluate `keet-identity-key` and `keypear` for Node, Bare, React Native, and Expo compatibility.
2. Add device attestation and account/device linking.
3. Add seed phrase backup and restore.
4. Move secrets into stronger platform secure storage where practical.

## Compatibility Questions

Before using Keet/Holepunch identity modules directly, verify:

- works in Node desktop renderer/main path
- works in Bare Android backend
- does not break React Native Metro bundle
- native sodium dependencies are available on Android
- key material can be stored in app-private storage
- future secure storage integration is possible

## Non-Goals For The Next Slice

- no full account system
- no device linking UI
- no username registry
- no seed phrase UX
- no crypto claims before signing/encryption are actually implemented
