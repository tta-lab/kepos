# V1 Profile Route Implementation Next Plan

This is the active next plan after `24-v1-release-proof-next-plan.md`.

Use `23-v1-social-delivery-release-plan.md` as the product-rule baseline and
`24-v1-release-proof-next-plan.md` as the final proof bar. This document is the
implementation bridge between them: fix the route model first, then run the
release proof.

## Target

Ship V1 as one coherent private IM product:

```text
Profile QR -> friend request -> mutual trust -> Contacts / Chat / Profile posts -> explicit Home
```

The user should not need to understand Home to add a friend. Home is a live
space after trust. It is not the friend request route, not the authorization
object, and not the primary DM transport in the product model.

## Why This Exists

Recent phone smoke showed the remaining risk clearly:

- Android and desktop can drift into different product logic.
- The UI can still expose Home as if it were a second add-friend model.
- A scanned Profile QR may look accepted locally while the other side does not
  show the request.
- Friend request delivery can be confused with entering the other person's
  Home.

That is too much ambiguity for a V1 IM product. The next pass must reduce the
model, not add more paths.

## Product Rules

- There is one normal add-friend path: scan Profile QR, send request, accept.
- Trust is profile-to-profile and mutual at the product level.
- Either side may revoke trust.
- Contacts is the friend list.
- Chat is the durable private message surface.
- Profile is the trusted person's context surface: message, recent posts, and
  explicit Enter Home.
- Treehole stays as the owner's durable post surface.
- Home entry is manual and post-trust.
- Home peer count must stay zero during normal friend request and accept proof.
- Debug Home QR may exist only as an advanced/debug descriptor.
- Direct host:port is diagnostics only.

## Architecture Rules

- Profile-to-profile P2P is the production social delivery route.
- Friend request, accept, DM bootstrap, and durable Chat must not depend on
  Home control traffic.
- Desktop and Android must call the same shared product/domain logic for:
  - QR payload interpretation
  - friend request state
  - trust state
  - contact list rows
  - Chat thread selection
  - profile actions
  - Treehole/recent-post policy
- Platform code should only own rendering, camera/scanner, storage adapters,
  process/runtime glue, and small native affordances.
- If a route is debug-only, its name and copy must say so.

## Work Order

## Current Non-Device Evidence

As of 2026-07-03 on commit `225ae2048792a3da8494235258af973fdf2b8bf7`,
the non-device release gate passes:

```sh
npm run v1:gate
```

This proves lint, typecheck, platform boundaries, 963 Node tests, TypeScript
compatibility probes, desktop bundles, Android backend Bare bundle, Expo
Android export, and Android APK native-library checks for the current source
shape.

It does not replace the final physical proof. V1 is still not complete until
`../v1.21-cross-device-smoke.md` records a real desktop/Android Profile QR
request, accept/invite return with Home peer counts at zero, durable Chat,
restart persistence, Treehole persistence, explicit Enter Home, and revoke.

### 1. Route Audit

Search source and tests for any normal path that still treats Home as the
friendship route.

Fix or quarantine these cases:

- Home QR shown as a normal invite.
- profile scan followed by implicit Home entry.
- friend request delivery through Home control traffic in production UI.
- accept/DM bootstrap that requires Home peers.
- optimistic request UI that does not match remote receipt.

### 2. Shared Product Logic

Move duplicated desktop/mobile decisions into shared TypeScript modules when the
logic is product or protocol logic.

The shared model should answer:

- what scanned payload means
- whether the primary action is Add friend, Message, View profile, or Enter Home
- whether a contact row is pending, accepted, failed, or revoked
- which profile actions are visible after trust
- how Recent posts are shown as profile context

Do not create re-export compatibility files. Update imports directly.

### 3. UI Parity

Desktop and Android should expose the same main product shape:

```text
Home / Chat / Contacts / Treehole
```

Expected behavior:

- Contacts shows friend rows and request state.
- Chat shows trusted peers and last-message preview.
- opening a Chat row opens durable DM.
- opening a Contact row opens the same profile detail.
- profile detail has Message, Recent posts, and explicit Enter Home.
- Treehole is for posting as yourself.
- Debug Home controls are not part of the normal social path.

### 4. Delivery Proof Before Manual Smoke

Before expensive phone smoke, add or keep low-cost tests proving:

- Profile QR friend request target is generated.
- friend request send uses profile route, not Home route.
- accept returns over the profile route.
- DM bootstrap uses profile/DM delivery.
- request and accept can be modeled with Home peer count zero.
- desktop and Android view models agree on labels and primary actions.

### 5. Final Physical Proof

Only after the route and UI are coherent, run the final cross-device packet from
`../v1.21-cross-device-smoke.md`:

```sh
npm run v1:proof:packet -- --output tmp/final-v1-proof.md
```

The required user path is:

```text
desktop Profile QR -> Android request -> desktop receives request -> desktop accepts
-> Android sees trust -> durable Chat -> restart -> Treehole persistence
-> explicit Enter Home -> revoke
```

Then check:

```sh
npm run v1:proof:check -- --file tmp/final-v1-proof.md
```

## Done Means

- Normal add friend works from Profile QR without entering Home.
- The receiver visibly gets the request.
- Accept creates mutual trust and both sides show each other in Contacts.
- Chat appears as the primary trusted action.
- Durable DM survives restart.
- local Treehole posts survive restart.
- Profile Recent posts are context, not hidden Home entry.
- Enter Home is explicit and post-trust.
- revoke blocks future access.
- desktop and Android use one product model.
- the final proof packet passes.

## Non-Goals

- Do not start V2 media rooms in this pass.
- Do not add another invite model.
- Do not promote Home QR back into normal social UX.
- Do not rely on direct host:port as a production fallback.
- Do not solve multi-device identity.
- Do not expand Home into a group product before one-to-one IM is clean.
