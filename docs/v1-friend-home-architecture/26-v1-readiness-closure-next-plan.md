# V1 Readiness Closure Next Plan

This is the active next plan after `25-v1-profile-route-implementation-next-plan.md`.

Use `25` for the implemented profile-route and UI parity evidence. Use this
document to finish V1 as a ready private IM product and to decide what still
blocks the final proof.

## Target

V1 should feel like a small private messenger built on P2P:

```text
Profile QR -> friend request -> accept -> Contacts / Chat / Profile posts -> explicit Home
```

Home is not part of adding a friend. Home is a later live space that a trusted
contact enters explicitly.

## Product Rules Locked For V1

- Profile QR is the only normal add-friend QR.
- Friend request delivery is profile-to-profile.
- Accept creates mutual product trust.
- Contacts is the friend list and request-state surface.
- Chat is durable private messaging.
- Profile detail is the trusted person's context surface: Message, recent posts,
  and explicit Enter Home.
- Treehole remains the owner's post surface.
- Home is an optional live room after trust.
- Debug Home QR and direct host/port are diagnostics only.

These rules are not open architecture questions for V1.

## Current Evidence

As of 2026-07-03:

- `npm run v1:gate` passed on commit
  `225ae2048792a3da8494235258af973fdf2b8bf7`.
- The gate covered lint, typecheck, platform boundaries, 963 Node tests,
  TypeScript probes, desktop bundles, Android backend Bare bundle, Expo Android
  export, and Android APK native-library checks.
- `test/final-v1-proof-check.test.js` now rejects misleading proof text such as
  `not passed`, `failed`, `not run`, and `skipped`.
- Delivered outgoing friend requests stay pending until explicit trust or accept
  state exists.
- Desktop and mobile thread avatar view models use the same resolver path.

The docs-only commit after that gate only pinned the evidence. It does not
replace a fresh full gate if code changes again.

## Remaining Work

### 1. Keep The Model Small

Do not add another invite or delivery route.

If a normal user flow still mentions Home while adding a friend, fix the copy or
the route. If a debug path is still needed, make it visibly debug-only.

### 2. Finish Product Parity

Desktop and Android must expose the same V1 product shape:

```text
Home / Chat / Contacts / Treehole
```

Expected behavior:

- Contacts row opens trusted profile detail.
- Chat row opens durable thread and can also open the same profile detail.
- Profile detail shows Message as the primary trusted action.
- Recent posts are profile context.
- Enter Home is explicit and post-trust.
- Treehole creates local posts as yourself.

### 3. Prove Profile Delivery Without Home

The final proof must show the normal path working while Home peer count is zero
at the request and accept stages:

```text
Android scans desktop Profile QR
Android sends request
Desktop receives request
Desktop accepts
Android sees trust
```

This is the key architecture proof. A run that succeeds only after entering a
Home is not a V1-ready run.

### 4. Prove The IM Loop

The same physical proof must also show:

- both sides list each other in Contacts
- both sides can open Chat
- Chat messages survive restart
- local Treehole posts survive restart
- friend Recent posts can be viewed from profile context
- Enter Home works only from a trusted profile action
- revoke blocks future access

### 5. Record The Final Packet

Generate the packet:

```sh
npm run v1:proof:packet -- --output tmp/final-v1-proof.md
```

Run the physical desktop plus Android path from `../v1.21-cross-device-smoke.md`.

Then check it:

```sh
npm run v1:proof:check -- --file tmp/final-v1-proof.md
```

V1 is not ready until this packet passes.

## Execution Order

1. Make any remaining low-cost code or copy fixes found during review.
2. Run focused tests for changed code.
3. Run `npm run v1:gate`.
4. If the gate passes, install or launch the chosen Android runtime.
5. Run the final physical proof once, with screenshots or logs for failures.
6. If proof fails, fix the smallest cause and add a low-cost regression test
   before trying the expensive proof again.

## Done Means

- No normal add-friend flow depends on Home.
- The receiver visibly gets the Profile QR friend request.
- Accept creates mutual trust.
- Contacts, Chat, and Profile agree on the same trusted person.
- Durable Chat and local Treehole state survive restart.
- Home entry is explicit and post-trust.
- revoke blocks future access.
- `tmp/final-v1-proof.md` passes the proof checker.

## Non-Goals

- Do not start V2 media rooms.
- Do not add group rooms.
- Do not solve multi-device identity.
- Do not promote Debug Home QR into normal UX.
- Do not use direct host/port as a production route.
