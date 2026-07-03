# V1 Profile P2P Delivery Closure Next Plan

This is the active next plan after
`33-v1-profile-dm-only-social-next-plan.md`.

The current decision is strict:

```text
Profile P2P delivery is the only production social route.
Home is not involved in adding friends.
Direct host:port is not a production fallback.
```

Kepos V1 should finish as a private IM built on profile identity, mutual trust,
durable Chat, personal Treehole posts, and explicit post-trust Home entry.

## Product Model

The normal product path is:

```text
Profile QR -> friend request -> accept -> Contact -> Chat / Profile posts
```

The optional live/session path is:

```text
trusted Contact -> Profile detail -> Enter Home
```

Adding a friend means creating mutual trust between two profiles. It must not
mean joining the other user's Home, connecting to a raw host:port, or
bootstrapping through a room transport.

## Delivery Decision

Production friend request, accept, DM bootstrap, Chat, and profile post delivery
should use profile-to-profile P2P routes.

The profile route can reuse the same low-level P2P stack that powers Home, but
the product and API boundary must be profile based:

- route by `fromProfileId` and `toProfileId`
- sign every trust, request, invite, and message record
- persist delivery state in the profile/contact/DM model
- treat queueing/searching/sent/delivered as profile delivery states
- keep Home runtime state out of the normal social path

## Direct Mode Decision

Direct host:port is abandoned as a production path.

It may remain only as diagnostics, local developer support, explicitly labeled
advanced/debug UI, or test harness plumbing when it is not presented as product
behavior.

It must not be used as normal friend request delivery, normal accept delivery,
normal DM bootstrap, normal Chat send, normal Profile QR behavior, or fallback
copy shown to users when profile P2P is not ready.

## Home Decision

Home is a trusted live/session surface.

Home can support live room chat, future watch/listening/game sessions,
post-trust activity invites, and post-trust Home descriptor exchange.

Home must not support add-friend bootstrap, friend request authorization, accept
authorization, production DM bootstrap, hidden fallback for normal private
messaging, or user-facing pressure to scan a Home QR before friendship exists.

## Required V1 Completion Work

### 1. Finish The Product Vocabulary Pass

Desktop and Android should expose the same primary surfaces:

```text
Home / Chat / Contacts / Treehole
```

Meaning:

- Contacts is where requests, trusted people, and profile detail live.
- Chat is durable pairwise private messaging.
- Treehole is the local user's personal post surface.
- Profile detail shows Message, recent posts, and explicit Enter Home.
- Home is a live room/session after trust.

Any visible wording that implies "DM", "Direct", raw room keys, raw host:port,
or Home join as the normal social path should be moved to debug/advanced
surfaces or rewritten.

### 2. Finish The Route Audit

Search for remaining normal social code paths that read:

- `homeReady`
- `homeRoomKey`
- `homeRuntime.isJoined()`
- Home peer count
- Home descriptors before trust
- Home-control request or invite broadcast
- direct host:port fallback

Patch only real product leaks. These checks are still valid for Home chat,
manual Home entry, Debug Home QR, diagnostics, and explicit Enter Home.

### 3. Add Low-Cost Regression Proof

Automated proof should fail if old coupling returns:

- Profile QR embeds a Home descriptor.
- friend request send requires Home readiness.
- request accept requires Home membership.
- DM bootstrap uses normal Home control broadcast.
- Chat send reads Home runtime state.
- Treehole owner post requires Home entry.
- Profile detail recent posts require Home entry.
- direct host:port appears as production fallback.
- Android and desktop diverge on the four primary surfaces.

Suggested gate before phone smoke:

```sh
npm test -- test/v1-docs-current-state.test.js test/product-surfaces.test.js test/mobile-mlp-ui.test.js test/desktop-mlp-shell.test.js test/profile-friend-request-transport.test.js test/desktop-message-request-actions.test.js test/desktop-message-actions.test.js test/android-backend-bundle.test.js
npm run lint
npm run v1:gate
```

### 4. Run Final Physical Proof Last

Do not spend physical phone time until source-level routing and UI vocabulary
are clean.

The final proof still writes:

```sh
tmp/final-v1-proof.md
```

and must pass:

```sh
npm run v1:proof:check -- --file tmp/final-v1-proof.md
```

It must prove:

- physical Profile QR scan sends a friend request
- receiver sees the request without entering Home
- accept creates trust without entering Home
- Chat works without entering Home
- Treehole local posts work without entering Home
- durable Chat and Treehole state survive restart
- Profile detail can show trusted recent posts when available
- Enter Home is explicit and post-trust
- direct host:port is not needed for the normal path
- revoke blocks future access

## Current Status

Already implemented before this plan:

- Profile QR and Debug Home QR are separated on Android.
- Profile QR does not carry `homeRoom` or depend on `homeRoomKey`.
- Android can start the profile backend and profile-scoped Treehole without
  joining Home.
- Android restores the local profile Treehole owner after leaving a remote Home.
- Desktop and Android primary surfaces already share the same
  `Home / Chat / Contacts / Treehole` tab model.
- Desktop and Android default into Contacts/people-oriented entry state.
- Home-control request and invite compatibility paths are quarantined behind
  explicit debug fallback.

Still open:

- finish the visible wording audit for Direct/DM/Home/host-port leaks
- patch any remaining real product leaks found by the route audit
- confirm Android reachable states match desktop for Contacts, Chat, Profile
  detail, Treehole, and explicit Home entry
- produce the final physical desktop/Android proof packet

## Stop Rule

V1 is not ready until the final physical proof exists and passes:

```sh
npm run v1:proof:check -- --file tmp/final-v1-proof.md
```

Until then, the right status is:

```text
profile P2P route is the target; source-level cleanup continues; release proof still open
```
