# V1 Profile-Routed IM Next Plan

This is the active V1 plan after rechecking the confusing phone smoke paths.

The product rule is now final for V1:

```text
Friendship, requests, Chat, and profile posts are profile-routed.
Home is an optional live room after trust, not part of becoming friends.
```

V1 is not ready until desktop and Android both follow that rule in source,
copy, and real user paths.

## Why This Plan Exists

The current confusion is structural, not just visual:

- sending a friend request still feels related to Home entry
- accepting a request still feels like it may depend on Home membership
- profile, contact, Chat, Treehole, and Home are not always presented in the
  same order on desktop and Android
- debug transport concepts still leak into normal UX

The right mental model is simpler:

```text
scan Profile QR -> send request -> accept -> trusted contact -> Chat/Profile
```

Home comes later:

```text
trusted contact -> Enter Home
```

## Product Invariants

### One Profile, One Social Address

Each device has one profile. That profile is the user-facing social address.

Profile owns:

- identity and signing key
- display name and avatar snapshot
- Profile QR
- friend request target
- DM eligibility
- recent Treehole/profile context
- optional signed Home descriptor

### Friendship Is Profile Trust

Friendship is mutual profile trust after an accepted request.

It is not:

- Home membership
- possession of a Home key
- direct host/port reachability
- a room join side effect

Either side can revoke locally. Revoke stops future access and future delivery;
it does not erase data already replicated to the other side.

### Chat Is The Primary Trust Result

After a request is accepted, the obvious next action must be Message.

Chat owns:

- request rows
- trusted contact rows
- durable pairwise message threads
- unread state
- last-message preview
- restart persistence

Opening Chat must not enter Home.

### Profile Is The Person Hub

Contacts and Chat rows should open the same profile detail.

Trusted profile detail owns:

- Message
- Recent posts
- Enter Home, when a usable Home descriptor exists
- Remove friend
- advanced identity details

Untrusted or request-target profile detail may show request state, but must not
enable Message.

### Treehole Is Profile Context

Treehole remains the place to post to yourself.

Trusted contacts can see cached recent posts when available. In V1 this can be
simple and cache-led; it should still be presented as profile context, not room
history.

### Home Is A Live Space

Home owns:

- live room chat
- live presence
- later watch, listen, game, and local-service sessions

Home does not own:

- friend request authorization
- friend request delivery
- accept delivery
- durable DM delivery
- profile posts

Home entry is always explicit.

## Delivery Architecture

V1 production delivery has one product route:

```text
profile-to-profile P2P delivery
```

Direct host/port and Home-control fallbacks may remain only as hidden debug or
legacy compatibility surfaces. They must not be required by the normal add
friend or Chat path.

Required production behavior:

- Profile QR scan creates a profile request target, not a Home target.
- Sending a friend request uses the target profile route.
- Receiving a friend request does not require joining the sender's Home.
- Accepting a friend request returns acceptance over the profile route.
- Durable DM bootstrap uses ContactBook/profile state.
- Durable DM sends do not use Home room chat in the normal path.
- Home peer count may stay zero during request and accept.

## V1 User Flows

### Add A Friend

1. A opens My QR.
2. B scans A's Profile QR.
3. B sees A as a profile request target.
4. B sends a friend request.
5. A sees the request in Contacts and/or Chat.
6. A accepts or ignores.
7. Both sides store trusted contacts after accept.
8. Message becomes the primary action.

No step says "join Home".

### Send A Private Message

1. User opens Chat.
2. User selects a trusted contact row.
3. User sends a message.
4. Message is stored in the durable pairwise thread.
5. Restart keeps the thread and last preview.

No step enters Home or sends room chat.

### View A Profile

1. User opens Contacts or Chat.
2. User taps a person.
3. Profile detail shows relationship state.
4. Trusted profile detail shows Message, Recent posts, and Enter Home when
   available.

Profile is the stable person view. Home is only one action from that view.

### Enter Home

1. User opens a trusted profile.
2. User taps Enter Home.
3. Kepos checks the signed Home descriptor and local trust.
4. Kepos enters that live Home room.

Leaving Home does not affect friendship or Chat.

## Implementation Plan

### Phase 1: Lock The Shared Product Model

Required:

- shared view models define relationship state for request target, incoming
  request, outgoing request, trusted, ignored, removed, and blocked
- desktop and Android use the same action labels for Message, Enter Home,
  Accept, Ignore, Allow requests, Remove friend, and Recent posts
- Home wording is removed from normal add-friend copy
- debug transport controls stay behind Advanced/debug surfaces

Done when:

- the same state produces the same visible product decision on desktop and
  Android
- no normal add-friend copy says or implies Home entry

### Phase 2: Prove Profile-Routed Requests

Required:

- Profile QR scan/paste creates a request target only
- request send does not call Home entry
- request accept does not require Home membership
- accept return uses profile-level delivery
- outgoing and incoming request rows are visible without raw debug controls

Done when:

- source/tests prove Home peer count can stay zero during request and accept
- physical desktop/Android smoke proves request and accept work without a Home
  join

### Phase 3: Make Chat The Default After Trust

Required:

- accepted trusted contacts appear in Chat even without prior messages
- Chat rows show last-message preview when a message exists
- opening a Chat row opens the durable DM thread
- normal DM send does not call Home room chat
- restart keeps the durable thread, preview, and unread state

Done when:

- after accept, the natural next action is Message
- Enter Home is clearly secondary and explicit

### Phase 4: Finish Profile Detail As The Person Hub

Required:

- Contacts rows open profile detail
- Chat rows open the same profile detail
- incoming request detail can Accept or Ignore
- ignored/removed detail can Allow requests
- trusted detail exposes Message, Recent posts, Enter Home, Remove friend, and
  Advanced identity
- untrusted/request/blocked detail keeps Message disabled

Done when:

- desktop and Android expose the same profile actions from shared state
- request recovery is visible without raw debug controls

### Phase 5: Keep Treehole Personal

Required:

- local Treehole remains the place to post to yourself
- profile detail can show cached recent posts for trusted contacts
- room chat never becomes Treehole content
- Recent posts refresh, if available, goes through checked explicit Home entry
  rather than silent Home entry

Done when:

- posts read as profile context, not room history

### Phase 6: Demote Home To Explicit Live Room

Required:

- Home remains a top-level surface with a house icon
- Enter Home is visible from trusted profile detail when allowed
- Home QR, raw room key, direct host/port, and low-level transport controls are
  Advanced/debug only
- leaving Home does not affect friendship, Chat, or profile delivery

Done when:

- a user can understand Home as "visit this person's live space", not "set up
  friendship"

### Phase 7: Final V1 Proof

Automated proof:

- shared product-surface tests pass
- profile scan does not create a Home target
- request send does not enter Home
- request accept does not require Home
- accept return uses profile-level delivery
- normal DM send does not use Home room chat
- restart persistence tests cover profile, contacts, Treehole, and durable Chat
- `npm run v1:gate` passes

Manual proof, run intentionally:

1. Desktop shows Profile QR.
2. Android scans desktop Profile QR.
3. Android sends friend request.
4. Desktop receives the request while Home peer count may stay zero.
5. Desktop accepts.
6. Android shows desktop as trusted.
7. Both sides can open Chat and send durable messages.
8. Restart keeps profile, contact, Treehole, and durable Chat state.
9. Profile detail shows recent posts when available.
10. Enter Home works only as a later explicit action.

## Current Source-Level Progress

Already landed before this plan:

- shared profile view models expose `relationshipState`
- scanned request-target profiles are explicitly marked as `request_target`
- desktop and Android profile detail can Accept / Ignore incoming requests
- desktop and Android profile detail can Allow requests for ignored or removed
  profiles
- trusted profile detail keeps Message enabled
- untrusted, request, and blocked profiles keep Message disabled
- accepted trusted contacts appear in Chat before a saved DM thread snapshot
  exists
- empty trusted-contact Chat rows show `No messages yet`
- existing DM thread snapshots and request rows take priority over synthetic
  trusted-contact rows
- desktop accepted DM sends use the DM runtime without reading Home runtime in
  the normal path
- Android accepted-thread DM sends dispatch `RPC_DM_BODY_SEND`, not Home chat,
  legacy `RPC_DM_SEND`, or profile request send
- Android backend DM body send uses `dmRuntime.sendMessage`; Home-carried DM
  body broadcast remains gated by the explicit debug fallback flag
- Android Chat thread rows now select threads by profile id directly and mark
  that profile's durable thread read, avoiding legacy `remoteProfileId` wrapper
  semantics in the UI callback

Still open:

- finish physical Android/Desktop smoke for Profile QR request and accept
- fix any mobile UI parity gaps found during that smoke
- record the final proof packet before calling V1 ready

## Non-Goals

- V2 listening room
- V2 watch room
- V3 RetroArch sessions
- multi-device account linking
- public usernames or global discovery
- making direct host/port a production route
