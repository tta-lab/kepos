# V1 Profile Delivery Home-Independent Next Plan

This is the active next plan after `27-v1-profile-social-finalization-next-plan.md`.

The user-facing rule is now strict:

```text
Profile QR -> friend request -> accept -> Contacts / Chat / Profile posts
Home entry is a separate trusted action after that.
```

Home must not be part of adding a friend. It must not be the hidden delivery
route for friend requests, accepts, DM bootstrap, or normal private Chat.

## Target

V1 should feel like a private IM built on P2P identity:

- one profile is the social address
- one Profile QR starts the normal add-friend flow
- friend request delivery is profile-to-profile P2P
- accept creates mutual product trust
- Chat and profile posts work from the profile relationship
- Home is an optional live room after trust

Home still matters, but it is not the permission model. It is a place a trusted
contact can explicitly enter, and later a place to launch V2/V3 activities.

## Product Rules

- Profile is the only normal social invite surface.
- Home is never required to add, accept, message, or view profile posts.
- Home QR is advanced/debug only in V1.
- Direct host/port is diagnostics only.
- Trust belongs to the profile relationship.
- Delivery belongs to profile-level P2P routes.
- Activity invites are allowed only after trust already exists.
- Treehole remains the owner's local post surface; trusted contacts can read
  recent posts through the profile context when delivery is available.

The phrase "home invite" should not mean "build trust". If V1 needs an invite
word, it should mean an activity/session invitation between people who already
have trust.

## Architecture Decision

The production social route is:

```text
local profile -> target profile -> signed request / accept / DM bootstrap / DM body
```

The production social route is not:

```text
join target Home -> send control frame -> infer friendship
```

The same low-level P2P stack can carry both profile delivery and Home traffic,
but the product layers must stay separate:

- profile delivery owns social records
- DM owns durable private messages
- Treehole owns durable profile posts
- Home owns live room presence and room chat

## Current Evidence

As of 2026-07-03:

- `npm run v1:gate` passed on
  `90de1e0b12a39112bedff13a7fcf910ecb305a2e` with 970 Node tests, lint,
  typecheck, platform boundary checks, TypeScript probes, desktop bundle,
  Android backend Bare bundle, Expo Android export, and Android APK
  native-library checks.
- `npm run android:assemble:release` passed for
  `android/app/build/outputs/apk/release/app-release.apk`.
- Release APK SHA-256:
  `6ac52d215c52a637454633e1eb5429fedf58a00947798ba944a9f08c0fa0c803`.
- `tmp/final-v1-proof.md` exists as the local proof draft, but it is not
  complete until physical desktop/Android evidence fills the device, QR, peer
  count, restart, and revoke checklist.
- Profile QR generation no longer embeds the signed Home descriptor. The
  product can still generate a Debug Home QR, but that descriptor is separate
  from the normal add-friend QR.
- Profile QR scanning ignores any embedded Home descriptor from old or manually
  crafted payloads. Scanning a Profile QR creates a profile request target or
  profile trust state, not a saved Home descriptor.
- Outgoing friend requests no longer copy scanned Home descriptors into request
  state. Accepting a request therefore cannot silently upgrade an add-friend
  flow into Home entry permission.
- ContactBook also enforces this at the domain layer: even if a caller passes
  Home descriptor fields into outgoing friend request creation, accepting that
  outgoing request creates trust without storing Home address, room key, policy,
  or Home proof.

This means the remaining risk is product-path proof and any bug found while
proving it, not another conceptual redesign.

## Implementation Plan

### 1. Audit Product Copy And Entry Points

Remove normal-user copy that implies:

- adding a friend joins a Home
- a Home QR is a normal add-friend QR
- direct host/port is a recovery path for normal users
- accepting a friend means entering a Home

Done means desktop and Android show one normal social path: Profile QR,
friend request, accept, Contacts, Chat, profile detail, recent posts, explicit
Enter Home.

### 2. Audit Delivery Boundaries

Recheck desktop and Android production paths:

- scan or paste Profile QR
- send friend request
- receive incoming request
- ignore and allow requests
- resend request
- accept request
- create or receive DM bootstrap
- send and receive Chat body

None of these paths should require:

- Home peer count greater than zero
- Home QR
- Home control traffic
- direct host/port
- entering Home as a side effect

Debug fallbacks may remain only behind explicit advanced/debug labels or test
helpers.

Status: implemented for the Profile QR / outgoing request path. Current
evidence:

```sh
npm test -- test/share-qr-service.test.js test/desktop-qr-service.test.js test/signed-qr-scan.test.js test/desktop-message-actions.test.js test/friend-request-target-view-model.test.js test/mobile-qr-actions.test.js
```

The focused tests prove generated Profile QR payloads omit Home descriptors,
legacy embedded descriptors are ignored by profile scan/trust code, outgoing
friend requests do not store Home descriptors, and Debug Home QR remains the
separate Home descriptor path. `test/contact-book.test.js` also proves the
domain model does not promote outgoing-request Home fields into trusted contact
Home descriptors.

### 3. Make The UX Match The Model

Desktop and Android should expose the same product facts:

- bottom or primary navigation includes Home, Chat, Contacts, Treehole
- Contacts is where friend requests and profiles live
- Chat is a friend-list/thread-list surface with last-message preview
- opening a contact or chat row reaches the same profile detail model
- profile detail has Message, recent posts, and explicit Enter Home
- Treehole is for the owner's posts
- Home is a live room, not the friend system

Layout can differ by platform, but the nouns and user flow must not.

### 4. Final Proof

Before final physical proof, decide and implement the normal post-trust Home
descriptor route:

- short-term V1 option: trusted user scans a Debug Home QR/session descriptor
  after friendship exists, then Enter Home uses the saved descriptor
- better V1/V2 option: accepted profiles exchange signed Home/session
  descriptors over profile-level P2P after trust

Do not restore Home descriptor embedding in Profile QR to make this easier.

Run the final proof only when source-level checks are clean and the phone is
ready:

```sh
npm run v1:gate
npm run v1:proof:packet -- --output tmp/final-v1-proof.md
npm run v1:proof:check -- --file tmp/final-v1-proof.md
```

The packet must prove:

- physical Profile QR scan works
- request receipt happens while desktop and Android Home peer counts are zero
- accept / invite return happens while desktop and Android Home peer counts are
  zero
- outgoing request state survives Android restart before acceptance
- ignored request can be allowed and resent
- Contacts and Chat both lead to the same trusted profile detail
- Chat messages survive restart
- local Treehole posts survive restart
- explicit Enter Home works only after trust
- trusted recent posts are visible from profile context when available
- revoke blocks future access

## Done Means

- The normal add-friend path never mentions or requires Home.
- Profile-level P2P is the only production delivery route for request, accept,
  DM bootstrap, and Chat.
- Home is a post-trust action, not an authorization mechanism.
- Desktop and Android present the same V1 product model.
- `tmp/final-v1-proof.md` passes
  `npm run v1:proof:check -- --file tmp/final-v1-proof.md`.

## Non-Goals

- Do not start V2 media rooms.
- Do not start V3 local-service or RetroArch work.
- Do not add group chat.
- Do not add multi-device identity.
- Do not promote Home QR or direct host/port into normal social UX.
