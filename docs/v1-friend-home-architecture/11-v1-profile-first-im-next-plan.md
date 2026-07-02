# V1 Profile-First IM Next Plan

This is the V1 product model after the Home/add-friend model was rechecked.
The current active implementation plan is
`22-v1-profile-p2p-delivery-next-plan.md`.

The decision is:

```text
Friendship is profile-to-profile.
DM is the durable private channel.
Home is only an explicit live room after trust.
```

Home must not be used as the normal delivery, authorization, or explanation
path for adding a friend.

The practical implementation rule is stricter than "hide Home from UI":

```text
Adding a friend must not depend on Home.
Home is entered only by an explicit Home action after trust, or by a future
activity invite between already trusted profiles.
```

## Product Rule

V1 should feel like a small private IM, not a room-join tool.

The normal user path is:

```text
scan profile -> send friend request -> accept -> chat / profile / posts -> enter home if wanted
```

There is no normal path where adding a friend means joining a Home.

## What Home Means Now

Home stays in V1, but its job is smaller.

Home is:

- a live room owned by one profile
- a place for room chat and later activities
- something a trusted contact can enter explicitly
- a source of transport metadata when the product already trusts the owner

Home is not:

- the way to create trust
- the way to deliver friend requests
- the way to deliver DM bootstrap in the normal path
- a second permission system beside friendship
- the first product concept users need to understand
- an automatic side effect of opening a profile or sending a request

The permission is trust. A Home descriptor is only reachability data for a
trusted profile's live room.

## Add Friend Flow

V1 should support one normal add-friend flow:

1. A opens A's Profile QR.
2. B scans A's Profile QR.
3. B sees A's limited profile preview.
4. B sends a friend request to A's profile.
5. A sees the incoming request in Contacts and Chat.
6. A accepts or ignores the request.
7. Accept creates mutual trust and unlocks the DM thread.
8. Both sides can open each other's profile.

This flow must not require either side to enter a Home.

Implementation rule:

```text
Friend request delivery address = target profile
Friend request delivery address != target Home
```

## Chat Flow

Chat is the normal private channel.

The Chat surface should show:

- trusted DM threads
- incoming request-like conversations
- outgoing pending requests
- latest message preview
- durable message history
- restart-proof thread state

Opening a contact profile and tapping `Message` must open the same thread as
opening the row from Chat. There must not be separate "profile message" and
"room message" concepts in the normal product path.

## Contacts And Profile Flow

Contacts is the relationship hub.

Contacts should show:

- trusted friends
- incoming friend requests
- outgoing sent requests
- removed or ignored profiles with a recovery action

Opening any relationship row should lead to a profile detail when enough
identity data exists.

Profile detail should show:

- identity and avatar
- current friend/request/removed state
- `Message`
- `Recent posts` when allowed and available
- `Enter Home` only as an explicit live-room action
- advanced identity details behind a fold or developer section

## Treehole Flow

Treehole remains part of V1.

The local Treehole is where the user posts durable updates.

A trusted contact's profile can show those updates as `Recent posts`. This is
profile context, not Home room history and not a global feed.

V1 can use an explicit refresh path. V2 can later make this a live feed stream.

## Transport Rule

Production delivery must be P2P, profile-oriented, and not direct host:port.

Required production properties:

- no public IP requirement
- no manual host/port in normal UI
- no Home membership requirement
- signed profile-bound request records
- signed accept / invite return
- honest queued/searching/sent/delivered/accepted states
- retry or clear failure when the peer is offline

Direct host:port is debug only. Home-control friend request delivery is legacy
or debug compatibility only. Neither is the V1 product route.

## Current Source-Level Progress

Already landed:

- Desktop and Android start from Contacts.
- Profile QR is the normal share surface.
- Home QR, raw Home keys, direct host:port, and Home-control fallback are
  advanced/debug paths.
- Chat can show trusted threads plus incoming/outgoing request rows.
- Profile detail exists for trusted, incoming request, outgoing request,
  removed, and ignored states.
- Android Contacts request cards can open the same profile detail for incoming
  and outgoing requests.
- Android startup copy points to `Show My QR` and adding friends instead of
  presenting Home as the bootstrap path.

## Remaining V1 Work

### 1. Finish Profile-First Request Delivery Proof

Acceptance:

- Android scans desktop Profile QR.
- Android sends a friend request.
- Desktop receives it while Home peer count can stay zero.
- Desktop accepts it without entering Android's Home.
- Android receives accepted state.
- Both clients show each other as contacts.

### 2. Finish DM Proof

Acceptance:

- trusted peers can send DM both ways
- Chat rows update on both clients
- messages survive restart
- Chat works before explicit Home entry

### 3. Finish Profile Hub Proof

Acceptance:

- trusted contact profile opens from Contacts and Chat
- request and removed states have profile-level surfaces
- `Message` opens the durable DM thread
- `Recent posts` appears when available
- `Enter Home` is separate from add friend and DM

Source-level status:

- Desktop and Android can open trusted, incoming request, outgoing request,
  removed, and ignored profile details.
- The remaining bar is physical proof that real cross-device request delivery
  creates the same states on both clients.

### 4. Keep Debug Paths Quarantined

Acceptance:

- Home QR, raw Home keys, direct host:port, and Home-control fallback remain
  under Advanced/developer surfaces
- normal empty states point to Profile QR, Contacts, Chat, and requests
- tests do not rely on Home join to prove add-friend or DM behavior

### 5. Final Cross-Device Release Proof

Run this only when source-level work is ready and phone time is intentional.

Required proof packet:

1. Desktop and Android start on Contacts.
2. Profile QR request works with Home peer count zero.
3. Accept creates mutual trust both ways.
4. Chat works both ways.
5. Chat survives restart.
6. Local Treehole survives restart.
7. Trusted profile can show recent posts when available.
8. `Enter Home` works after trust as a separate action.
9. Removing a friend blocks future access but does not claim remote data erasure.

## Implementation Order

1. Fix any remaining UI copy or controls that imply Home is needed for adding a
   friend.
2. Make request, contact, and profile surfaces equivalent on desktop and
   Android.
3. Use automated tests for low-cost source proof.
4. Run the physical desktop/Android smoke only for final release evidence or
   when a transport bug cannot be proven another way.
5. Record final proof in the V1 evidence docs before starting V2.

## Done Means

V1 is ready when this sentence is true on desktop and Android:

```text
I scan your profile, send a request, you accept, then we can chat, see profile
context, and enter Home only when we choose the live-room action.
```

If adding a friend still depends on Home entry, direct host:port, or raw debug
QR, V1 is not done.
