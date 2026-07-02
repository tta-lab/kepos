# Profile-First Next Plan

This is the next implementation plan after the failed Profile QR friend request smoke.

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

## Implementation Plan

## Current Implementation Status

Phase 1 and the boundary part of Phase 2 are implemented:

- mobile Profile QR friend request sending no longer calls `enterRequestTargetHome`
- mobile friend requests no longer send `RPC_DM_SEND` through the Home backend
- desktop message request sending no longer requires `homeRuntime.isJoined()`
- desktop message request sending no longer forwards new requests through Home control
- `src/profile-friend-request-transport.ts` owns the profile-to-profile delivery boundary
- outgoing requests are recorded as `queued` and shown as "Request pending" until a real transport accepts or acknowledges them

Still open:

- connect the profile-level P2P route
- update delivery state after transport progress
- add receiver-side profile request listening
- remove the temporary Home-control request path after the profile route handles real delivery

The current product behavior is intentionally honest: a request can be queued locally without claiming the other side received it.

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

Use a profile-level P2P route. Candidate shapes:

1. Profile request topic
   - deterministic topic from target profile public key and protocol salt
   - receiver listens on its profile request topic
   - sender connects and writes signed request

2. Profile inbox feed
   - target advertises an inbox discovery key in Profile QR
   - sender appends or sends encrypted request
   - receiver syncs inbox

3. DM-bootstrap-like request channel
   - QR carries enough signed bootstrap material
   - sender and receiver derive a request channel
   - accept returns DM invite

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

If V1 cannot implement delivered ack yet, avoid delivered wording.

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

After profile-level delivery works:

- delete automatic `enterRequestTargetHome` from request sending
- remove Home descriptor requirement for friend requests
- keep Home descriptor only for explicit Enter Home
- update smoke to check Profile QR request delivery without Home peer connection

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
