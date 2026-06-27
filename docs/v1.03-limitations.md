# Kepos V1 Limitations

This document records what V1 deliberately does not solve.

The goal is to keep the first solid version small enough to build and test while leaving a clean path to stronger identity, security, and multi-device support.

## Identity And Security

V1 treats `profile.id` as the profile identity public key and must include real signing/verification for protocol-critical records.

V1 does not include:

- 24-word seed phrase backup
- hierarchical deterministic identity
- device attestation
- multi-device account linking
- end-to-end encrypted DM payloads

V1 signing is required for:

- trust grants
- home address payloads
- QR-owned protocol payloads
- treehole events
- DM invites
- message requests
- DM messages

The current identity key material must not be described as a complete security system until signing and verification are implemented.

## Device Model

V1 uses one device as one profile.

This means:

- desktop profile and Android profile are separate profiles unless manually paired later
- contacts and trust are local to that profile
- DM history is local to that profile pair
- account recovery is not supported

Multi-device identity sync is a later feature.

## Trust Model

V1 uses one trust scope: `home`.

Trust is the authorization SSOT. Keys are transport capabilities and debug-visible handles, not product-level permission.

If A trusts B, B can:

- enter A's trusted-only home
- read A's treehole
- comment and like A's treehole posts
- open a pairwise DM with A

Trust does not let B create main posts in A's treehole.

V1 trust grants are local persisted records with fields reserved for future signed proofs. They are not yet a fully replicated trust log.

V1 ContactBook is local to the profile/device. It uses a shared domain model with platform persistence adapters, but it does not sync across devices.

Creating trust or accepting/replying to a message request should create or confirm a local alias for the other profile. QR display names are only initial suggestions.

V1 does not guarantee that an untrusted peer with a stale key can never connect at the transport layer. It must still block treehole bootstrap data, writer rights, DM setup, and trusted actions.

## Revoke Model

V1 revoke blocks future access. It does not delete already replicated data.

After revoke, Kepos should:

- reject new trusted-only home access
- stop sharing treehole bootstrap data
- stop granting treehole writer rights
- stop opening new DM channels
- mark existing contact or DM state as revoked

V1 does not automatically rotate home, treehole, or DM keys after revoke.

## Home Room

V1 home room chat is ephemeral.

This means:

- room chat is live session state
- room chat is not a durable history
- leaving or restarting may lose room chat messages
- durable profile text belongs in treehole
- durable private text belongs in DM

Public home access in V1 allows room chat only. It does not make treehole public.

## Treehole

V1 treehole is a durable profile-owned log.

Rules:

- owner can create main posts
- trusted users can read posts
- trusted users can comment and like
- trusted users cannot create main posts in someone else's treehole
- comments and likes are stored in the owner's treehole log
- writer authorization is added lazily when a trusted user first writes

V1 does not include images, rich text, reposts, quote posts, global feeds, or search.

## DM

V1 DM must be durable and pairwise.

Rules:

- one DM thread per profile pair
- DM storage is separate from home room and treehole
- DM messages should not travel over the home room
- trusted users can DM each other
- untrusted users can send one message request
- pending message request grants no read, presence, home, treehole, or DM access
- accepting or replying to the request upgrades it to a DM thread

V1 does not include group DM, media, calls, typing indicators, read receipts, public presence for untrusted users, or full spam controls.

## QR And Manual Keys

V1 should use QR flows for normal user paths:

- profile QR for trust/contact
- home QR for home entry
- message request flow for untrusted contact

Manual 32-byte key entry can remain for debug or support, but it should not be the main product UI.

Product V1 QR payloads that grant or request protocol access must be signed. Unsigned payloads can remain only in tests or debug tooling.

V1 uses URI-wrapped encoded JSON for QR payloads. It does not use compact binary QR encoding yet.

## Cross-Platform Limits

V1 targets desktop and Android smoke parity.

It does not guarantee:

- iOS support
- browser support
- multi-device profile sync
- background delivery
- offline push notifications
- production-grade battery behavior

## Operational Limits

V1 is still a local-first P2P prototype.

It does not include:

- server accounts
- centralized username registry
- usernames or global handles
- moderation service
- analytics
- cloud backup
- abuse reporting backend
- production update channel guarantees

## Success Bar

V1 is acceptable when the following work reliably on desktop and Android:

- create and persist profile identity
- create and persist home
- trust another profile
- enforce trusted-only access
- use ephemeral room chat
- post to own treehole
- read trusted treehole
- comment and like trusted treehole posts
- send durable trusted DM
- send and handle one untrusted message request
- hide raw keys from normal user flows
