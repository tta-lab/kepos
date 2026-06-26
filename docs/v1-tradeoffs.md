# Kepos V1 Tradeoffs

This document records architecture tradeoffs we choose for V1 and the options we deliberately give up.

The rule is simple: if we choose one design path and reject another meaningful path, record it here.

## Format

Each decision should include:

- decision
- why
- what we give up
- risk
- future escape hatch

## Confirmed Decisions

### V1 Does The Right Architecture First

Decision: V1 can move slower, but protocol-critical architecture should be solid before product polish.

Why: Identity, trust, treehole writes, DM bootstrap, and QR payloads depend on signatures. Shipping weak placeholders as product architecture creates migration and security debt.

What we give up:

- fastest possible feature smoke
- implementing multi-writer treehole comments before signing
- implementing production DM before signed invites

Risk: V1 takes longer to reach feature parity on desktop and Android.

Future escape hatch: Prototype-only plumbing can exist behind debug paths, but product architecture must follow the signed model.

### One Trust Scope

Decision: V1 uses one trust scope: `home`.

Why: It keeps the user model simple. Trust means access to a person's personal surface.

What we give up:

- separate room permission
- separate treehole read permission
- separate comment/like permission
- separate DM permission

Risk: A user cannot allow someone into room chat while blocking DM or treehole interactions.

Future escape hatch: Add scoped grants later, such as `home.chat`, `treehole.read`, `treehole.comment`, and `dm`.

### Public Home Does Not Include Treehole

Decision: Public home access allows room chat only. Treehole read still requires trust.

Why: Room chat is ephemeral, while treehole is durable profile content.

What we give up:

- public profile feed in V1
- easy public treehole sharing
- viral timeline-style distribution

Risk: Public mode may feel less useful because it does not expose persistent posts.

Future escape hatch: Add explicit public treehole policy later.

### Room Chat Is Ephemeral

Decision: Room chat is live session state, not durable history.

Why: Treehole and DM already cover durable text. Durable room history would add another log and more revoke/moderation questions.

What we give up:

- room history
- offline catch-up for room chat
- room search

Risk: Users may expect chat history to persist.

Future escape hatch: Add a separate room history log later if the product needs it.

### DM Is Durable And Pairwise

Decision: DM uses one durable pairwise thread per profile pair.

Why: Private text should survive restart and should not mix with room or treehole traffic.

What we give up:

- DM as lightweight live-only messages
- sending DM over the home room as the production path
- group DM in V1

Risk: Pairwise durable storage adds more protocol and sync work.

Future escape hatch: Keep the DM model separate so group DM can be added as another object later.

### Owner-Only Treehole Main Posts

Decision: Only the treehole owner can create main posts.

Why: A treehole is a profile-owned surface, not a shared wall.

What we give up:

- shared wall behavior
- trusted users posting directly to another user's feed

Risk: Some collaborative use cases need a different object.

Future escape hatch: Add group walls or shared spaces later.

### Comments And Likes Live In Owner Treehole

Decision: Comments and likes on A's posts are stored in A's treehole log.

Why: Readers can render one treehole by syncing one log.

What we give up:

- each commenter owning their comment in their own log
- fully decentralized aggregation across many author logs

Risk: Owner's treehole becomes the moderation and write-permission surface for all interactions.

Future escape hatch: Add federated/commenter-owned interaction logs later if needed.

### Lazy Treehole Writer Authorization

Decision: Trusted users receive treehole writer authorization lazily when they first comment or like.

Why: Trust grants the right to interact, but Autobase writer rights should only be added when needed.

What we give up:

- immediate writer setup for every trusted contact
- simpler first-write path

Risk: First comment or like may have extra latency or failure states.

Future escape hatch: Pre-authorize active contacts or batch writer grants later.

### No Automatic Key Rotation On Revoke

Decision: V1 revoke blocks future access but does not automatically rotate home, treehole, or DM keys.

Why: Key rotation affects QR payloads, existing peers, discovery, storage, and writer state.

What we give up:

- stronger post-revoke capability invalidation
- immediate protection if old keys leaked

Risk: Someone with already copied data or stale capability material may keep what they already have.

Future escape hatch: Add explicit key rotation flows in V2.

### Optional Expiring Profile And Home QR

Decision: Profile QR and home QR may carry an optional signed `expiresAt`.

Why: stale QR is a V1 failure state, but permanent QR remains useful for simple pairing and home sharing.

What we give up:

- single-use QR
- server-verified clock semantics
- automatic key rotation after expiry

Risk: devices with badly wrong clocks may reject a still-intended QR or accept one briefly longer than intended.

Future escape hatch: Add single-use invite QR or challenge-response pairing later.

What we keep:

- stable profile/home QR when `expiresAt` is omitted
- short-lived profile/home QR when `expiresAt` is included

### Display Names Are Local Aliases

Decision: QR display names are initial suggestions. Contact alias is local, user-editable, and should be set when creating trust or handling a message request.

Why: Identity key is the real identity. Names are mutable and not unique.

What we give up:

- globally authoritative display names
- automatic remote renaming of local contacts

Risk: Two users can have the same visible name locally.

Future escape hatch: Add signed profile metadata while preserving local alias override.

### No Username Or Global Handle In V1

Decision: V1 has no username, global handle, or searchable identity registry.

Why: Username systems introduce registration, collision, impersonation, discovery, and moderation questions. V1 identity should be QR/contact-card based.

What we give up:

- public username search
- memorable global handles
- account-style discovery

Risk: Users need QR, contact payload, or debug id exchange to find each other.

Future escape hatch: Add signed profile metadata or a registry later, after the local identity and trust model is solid.

### Message Request Grants No Read Or Presence

Decision: A pending message request grants no home, treehole, DM, or presence access.

Why: A request is a knock on the door, not permission to enter. This keeps untrusted contact safe.

What we give up:

- showing sender whether the recipient is online
- letting request senders preview home/treehole state
- richer pre-trust discovery

Risk: The untrusted sender gets little feedback until accepted, ignored, or cleared.

Future escape hatch: Add explicit public profile metadata later if needed.

### Deletion UI Hides Tombstoned Content

Decision: Normal UI hides tombstoned posts/comments instead of showing forum-style deleted placeholders.

Why: Treehole should feel like a personal surface, not a public forum moderation log.

What we give up:

- visible tombstone history in normal UI
- explicit "this was deleted" placeholders

Risk: Thread structure may look like content disappeared, though the replicated log still contains tombstone events.

Future escape hatch: Show tombstones in debug/log view or moderation tools.

### Likes Are Toggle Events

Decision: Likes are user-toggleable, implemented as append-only add/remove events.

Why: The log stays immutable while UI behaves normally.

What we give up:

- simple raw like event count
- destructive unlike mutation

Risk: Reducer logic must handle duplicate and out-of-order events correctly.

Future escape hatch: Add compaction or snapshotting later.

### Deletes Are Tombstones

Decision: Post/comment deletion is modeled as tombstone events.

Why: Replicated logs cannot promise secure erasure after peers have copied data.

What we give up:

- true deletion guarantees
- pretending moderation removes data from every device

Risk: Users may misunderstand deletion unless UI is careful.

Future escape hatch: Add clearer moderation state and local purge tools later.

## Additional Decisions

### Trust Enforcement Layer

Decision: Trust is the authorization SSOT. Keys are transport capabilities and debug-visible handles, never product-level permission.

Why: V1 prefers simplicity with reasonable security. Owner trust decides access. Keys help peers find swarms, open logs, or connect channels, but key possession alone should not grant product access.

What we give up:

- perfect transport-level exclusion in V1
- claiming that stale or leaked keys are harmless
- transport-level signed join handshakes before the room handshake design is ready

Risk: A peer with a stale key may connect at the transport layer or appear briefly as a peer, but should not receive treehole bootstrap data, writer rights, DM setup, or trusted actions.

Future escape hatch: Add identity-signed join handshakes and reject untrusted peers before normal room participation.

### Contact And Trust Storage

Decision: V1 uses a shared `ContactBook` domain model with platform persistence adapters.

Why: Identity says who the local profile is. ContactBook says who this profile knows, trusts, revoked, or can message. The rules should live in shared code, while desktop and Android only handle local persistence.

What we give up:

- contacts and trust scattered directly in desktop/mobile UI storage
- replicated contact/trust log in V1
- automatic contact sync across devices
- seed-based contact recovery

Risk: A new device is a new profile with a new local contact book. Users must scan or trust again.

Future escape hatch: After seed identity and device linking exist, migrate ContactBook from local JSON into an identity-owned replicated log.

Target V1 shape:

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
      source
    }
  ]
}
```

### QR Payload Envelope

Decision: V1 QR uses a URI envelope with encoded JSON payload.

Why: Raw JSON is easy for tests but weak as product UX. Compact binary is too early. A URI envelope is easy to route, paste, debug, and version.

What we give up:

- the absolute simplest raw JSON QR format
- the smallest possible compact binary QR format

Risk: Payloads are larger than compact binary and need encode/decode rules.

Future escape hatch: Keep the URI envelope stable and switch the inner payload from JSON to compact encoding in a later version.

Target V1 examples:

```text
kepos://profile?v=1&payload=<encoded-json>
kepos://home?v=1&payload=<encoded-json>
kepos://message-request?v=1&payload=<encoded-json>
```

### Pairwise DM Bootstrap

Decision: The final architecture uses explicit signed and encrypted DM invites. Deterministic pairwise topics are prototype-only and should not become the V1 product architecture.

Why: DM is private durable communication. Bootstrap decides discovery, join authorization, rotation, request acceptance, revoke, and metadata leakage.

What we give up:

- the fastest possible DM smoke path
- deriving a shared topic without invite state
- simpler first implementation

Risk: Explicit invites require more domain work before production DM is ready.

Future escape hatch: None needed. This is the intended final path. The implementation can be staged: domain model, local invite exchange, signed invites, encrypted payload, then dedicated DM replication.

### Autobase Comment/Like Authorization

Decision: V1 requires signed treehole events before accepting non-owner comments/likes as product architecture.

Why: Once a profile becomes an Autobase writer, reducer policy must know who authored each event. Without signatures, `authorProfileId` is only a claim.

What we give up:

- shipping multi-writer treehole interactions before identity signing
- relying only on writer grants for author authorization

Risk: This makes treehole comment/like implementation depend on the identity signing work.

Future escape hatch: Prototype-only unsigned events can exist in debug smoke paths, but production treehole reducers must verify signatures.
