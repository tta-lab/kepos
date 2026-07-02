# V1 Profile Social Finalization Next Plan

This is the active next plan after `26-v1-readiness-closure-next-plan.md`.

Use `26` for the readiness-closure bar and final proof packet shape. Use this
document for the remaining V1 implementation pass before the expensive physical
desktop/Android proof.

## Target

V1 is a profile-first private IM product:

```text
Profile QR -> friend request -> accept -> Contacts / Chat / Profile posts -> explicit Home
```

Home is not part of adding a friend. It is a live room that a trusted contact
can enter explicitly after trust already exists.

## Product Rules

- Profile is the social address.
- Profile QR is the only normal add-friend QR.
- Friend request delivery is profile-to-profile P2P.
- Accept creates mutual product trust.
- Chat is durable private messaging on the profile-social route.
- Contacts is the friend list and request-state surface.
- Profile detail is the trusted person's context surface: Message, recent
  posts, and explicit Enter Home.
- Treehole remains the owner's local post surface.
- Home is lower-priority than profile, contacts, chat, and posts.
- Home QR and direct host/port are debug or advanced transport tools only.

If a normal product flow says "join Home" while the user is adding a friend,
that flow is wrong for V1.

## Current State

As of 2026-07-03, the source has moved close to the target model:

- desktop and Android use the same main product surfaces:
  `Home / Chat / Contacts / Treehole`
- Profile QR request-target copy no longer tells users they are joining a Home
- outgoing friend-request delivery state is stored in ContactBook
- removed, ignored, pending, and trusted states have visible Contacts surfaces
- Chat send is gated by the current ContactBook request state on desktop and
  Android
- local Treehole posts persist
- Home entry is exposed as an explicit trusted-profile action
- the current non-device `npm run v1:gate` passed on commit
  `3a4ef061b7107d69451399e6d193a5477be8322e` with lint, typecheck,
  platform boundaries, 966 Node tests, TypeScript probes, desktop bundles,
  Android backend Bare bundle, Expo Android export, and Android APK
  native-library checks
- release proof tooling exists through
  `npm run v1:proof:packet` and `npm run v1:proof:check`

The remaining blocker is not a new product model. The remaining blocker is
closing stale-state edges and proving the product path on real desktop plus
physical Android.

## Remaining Implementation Work

### 1. Remove Last Stale-State Gaps

Audit every path that mutates ContactBook and then depends on asynchronous
delivery callbacks:

- send outgoing friend request
- retry outgoing friend request
- receive delivery-state callback
- accept incoming friend request
- accept outgoing request callback
- ignore, allow, remove, and revoke contact

When a path writes a new ContactBook that a callback may read immediately, keep
the React state and the mutable runtime ref in sync in the same step.

Done means request delivery state cannot be lost only because a callback arrived
before React committed the next render.

### 2. Keep Home Out Of Social Delivery

Recheck desktop and Android normal paths:

- scan or paste Profile QR
- send request
- receive request
- accept request
- create durable Chat
- send Chat

None of these should require Home membership, Home peer count, Home QR, or
direct host/port.

Debug fallback may exist, but it must stay visibly debug-only.

### 3. Make Product Parity Honest

Desktop and Android do not need identical layouts, but they must expose the same
V1 product facts:

- Contacts can show trusted, pending, ignored, removed, and incoming request
  states
- Chat can open the durable thread for a trusted contact
- Profile detail can open Message, recent posts, and Enter Home
- Treehole writes local owner posts
- Home shows the active owner and does not pretend to be the friend system

If mobile lacks a normal button that desktop has, add it or explain why it is
debug-only.

### 4. Run Low-Cost Proof Before Phone Smoke

Before using the physical phone again:

```sh
npm test -- test/friend-request-target-view-model.test.js test/mobile-mlp-ui.test.js test/desktop-message-actions.test.js
npm run lint
```

If source-level changes touch shared protocol, storage, platform boundary, or
proof logic, also run:

```sh
npm run v1:gate
```

### 5. Run One Final Physical Proof

Only after the low-cost gates pass, run the final desktop plus Android proof
from `../v1.21-cross-device-smoke.md` and record:

```sh
npm run v1:proof:packet -- --output tmp/final-v1-proof.md
npm run v1:proof:check -- --file tmp/final-v1-proof.md
```

The proof must show Home peer count is not required for request and accept.

## Done Means

- The normal add-friend path is Profile QR only.
- Request and accept delivery are profile-to-profile P2P.
- Contacts, Chat, Profile, and Treehole agree on the same trusted person.
- Chat survives restart.
- local Treehole posts survive restart.
- Home entry is explicit and post-trust.
- revoke blocks future access.
- `tmp/final-v1-proof.md` passes `npm run v1:proof:check`.

## Non-Goals

- Do not start V2 media rooms.
- Do not add group chat.
- Do not solve multi-device identity.
- Do not make Home QR a normal add-friend path.
- Do not use direct host/port as production delivery.
