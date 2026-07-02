# V1 Profile And DM Only Social Next Plan

This is the active next plan after
`32-v1-profile-dm-first-release-next-plan.md`.

The current rule is simple:

```text
Profile/DM = normal social product
Home = explicit trusted live/session product
```

Friendship and Home must not be mixed. A user adds a person, not a room.

## Product Decision

V1 should finish as a private IM where the normal path is:

```text
Profile QR -> friend request -> accept -> Contact -> Chat/Profile posts
```

Home is only an optional action after trust:

```text
trusted Contact -> Profile detail -> Enter Home
```

No normal social action should require Home entry, Home readiness, Home peer
count, Home QR, or direct host:port.

## Canonical Use Cases

### Add A Friend

1. A scans B's Profile QR.
2. A sends a signed friend request to B's profile route.
3. B sees the request in Contacts.
4. B accepts.
5. Both sides store mutual trust.
6. Both sides can open Chat and Profile detail.

This flow must not enter Home.

### Chat With A Friend

1. User opens Chat.
2. Chat list shows trusted friends, with last-message preview when available.
3. User opens a thread.
4. Messages are durable pairwise DM records.

This flow must not depend on Home runtime state.

### Post To Treehole

1. User opens Treehole.
2. User writes their own post.
3. Trusted contacts can read recent posts through Profile detail when delivery
   is available.

The owner's Treehole is a profile post surface. It must not require the owner
to open their Home first.

### Enter Home

1. User opens a trusted contact's Profile detail.
2. User taps Enter Home.
3. Kepos uses a trusted Home descriptor if one exists.

This is a live/session action. It is not a trust action.

## Implementation Plan

### 1. Audit And Remove Remaining Home Gates From Social Paths

Search desktop, Android, shared source, and tests for social actions that still
read or gate on:

- `homeReady`
- `homeRoomKey`
- `homeRuntime.isJoined()`
- Home peer count
- Home descriptor outside explicit Enter Home
- Home-control request or invite fallback
- direct host:port outside diagnostics

Patch only real product leaks. Home gates are still correct for Home chat,
Debug Home QR, manual Home entry, avatar/live media tied to Home, and Enter
Home.

Done means these actions can run before Home is opened:

- Profile QR scan or paste
- send friend request
- receive request
- accept request
- open Contacts
- open Chat
- send DM
- open Profile detail
- create local Treehole post

### 2. Make Desktop And Android Use One Product Vocabulary

Both clients should expose the same primary surfaces:

```text
Home / Chat / Contacts / Treehole
```

The product meaning should match on both clients:

- Profile QR is the normal add-friend code.
- Contacts owns request state and trusted contacts.
- Chat owns durable pairwise conversations.
- Profile detail owns Message, recent posts, and Enter Home.
- Treehole owns the local user's posts.
- Home owns live room/session behavior only.
- Home QR/manual key/direct host:port are advanced or diagnostics surfaces.

Android needs special attention because the UI has lagged behind desktop.

### 3. Keep Home Descriptor Delivery Post-Trust

Home descriptors may be delivered only after trust exists.

Valid paths:

- profile-level post-trust delivery
- advanced/debug Home QR after the user already understands they are entering
  a Home

Invalid paths:

- embedding Home descriptors in Profile QR
- requiring a Home descriptor to send a friend request
- accepting a request by entering Home
- using Home-control broadcast as production DM bootstrap

### 4. Add Regression Evidence Before Physical Smoke

Low-cost proof should fail if the old model returns:

- Profile QR carries a Home descriptor.
- sending a request requires Home readiness or a Home key.
- accepting a request requires Home membership.
- DM bootstrap uses Home control in the normal path.
- Chat send reads Home runtime state.
- Treehole owner post requires Home entry.
- Profile detail recent posts require Home entry.
- non-debug UI presents Home QR as a primary add-friend path.
- direct host:port appears as a production fallback.

Suggested gate before phone smoke:

```sh
npm test -- test/v1-docs-current-state.test.js test/mobile-mlp-ui.test.js test/profile-friend-request-transport.test.js test/desktop-message-request-actions.test.js test/desktop-backend-session.test.js test/desktop-message-actions.test.js test/android-backend-bundle.test.js
npm run lint
npm run v1:gate
```

### 5. Run Final Physical Proof Last

Do not spend physical phone time until the source-level route is clean.

The final release proof still uses `../v1.21-cross-device-smoke.md` and writes:

```sh
tmp/final-v1-proof.md
```

checked by:

```sh
npm run v1:proof:check -- --file tmp/final-v1-proof.md
```

The proof must show:

- physical Profile QR scan sends a request
- receiver sees the request without entering Home
- accept creates mutual trust without entering Home
- Chat works without entering Home
- local Treehole posts work without entering Home and survive restart
- durable Chat survives restart
- Profile detail can show trusted recent posts when available
- Enter Home is explicit and post-trust
- revoke blocks future access

## Current Status

Already implemented before this plan:

- Android profile startup opens the owner Treehole from the profile service
  without joining Home.
- Android Treehole post, comment, and like actions no longer require a Home
  `session`; they use Treehole authorization state.
- Leaving a remote Home closes only the remote Home-scoped Treehole and restores
  the owner's profile Treehole.
- Desktop profile/DM startup configures and opens the owner profile-scoped
  Treehole without Home join.
- Desktop Treehole runtime tracks `profile` and `home` scopes separately.

Still open:

- finish the audit for remaining normal social path Home gates
- patch any real product leak found by that audit
- align Android visible navigation and reachable states with desktop
- produce the final physical desktop/Android proof packet

## Stop Rule

V1 is not ready until the final physical proof exists and passes
`npm run v1:proof:check -- --file tmp/final-v1-proof.md`.

Until then, the right status is:

```text
source-level route increasingly clean; release proof still open
```
