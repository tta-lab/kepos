# V1 Profile P2P Release Next Plan

This is the active next plan after
`30-v1-profile-only-social-route-next-plan.md`.

The V1 product direction is now fixed:

```text
Profile QR -> friend request -> accept -> Contacts / Chat / Profile posts
Home -> explicit live room after trust
```

Home is not the friend system. It must not create trust, deliver normal friend
requests, deliver normal accepts, bootstrap DM as a product path, or hide a
direct host:port fallback behind normal UI.

## Target

Finish V1 as a ready private IM built on profile-to-profile P2P:

- Profile is the social address.
- Contacts is the trusted people list and request-state surface.
- Chat is durable pairwise messaging.
- Treehole is the owner's own profile post surface.
- Profile detail shows Message, recent posts, and explicit Enter Home.
- Home is a live/session surface after trust.

## Current Evidence

The source-level model is close to the target:

- Profile QR no longer embeds Home descriptors.
- Friend request, accept, DM bootstrap, and normal Chat are intended to use the
  profile route.
- Home descriptor delivery is post-trust and does not grant trust.
- Desktop Home lifecycle no longer owns the social runtime lifecycle.
- Android leave-Home behavior keeps durable Chat session state intact.
- Desktop and Android expose Profile QR and Add friend as primary setup paths.
- Desktop and Android keep Enter Home as an explicit action.
- Legacy Home fallback switches now use explicit debug names:
  `allowDebugHomeTrustFallback` and `allowDebugHomeDmBodyFallback`.
- The old non-debug `allowHome*Fallback` names are rejected by tests.

Recent low-cost proof:

```sh
npm test -- test/desktop-control-actions.test.js test/desktop-message-actions.test.js test/desktop-backend-session.test.js test/android-backend-bundle.test.js test/android-backend-direct-transport.test.js test/v1-docs-current-state.test.js
npm run lint
npm run v1:gate
```

No physical desktop/Android smoke has been run for this plan yet.

## Next Implementation Order

### 1. Close Remaining Product-Route Leaks

Audit normal user actions and tests:

- scan Profile QR
- send friend request
- receive friend request
- accept friend request
- open Chat
- send Chat
- open Profile detail
- enter Home from Profile detail

Done means none of the normal social actions depend on:

- joined Home session
- Home peer count
- Home-control request traffic
- direct host/port reachability
- Profile QR carrying a Home descriptor

Any compatibility path that remains must be named debug or legacy in source,
tests, docs, and UI copy.

### 2. Make Desktop And Android Product Logic Match

Both clients should expose the same product facts, even if the layouts differ:

- one normal add-friend path: Profile QR
- request states: incoming, outgoing, trusted, ignored, removed
- Chat opens only for a trusted profile
- Profile detail is the bridge to Message, recent posts, and Enter Home
- Treehole creates local owner posts
- Home is explicit post-trust live room entry

Prefer shared TypeScript product/domain code for QR, trust, friend requests,
Home descriptor policy, DM policy, and profile detail view models. Platform code
should own rendering, camera, storage adapters, and runtime glue.

### 3. Keep Debug Surfaces Out Of Onboarding

Desktop and Android may keep debug tools, but they must not compete with the
normal product route.

Required UX rule:

- primary copy says `Add friend`, `Message`, `View profile`, and `Enter Home`
- debug copy says `Debug Home QR`, `diagnostics`, or equivalent
- direct host/port is not presented as production reachability
- Home QR is not shown as the main way to become friends

Status: in progress.

Evidence:

- Desktop and Android advanced/manual Home entry buttons now use `Enter Home`
  instead of `Join home`, matching the explicit live-room product action used
  from trusted profile detail. The old `Join home` and `Join Home` labels are
  rejected by UI source tests.

### 4. Produce Low-Cost Release Evidence

Before any physical phone proof, run:

```sh
npm test -- test/profile-friend-request-transport.test.js test/desktop-control-actions.test.js test/desktop-message-request-actions.test.js test/desktop-backend-session.test.js test/android-backend-bundle.test.js test/mobile-mlp-ui.test.js test/v1-docs-current-state.test.js
npm run lint
npm run v1:gate
```

If this fails, fix the source-level issue before using the phone.

### 5. Produce The Final Physical Proof Packet

Only after low-cost proof passes, run the desktop plus physical Android proof
from `../v1.21-cross-device-smoke.md`.

The final packet must pass:

```sh
npm run v1:proof:packet -- --output tmp/final-v1-proof.md
npm run v1:proof:check -- --file tmp/final-v1-proof.md
```

The proof must show:

- physical Profile QR scan works
- request receipt happens with Home peer count at zero
- accept and DM bootstrap happen with Home peer count at zero
- outgoing request state survives restart before acceptance
- ignored request can be allowed and resent
- Contacts and Chat both lead to the same trusted profile detail
- durable Chat survives restart
- local Treehole posts survive restart
- trusted profile recent posts are visible when available
- explicit Enter Home works after trust and descriptor delivery
- revoke blocks future access

## Done Means

- V1 has one normal add-friend path: Profile QR to profile P2P request.
- Home has no role in creating trust.
- Direct host/port is diagnostics only.
- Chat, Contacts, Profile, and Treehole work without Home entry.
- Desktop and Android expose the same product model.
- `tmp/final-v1-proof.md` passes `npm run v1:proof:check`.

## Non-Goals

- Do not start V2 media rooms.
- Do not start V3 local-service or RetroArch work.
- Do not add group chat.
- Do not add multi-device identity.
- Do not add a Home invite trust model.
