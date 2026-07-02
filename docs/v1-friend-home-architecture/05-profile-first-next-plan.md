# Profile-First P2P Delivery Plan

This was the route-decision plan after the failed Profile QR friend request smoke.
The current execution path is:

- `12-v1-profile-first-implementation-next-plan.md` for source-level
  implementation order and low-cost proof
- `13-v1-home-decoupling-next-plan.md` for the current Home decoupling plan
- `../v1.21-cross-device-smoke.md` for the final desktop/Android release proof

## Decision

Kepos V1 should move away from Home-centric bootstrap.

Friend request delivery must be profile-to-profile P2P:

```text
fromProfileId -> toProfileId
```

It must not be:

```text
join target Home -> broadcast request over Home control
```

It must also not be:

```text
connect to host:port -> send request
```

Direct host:port is not a production path.

## Why

The smoke failure showed the current flaw:

- Android scanned desktop Profile QR.
- Android locally showed "You sent a friend request".
- Desktop showed no request.
- Both sides had zero Home peers.

The request was tied to Home peer connection. With no Home peer, there was no delivery.

That is wrong for product and architecture. Adding a friend should not depend on entering or connecting to a Home.

## Product Priority

The product hierarchy is now:

1. Profile
2. Contacts / Friends
3. Chat / DM
4. Treehole / Posts
5. Home

Home is a live space. It is lower priority than identity, contacts, chat, and posts.

Home should become:

- an explicit live room action
- a future activity/session surface
- optional after trust

Home should not be:

- required for adding a friend
- the normal request delivery channel
- the first thing users must understand
- the main tab driving the whole app

## Core Architecture Rule

Friendship, DM bootstrap, and Home entry are three separate product facts.

- Friendship is a trust relation between profiles.
- DM bootstrap is the durable private-chat route created from that trust flow.
- Home entry is an explicit live-room action after trust or activity invite.

The transport implementation can reuse low-level P2P primitives, but it must not make these product facts depend on each other.

In particular:

- adding a friend must not require joining a Home
- accepting a friend must not mean entering a Home
- Home QR must not become the normal add-friend path
- direct host:port must not become the production fallback
- delivery must be based on profile identity and signed records

## Implementation Plan

## Current Implementation Status

Phase 1 through Phase 6 are implemented or quarantined in the current branch:

- mobile Profile QR friend request sending no longer calls `enterRequestTargetHome`
- mobile friend requests no longer send `RPC_DM_SEND` through the Home backend
- mobile Profile QR scan/paste builds a request target and selects Chat; it
  does not enter Home, start the Home backend, or write ContactBook trust
- desktop message request sending no longer requires `homeRuntime.isJoined()`
- desktop message request sending no longer forwards new requests through Home control
- `src/profile-friend-request-transport.ts` owns the profile-to-profile delivery boundary
- desktop starts a profile request listener when the local profile starts
- Android starts a profile request listener after profile load, before Home entry
- Android backend can start the profile request service from `RPC_PROFILE_START`
  without joining Home
- profile request runtime can send through the target profile topic without
  opening the local inbox first
- outgoing requests are recorded as `queued`, then updated to `searching` or `sent` from transport callbacks
- outgoing request delivery state is serialized in ContactBook storage, so
  pending/searching/sent/delivered state can survive restart
- Android applies profile request delivery-state callbacks back into the
  outgoing request ContactBook and persists the update
- desktop applies profile request delivery-state callbacks back into the
  outgoing request ContactBook and persists the update
- leaving Home no longer shuts down Android profile request delivery
- accepting a friend request no longer requires Home membership on desktop or Android
- signed DM invites now travel over the same profile-level P2P topic instead of normal Home control broadcast
- desktop profile-source DM invite handling passes the current ContactBook,
  current DM session, local DM encryption key, and invite acceptance callback
  into the invite acceptance path, then persists returned ContactBook updates

- temporary Home-control request and invite compatibility paths are quarantined
  behind explicit debug fallback
- automated tests prove profile-source request accept / invite return without
  Home membership
- profile request runtime sends an explicit receiver acknowledgement, so
  `delivered` now means the target runtime received a valid signed frame
- normal request sending no longer uses `enterRequestTargetHome`
- normal request sending no longer depends on a Home descriptor
- desktop normal request actions no longer read Home runtime unless the explicit
  debug DM-body fallback is enabled for an already accepted message
- normal friend request and invite delivery no longer uses `RPC_DM_SEND` or
  Home-control request delivery

Still open:

- prove request and accept / invite delivery in cross-device smoke with Home peers at zero
- finish the final V1 release proof packet described in `../v1.21-cross-device-smoke.md`

Current execution note:

- `05` records the route decision.
- `07` records the Home-control fallback quarantine and delivery-ack work.
- `11` records the current V1 profile-first IM product model.
- `12` owns the active V1 profile-first implementation plan.
- `13` owns the current Home decoupling next plan.
- `../v1.21-cross-device-smoke.md` owns the final release proof packet.

The current product behavior is intentionally honest: a request can be queued or searching locally without claiming the other side received it.

### Phase 1: Stop Treating Home As Friend Request Delivery

Change tests and docs so they expect this:

- Profile QR creates a request target.
- Sending request does not call `enterRequestTargetHome`.
- Sending request does not require a Home descriptor.
- Sending request can enter local pending/retrying state.

Keep the current Home-based path only behind a clearly marked temporary function until replaced.

### Phase 2: Add Profile-Level Request Transport Boundary

Create a shared module:

```ts
sendProfileFriendRequest({
  localProfile,
  request,
  targetProfileId,
  transport
})
```

The first implementation can be simple, but the boundary must be correct:

- input is profile-to-profile
- output is delivery state
- no Home join
- no direct host:port

Suggested states:

- `queued`
- `searching`
- `sent`
- `delivered` when acknowledgement exists
- `accepted`
- `failed`

### Phase 3: Choose The P2P Route

Use a profile-level P2P route.

V1 choice:

1. Profile request topic
   - deterministic topic from target profile public key and protocol salt
   - receiver listens on its own profile request topic
   - sender joins the target profile request topic
   - sender writes signed request frames
   - receiver verifies signature, target profile id, and duplicate request id before showing the request

Rejected for current V1:

2. Profile inbox feed
   - target advertises an inbox discovery key in Profile QR
   - sender appends or sends encrypted request
   - receiver syncs inbox
   - useful later if we want offline-ish request persistence, but it is more state to design now

3. DM-bootstrap-like request channel
   - QR carries enough signed bootstrap material
   - sender and receiver derive a request channel
   - accept returns DM invite
   - likely a good future shape after the request topic path proves the product model

The route must satisfy:

- no public IP requirement
- no manual host/port
- no Home dependency
- signed request verification
- retry when target is not currently reachable

### Phase 4: Make Pending Honest

Android and desktop must stop showing "sent" as if desktop received it.

Use precise states:

- "Request pending" means local request exists and delivery is still trying.
- "Request sent" means the transport accepted it.
- "Request delivered" means receiver acknowledged it.
- "Friend" means accept completed.

`delivered` is transport proof only. It must not be presented as friendship or
acceptance.

### Phase 5: Refactor UI Around Profile

Navigation priority:

- Chat
- Contacts
- Treehole / Profile posts
- Home / Live

Possible V1 adjustment:

- make Chat or Contacts the first useful screen
- move Home status lower
- keep "Open my Home" away from the primary add-friend path
- keep Home QR in Advanced

The user should experience Kepos as private IM plus personal space, not as a room-join tool.

### Phase 6: Remove Home-Based Request Path

Status: implemented for the normal path; remaining work is release proof.

- delete automatic `enterRequestTargetHome` from request sending
- remove Home descriptor requirement for friend requests
- keep Home descriptor only for explicit Enter Home
- remove `RPC_DM_SEND` or Home-control request delivery from the normal add-friend path
- update smoke to check Profile QR request delivery without Home peer connection

## What This Means For Home

Home stays in V1, but its importance is reduced.

Home should be:

- a live room owned by the profile
- a place for room chat, presence, and later activities
- entered from a trusted contact/profile page

Home should not be:

- required for scanning a profile
- required for sending a friend request
- required for seeing a contact in the list
- the mental model for DM

This keeps the product closer to private IM plus personal space, not a room-join tool.

## Smoke Bar After Refactor

The core smoke should pass with Home closed or disconnected:

1. Desktop shows Profile QR.
2. Android scans Profile QR.
3. Android sends friend request.
4. Desktop receives pending request through profile-level P2P.
5. Desktop accepts.
6. Both sides show contact/friend.
7. DM thread works.
8. Enter Home is tested separately.

If Home peer count is zero, add-friend should still work or honestly remain pending/retrying. It must not silently fail.

## Non-Goals

- Do not add direct host:port to Profile QR.
- Do not make Home QR a normal add-friend path.
- Do not make users choose transport.
- Do not build a global account server.
- Do not make Home the product center.
