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
- Android direct ContactBook writes now use one `syncContactBook()` path, so
  profile-delivery callbacks cannot read stale request state after send, retry,
  receive, accept, ignore, allow, remove, or revoke paths
- removed, ignored, pending, and trusted states have visible Contacts surfaces
- Chat send is gated by the current ContactBook request state on desktop and
  Android
- Android Home-peer resend of outgoing friend requests is debug-only behind
  `allowHomeTrustFallback`; normal Home peer connection is not a hidden social
  delivery route
- local Treehole posts persist
- Home entry is exposed as an explicit trusted-profile action
- the current non-device `npm run v1:gate` passed on commit
  `3a4ef061b7107d69451399e6d193a5477be8322e` with lint, typecheck,
  platform boundaries, 966 Node tests, TypeScript probes, desktop bundles,
  Android backend Bare bundle, Expo Android export, and Android APK
  native-library checks
- release proof tooling exists through
  `npm run v1:proof:packet` and `npm run v1:proof:check`

The remaining blocker is not a new product model. The source-level hardening
now has low-cost test coverage. The remaining blocker is proving the normal
product path on real desktop plus physical Android.

## Remaining Implementation Work

### 1. Remove Last Stale-State Gaps

Status: source-level low-cost closure is done.

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

Current evidence:

- `mobile/App.tsx` uses `syncContactBook()` for direct ContactBook writes.
- `test/mobile-mlp-ui.test.js` proves the send, retry, persist, accept,
  ignore, allow, remove, revoke, and profile-load paths keep
  `contactBookRef.current` in sync with React state.

### 2. Keep Home Out Of Social Delivery

Status: source-level low-cost closure is done.

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

Current evidence:

- desktop friend-request send and retry tests throw if normal profile requests
  read the Home runtime.
- desktop request-accept tests prove invite return uses profile transport
  without joining Home.
- Android backend tests prove Profile request send and accept use
  `profileRequestRuntime`, and Home-control request, invite, body, and request
  resend paths are debug-only.

### 3. Make Product Parity Honest

Status: source-level low-cost closure is done.

Desktop and Android do not need identical layouts, but they must expose the same
V1 product facts:

- Contacts can show trusted, pending, ignored, removed, and incoming request
  states
- Chat can open the durable thread for a trusted contact
- Profile detail can open Message, recent posts, and Enter Home
- Treehole writes local owner posts
- Home shows the active owner and does not pretend to be the friend system

Current evidence:

- `src/contact-profile-view-model.ts` is the shared profile-detail model for
  trusted, incoming-request, outgoing-request, ignored, and removed states.
- Desktop `PeoplePane` exposes Friend requests, Sent requests, Profiles, and
  Removed / ignored sections; each row can open the same profile detail surface.
- Android `PeoplePane` exposes the same request, contact, removed / ignored,
  and selected-profile detail route through typed TSX component slices.
- Desktop and Android profile details expose Message, Recent posts, explicit
  Enter Home, Remove friend, request accept / ignore, and Allow requests only
  when the relationship state permits those actions.
- Chat thread rows on desktop and Android can open the same profile detail
  route as Contacts.
- Home owner bars on desktop and Android show the current Home owner context;
  Home remains an explicit live-room action, not the friend system.
- `test/mobile-mlp-ui.test.js`, `test/desktop-mlp-shell.test.js`,
  `test/desktop-people-view-model.test.js`, and
  `test/contact-profile-view-model.test.js` pin these source-level parity
  surfaces.

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
