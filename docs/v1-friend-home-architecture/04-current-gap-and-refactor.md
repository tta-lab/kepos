# Historical Gap And Refactor Plan

## Historical State

This document records the Home-coupled V1 gap that triggered the profile-first
refactor. It is kept as history and as a guardrail: do not rebuild this shape.

What previously happened on Android:

1. Scan Profile QR.
2. Build a friend request target.
3. When sending the request, enter the target's Home from the QR Home descriptor if needed.
4. Wait for backend `joined`.
5. Send the signed friend request through the Home control channel.
6. Backend caches pending outgoing requests and resends them when a new Home peer appears.

This fixed a real bug:

- before, the phone could locally record "sent" while desktop received nothing
- now, request sending waits for Home readiness and resends when peer connection arrives

But it was still not the clean target architecture.

Smoke result:

- Android showed "You sent a friend request".
- Desktop showed no incoming request.
- Both sides showed zero Home peers.
- Therefore the request was locally recorded but had no working profile-level delivery path.

This confirmed the architecture problem. The fix was not direct host:port. The fix was removing Home from friend request delivery.

## Current State

The production path has moved to profile-level request delivery:

- Android normal friend request send uses `RPC_PROFILE_REQUEST_SEND`.
- Desktop outgoing request send uses the profile request runtime.
- Desktop and Android listen for profile-level request frames outside Home entry.
- Accepting a friend request can return the signed invite over the profile route.
- Home-control request and invite handling is ignored by default unless an explicit debug fallback is enabled.

The remaining gap is proof and polish, not the old product model:

- final manual desktop/Android proof still needs to show request receipt and accept while Home peer count may stay at zero
- the UI still needs to present Chat, Contacts, Profile, Treehole, and explicit Home entry as one coherent IM product

## Why It Feels Wrong

Because the implementation path says:

> To add B as a friend, A must enter B's Home.

The product model should say:

> To add B as a friend, A sends B a signed friend request.

The Home join is the wrong packet route for production. When that packet route leaks into UI copy, tests, and docs, the product becomes hard to reason about.

## Target Rule

No primary UI flow should require the user to understand Home as part of adding a friend.

Allowed internal implementation:

- use profile-level P2P topics, inboxes, feeds, or request channels
- keep local pending/retry state
- use signed records for request, accept, and DM invite

Not allowed as product semantics:

- "join Home to become friends"
- "Home QR is the normal add-friend path"
- "trust means currently inside a Home"
- "type this host:port to become friends"

## Refactor Direction

### Step 1: Rename Product Concepts In Code

Keep transport names where they are true, but product-facing modules should say:

- `FriendRequestTarget`, not `HomeRequestTarget`
- `sendFriendRequest`, not `joinHomeForRequest`
- `ContactProfile`, not `HomeContact`
- `enterHome`, only for explicit Home entry

Old helper names like `enterRequestTargetHome` were honest about the historical implementation, but they should not spread into product-facing code.

### Step 2: Create A Profile-Level Friend Request Delivery Service

Introduce a small service boundary:

```ts
sendFriendRequest({
  request,
  targetProfile,
  deliveryHints
})
```

`deliveryHints` may include:

- profile inbox topic/feed
- cached P2P peer route
- future relay/bootstrap hints

The caller should not care which P2P route succeeds. Home and direct host:port should not be part of the production delivery contract.

### Step 3: Make Delivery State Explicit

Separate these states:

- draft target selected
- local request queued
- request sent to transport
- request delivered or seen, if acknowledgement exists
- accepted
- ignored
- failed or retrying

V1 can implement only a subset, but the model should be explicit.

### Step 4: Remove Home Transport From Friend Request Delivery

Delete or quarantine this shape:

```ts
homeControlFriendRequestTransport.deliver(request, homeDescriptor)
```

Replace it with:

```ts
profileFriendRequestTransport.deliver(request, targetProfileId)
```

The product flow remains stable.

### Step 5: Align Desktop And Android

Both clients should use the same product logic:

- Profile QR parse
- request target view model
- contact book update
- trust accept/revoke
- DM thread creation
- Home entry from trusted contact

Platform code should only handle:

- UI components
- local storage adapter
- camera / QR scanner adapter
- backend process/worklet adapter

## V1 Acceptance Bar

The V1 architecture is clean enough when these statements are true:

- Adding a friend is documented and tested as a person-first flow.
- Home entry is documented and tested as an explicit session action.
- Friend request delivery is not named or presented as Home entry.
- Home control delivery is not used for friend request production flow.
- Direct host:port is not used for friend request production flow.
- A request cannot silently appear sent if there is no viable delivery path.
- Desktop and Android share the same product state machine as much as the platform allows.

## Short-Term Practical Decision

Do not extend the historical Home-based reliability fix.

It was useful because it proved the silent-loss class of bug. But it should be treated as evidence for the refactor:

- stop adding features to Home-based friend request delivery
- do not add direct endpoint to Profile QR
- implement profile-level P2P request delivery next
- then remove the Home join step from the add-friend path
