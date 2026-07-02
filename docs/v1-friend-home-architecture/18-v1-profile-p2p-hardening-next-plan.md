# V1 Profile P2P Hardening Next Plan

This was the active next plan after deciding that Home should have no role in
friendship delivery.

The current next plan is
`22-v1-profile-p2p-delivery-next-plan.md`. Use `22` for new V1 work. Use
this document for the evidence baseline and route-hardening context that led to
the profile-social completion plan.

The V1 product rule is:

```text
Profile is the social address.
Profile-to-profile P2P is the production delivery route.
Home is only an explicit live room after trust.
```

`17-v1-profile-routed-im-next-plan.md` locked the product model. This document
turns that model into the next implementation and proof pass.

## Decision

Kepos should not keep two normal delivery ideas.

Production V1 has one route:

```text
local profile -> target profile P2P route -> signed request / accept / DM setup
```

The production route is not:

```text
join target Home -> send request through Home control
```

It is also not:

```text
type host:port -> connect directly -> send request
```

Direct host/port can remain as diagnostics, but it is not a product fallback and
not part of the V1 user model.

## Why This Is The Right Cut

Home has been carrying too much meaning:

- a person
- a room
- a transport endpoint
- a permission boundary
- a live session

That makes the product hard to explain and hard to smoke. Adding a friend should
not depend on whether the other device has entered a room, exposed a port, or
joined the same Home transport.

The stable model is smaller:

- Profile identifies the person.
- Trust records the relationship.
- Chat carries private durable messages.
- Treehole is profile context.
- Home is a later live place to visit.

This matches the user flow we want:

```text
scan Profile QR -> send request -> accept -> Chat/Profile
trusted profile -> Enter Home
```

## Production Requirements

### Request Delivery

Required:

- Profile QR scan creates a profile request target only.
- Send request uses profile-level P2P delivery.
- Request delivery does not require Home membership.
- Request delivery does not require a Home descriptor.
- Request delivery does not require a public host/port.
- Sender state is honest: queued, searching, sent, delivered, or failed.
- Delivered means the receiver profile runtime acknowledged a valid signed
  request frame.

Forbidden in normal UX:

- auto-entering Home before sending a request
- asking the user to scan Home QR to become friends
- showing direct host/port as the way to make friend requests work

### Accept Delivery

Required:

- Accepting an incoming request creates local trust and a durable DM thread.
- Acceptance returns over the profile-level P2P route.
- Acceptance return does not require either side to be in Home.
- If acceptance return is delayed, both sides show honest pending or syncing
  state instead of pretending the other side already updated.

Forbidden in normal UX:

- treating Home entry as acceptance
- requiring Home peer count to become non-zero before accept works

### Chat Delivery

Required:

- Trusted contacts appear in Chat before the first message.
- Message is the primary action on a trusted profile.
- Normal DM body send uses the accepted DM channel.
- Normal DM body send does not use Home room chat or Home control.
- Restart preserves contacts, trusted state, threads, previews, unread state,
  and local Treehole posts.

Forbidden in normal UX:

- "enter room first" requirements for private messages
- direct endpoint fields in the normal Chat flow

### Profile And Treehole

Required:

- Contacts rows and Chat rows open the same profile detail.
- Trusted profile detail shows Message, Recent posts, Enter Home, and Remove
  friend.
- Untrusted profile detail keeps Message disabled.
- Treehole remains the place to post to yourself.
- Trusted contacts can read cached recent posts when available.

V1 can keep recent-post sync simple, but it must present posts as profile
context, not room history.

### Home

Required:

- Home remains a top-level surface with a house icon.
- Enter Home is explicit from a trusted profile or from the Home surface.
- Home QR, raw room key, and direct host/port remain Advanced/debug.
- Leaving Home does not affect friendship, Chat, request delivery, or profile
  delivery.

Home owns live session features:

- live room chat
- presence
- future listening rooms
- future watch rooms
- future game/local-service sessions

Home does not own friendship.

## Implementation Order

### Phase 1: Remove Home From Normal Request UI

Audit desktop and Android for copy and controls that imply:

- scan Home to add friend
- join Home to send request
- enter Home to accept
- direct host/port to make social delivery work

Move those controls behind Advanced or debug-only sections.

Done when the normal user path has exactly one starting point: Profile QR.

### Phase 2: Harden Profile Request Runtime

Prove in source and tests:

- profile listener starts with the local profile, not with Home entry
- request send can run while Home peer count is zero
- request receive can run while Home peer count is zero
- request acknowledgement updates ContactBook delivery state
- request delivery failures stay visible and retryable

Done when request tests fail if Home runtime is used by the normal path.

### Phase 3: Harden Accept And DM Bootstrap

Prove in source and tests:

- accept does not read Home runtime
- accept returns a signed/encrypted DM invite through the profile route
- accepted thread exists locally after accept
- recipient opens the returned invite into a durable thread
- revoked or ignored profiles cannot bootstrap a normal thread

Done when accept and DM bootstrap tests fail if Home control is required.

### Phase 4: Make Chat The Product Center After Trust

Desktop and Android should both show:

- request rows
- trusted contact rows without messages
- durable thread rows with previews
- profile detail from Chat row and Contacts row
- Message as the main trusted action

Done when a new trusted contact naturally lands in Chat without entering Home.

### Phase 5: Keep Home As A Secondary Live Room

Desktop and Android should both show:

- Home tab or surface with a house icon
- explicit Enter Home action for trusted profiles with a usable descriptor
- Advanced/debug Home QR and endpoint tools
- no friendship state changes when leaving Home

Done when Home is clearly a live space, not the social bootstrap.

### Phase 6: Final Proof Packet

Do not run high-cost phone smoke by default. Run it intentionally when the user
asks for final proof.

The final proof must show:

1. Desktop Profile QR is scannable by Android.
2. Android sends a friend request from the Profile QR path.
3. Desktop receives the request without Home entry.
4. Desktop accepts without Home entry.
5. Android receives or observes accepted trust without Home entry.
6. Both clients can open the same trusted profile detail from Chat and Contacts.
7. Message is the primary trusted action.
8. Durable Chat sends in both directions.
9. Restart keeps contacts, trusted state, Chat thread, previews, local
   Treehole posts, and recent profile context.
10. Enter Home works only as an explicit later action.

## Current Evidence Baseline

Already landed before this plan:

- shared profile view models expose relationship state
- scanned Profile QR creates a request target rather than Home entry
- trusted contacts appear in Chat before saved DM thread snapshots exist
- desktop accepted DM sends use DM runtime without reading Home runtime in the
  normal path
- Android accepted-thread DM sends dispatch `RPC_DM_BODY_SEND`, not Home chat or
  legacy `RPC_DM_SEND`
- Android backend DM body send uses `dmRuntime.sendMessage`
- Chat rows, current-thread headers, request rows, and Contacts rows route
  profile opening through the same profile detail entry point
- final proof packet requirements now check the shared profile-detail route and
  Message as the primary trusted action
- accept now reports profile-route invite delivery state on desktop and Android:
  queued/searching acceptance is shown as local accept plus waiting for profile
  delivery, sent/delivered is shown explicitly, and failed delivery is not
  hidden behind a plain accepted notice
- desktop outgoing friend requests now persist their signed request frame and
  expose a Retry action that resends over profile transport, records the latest
  delivery state in ContactBook, and stays independent of Home runtime
- mobile outgoing friend requests expose a Retry action that resends the same
  request id/text/target through `RPC_PROFILE_REQUEST_SEND`, marks the local
  delivery state queued, and stays independent of Home entry

Still open:

- physical Android/Desktop proof for request, accept, durable Chat, restart,
  profile posts, and explicit Home entry
- any UI parity fixes found by that proof
- final proof packet recording before calling V1 ready

## Non-Goals

- V2 listening rooms
- V2 watch rooms
- V3 RetroArch sessions
- public usernames or global discovery
- multi-device identity
- making direct host/port a production social route
- using Home control as a production request, accept, or DM body route
