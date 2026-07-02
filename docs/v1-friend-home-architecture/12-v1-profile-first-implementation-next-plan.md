# V1 Profile-First Implementation Next Plan

This is the active V1 execution plan after the product model settled:

```text
Profile creates trust.
Chat carries durable private messages.
Home is an explicit live room after trust.
```

`11-v1-profile-first-im-next-plan.md` is the product model. This file is the
implementation plan from here to a ready V1.

## Goal

Make Kepos feel like a small private IM built on P2P infrastructure.

The release path must be:

```text
show profile QR -> scan -> send friend request -> accept -> chat -> profile posts -> enter Home if wanted
```

No normal user path should explain friendship as joining a Home.

## Non-Negotiable Rules

- Friend request delivery is profile-to-profile P2P delivery.
- Home is not authorization.
- Home is not normal friend-request delivery.
- Home is not normal DM delivery.
- Direct host:port is diagnostics only.
- Home QR and raw Home keys are advanced/debug surfaces.
- Chat is the durable private channel.
- Treehole is the user's own durable post surface.
- Profile is the place where trust state, messages, posts, and explicit Home
  entry meet.

## Current Source-Level State

Already in source:

- Desktop and Android start from Contacts / people-first surfaces.
- Profile QR is the normal product share surface.
- Android startup copy says `Show My QR` or add a friend.
- Contacts can show trusted friends, incoming requests, outgoing requests,
  ignored profiles, and removed profiles.
- Android request cards can open profile detail.
- Chat can show trusted threads and request-like rows.
- Debug Home paths are no longer the main copy path.
- Final proof packet starts from Profile QR instead of Home entry.
- Profile request transport can send through the target profile topic without
  opening the local inbox first, which keeps request sending independent from
  Home entry and local room lifecycle.
- Android backend starts the profile request service from `RPC_PROFILE_START`
  without joining Home.
- Android persists profile request delivery-state callbacks into the outgoing
  request ContactBook.
- Desktop persists profile request delivery-state callbacks into the outgoing
  request ContactBook.
- Desktop normal request actions do not read Home runtime; Home is touched only
  for Home chat or explicit debug fallback.
- Desktop profile-source DM invite handling routes through the local invite
  acceptance context with the current ContactBook, DM session, local DM key, and
  persisted ContactBook result.
- Android accepted profile-level DM thread/invite state promotes the outgoing
  request into trusted ContactBook state, updates Treehole policy, and persists
  the result.

This is enough to stop redesigning the model. The remaining work is proof and
small fixes found by proof.

## Work Order

### 1. Lock The Product Language

Acceptance:

- Normal copy says `friend`, `request`, `profile`, `chat`, and `posts`.
- Normal copy does not say adding a friend requires Home.
- Home copy says `live room`, `enter`, or `activity`, not authorization.
- Advanced/debug copy clearly labels Home QR, raw Home keys, and host:port as
  diagnostics or manual transport.

Verification:

- Focused copy tests.
- Docs current-state tests.
- No physical phone smoke unless the copy cannot be judged from source.

### 2. Prove Request Delivery Without Home

Acceptance:

- Sending a friend request targets the scanned profile identity.
- Receiving a friend request does not require entering the requester's Home.
- Accepting a friend request returns trust/accept state through profile-level
  delivery.
- Home peer count may stay zero through request receipt and accept.
- Outgoing request state survives restart.

Verification:

- Unit or integration tests around profile request transport.
- Desktop and Android action tests showing the normal buttons use the same
  product path.
- One final physical cross-device proof later, not repeated during each small
  source change.

### 3. Make Chat The Only Normal Private Message Path

Acceptance:

- Trusted peers can open the same durable Chat thread from Chat and Profile.
- Messages sent from either entry point land in the same thread.
- Chat rows update with latest preview.
- Messages survive restart.
- No normal private message body is broadcast through Home room chat.

Verification:

- DM thread, DM replication, storage, desktop action, and Android UI tests.
- Debug Home DM fallback remains disabled unless explicitly enabled.

### 4. Finish Profile As The Hub

Acceptance:

- A trusted profile shows relationship state, `Message`, `Recent posts`, and
  `Enter Home`.
- Incoming, outgoing, ignored, and removed profiles have clear profile-level
  actions.
- `Message` opens Chat.
- `Recent posts` is profile context, not room history.
- `Enter Home` is separate and only useful after trust.

Verification:

- Desktop and Android profile rendering tests.
- Cross-device proof checks recent posts only after trust.

### 5. Keep Home Small

Acceptance:

- Home remains a live room for room chat and later activities.
- Home entry starts from a trusted profile or explicit Home action.
- Home does not appear as the default empty-state answer for adding friends.
- Home QR/raw key/manual host controls stay behind Advanced.

Verification:

- UI copy tests.
- Smoke guide and proof packet mention Home only after trust.

### 6. Run One Final Release Proof

Run this only when source-level evidence is ready and the user intentionally
gives phone time.

Required proof:

1. Desktop and Android start on Contacts or Start, not Home.
2. Desktop shows Profile QR.
3. Android scans it.
4. Android sends a friend request.
5. Desktop receives it while Home peer count may be zero.
6. Android restart preserves outgoing pending request.
7. Desktop ignores once, then allows requests.
8. Android sends again.
9. Desktop accepts.
10. Both sides show each other in Contacts.
11. Chat works both ways.
12. Chat survives restart.
13. Desktop posts to Treehole.
14. Android opens desktop profile and sees Recent posts when available.
15. Android enters desktop Home explicitly after trust.
16. Desktop revokes Android.
17. Android cannot use the old trust path for future Home/Chat access.

The output is `tmp/final-v1-proof.md`, generated by:

```sh
npm run v1:proof:packet -- --output tmp/final-v1-proof.md
```

## What To Do Next In Code

1. Search for remaining normal-path Home/add-friend coupling.
2. Add or strengthen focused tests where the proof is still only documented.
3. Fix source gaps before running phone smoke.
4. Run `npm run lint` and targeted tests after each batch.
5. Run `npm run v1:gate` before final release proof.

Good first searches:

```sh
rg -n "friend request|Home control|host:port|direct|Enter Home|Profile QR" src mobile desktop test docs --glob '!desktop/tailwind.css' --glob '!**/*bundle*'
```

## Done Means

V1 is done when a normal user can understand and complete this sentence on
desktop and Android:

```text
I scan your profile, send a request, you accept, then we can chat, see profile
context, and enter Home only when we choose the live-room action.
```

If adding a friend still depends on Home entry, raw keys, direct host:port, or
debug delivery, V1 is not ready.
