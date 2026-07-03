# V1 Profile And DM Delivery Next Plan

This is the next V1 plan after the Home bootstrap confusion was identified.

The decision is simple:

```text
Friendship and DM delivery are profile-level product flows.
Home is a live room after trust.
Direct host:port is not a production path.
```

The current execution follow-up is
`11-v1-profile-first-im-next-plan.md`. Use that file for the remaining V1
product finish and final proof checklist.

## Why This Exists

The current user-visible problem is not one missing button. It is a product
model leak:

- adding a friend sometimes looks tied to joining a Home
- Profile QR and Home QR still feel like competing entry points
- direct host:port can look like a real fallback
- desktop and Android do not yet expose the same simple IM shape

V1 should not ask the user to understand transport. The product should feel
like an IM:

1. scan Profile QR
2. send friend request
3. accept request
4. chat
5. view profile and posts
6. enter Home only when the user wants the live room

## Product Rules

### One Normal Bootstrap Path

V1 has one normal social bootstrap path:

```text
Profile QR -> friend request -> accept -> mutual trust -> DM/contact/profile
```

There is no normal "join Home to become friends" path.

### Home Is Not Authorization

Home entry is a session action. It can prove that a live room is reachable, but
it must not create friendship by itself.

For V1:

- Home may show live room chat/state.
- Home may expose explicit `Enter Home` for trusted contacts.
- Home may support future activity invites.
- Home must not be required for friend request delivery.
- Home must not be required for accept/invite return.

### DM Is The Main Durable Channel

DM is the durable pairwise channel after trust or during the friend request
handshake.

For V1:

- incoming friend requests should be visible in Chat and Contacts
- accepting a request should create or unlock the DM thread
- normal private messages should not depend on room chat
- room chat can remain ephemeral

### Treehole Is Profile Context

Treehole remains the owner's durable post stream.

For V1:

- the local Treehole is where the user posts their own updates
- a trusted contact's profile can show recent posts when available
- Treehole data is social context, not a Home room history

## Transport Decision

### Production Route

Production delivery should use the profile-level P2P route:

```text
fromProfileId -> toProfileId
```

The route can be implemented using the existing P2P runtime, topics, signed
frames, and acknowledgement layer. The key rule is that the product object being
addressed is the target profile, not the target Home.

This route owns:

- friend request send
- friend request receive
- accept/ignore result
- DM invite return
- durable DM message delivery

### Debug Route

Home-control request/invite handling may stay only as explicit debug support.
It must be labeled and tested as debug.

Direct host:port may stay only as diagnostics. It is useful for local debugging,
but it fails the production requirement because it asks the user or host network
to solve NAT, firewall, and public reachability.

### Production Requirements

The production path must satisfy:

- no public IP requirement
- no direct host:port input
- no manual network choice in the main UI
- no Home membership requirement
- signed profile-bound records
- clear queued/searching/sent/delivered/accepted states
- retry or honest failure when the peer is offline

## UX Model

### Main Surfaces

V1 should expose four main surfaces on desktop and Android:

- Home
- Chat
- Contacts
- Treehole

The meaning should be the same on both platforms.

### Contacts

Contacts is the place to:

- show friends
- show incoming/outgoing requests
- open a profile
- send or recover a request
- enter a trusted friend's Home explicitly

### Chat

Chat is the place to:

- see friend/request conversations
- show the latest message preview
- open a durable DM thread
- surface incoming friend requests if they behave like message requests

### Profile

Profile is the place to:

- view identity
- see friend state
- start Chat
- view recent posts
- enter Home explicitly after trust

### Home

Home is the place to:

- see the local live room
- enter a trusted friend's live room
- debug live room transport when Advanced is open

Home should not be the first explanation for how to add friends.

## Current Status

Source-level cleanup already completed:

- desktop and Android start on Contacts
- unknown product-surface fallback resolves to Contacts
- Home QR and direct host:port are labeled as debug/advanced paths
- desktop private DM composer no longer requires Home room membership
- Android friend request and DM send paths are profile/runtime paths, not Home
  entry paths

The remaining blocker is proof, not the product decision: the physical
desktop/Android path still needs to prove request delivery, accept return, DM,
restart persistence, recent posts, and explicit Home entry with Home peer count
allowed to remain zero.

## Implementation Plan

### Phase 1: Remove Product Coupling

Audit and fix UI/code paths where "friend" still implies "Home".

Acceptance:

- sending a friend request never calls Home entry in the normal path
- accepting a request never requires Home membership
- Home QR is not presented as the normal add-friend path
- direct host:port is not visible as a normal product fallback

### Phase 2: Make Profile Delivery The Shared Boundary

Treat profile delivery as the shared product transport boundary for both
platforms.

Acceptance:

- desktop and Android use the same request state names
- `delivered` means receiver acknowledgement, not friendship
- accept/invite return uses profile-level delivery
- failed/searching states are visible instead of hidden

### Phase 3: Make DM The Private Message Surface

Connect accepted contacts to durable DM threads.

Acceptance:

- Contacts rows can open Chat
- Chat list shows friend rows with latest preview
- messages survive restart
- room chat and DM are visibly separate concepts

### Phase 4: Align Desktop And Android UI

The two clients can differ in layout, but they should not differ in product
logic.

Acceptance:

- both expose Home, Chat, Contacts, Treehole
- both can scan/show Profile QR
- both can send, receive, accept, and ignore requests
- both can open profile and chat from contact rows
- both place debug affordances under Advanced/developer surfaces

### Phase 5: Final Cross-Device Proof

Run this only when implementation is ready and phone time is intentional.

Required proof:

1. desktop and Android each load a profile
2. Android scans desktop Profile QR
3. Android sends a friend request
4. desktop sees the incoming request without Home peer membership
5. desktop accepts
6. Android sees the accepted state
7. both sides show the contact
8. DM works both ways and survives restart
9. local Treehole post survives restart
10. trusted contact profile shows available recent posts
11. Enter Home works after trust as a separate action

## Non-Goals

- no account server
- no global username system
- no direct host:port production fallback
- no Home-based add-friend path
- no V2 media rooms in this plan
- no V3 service tunnel in this plan

## Done Means

This plan is done when a user can explain V1 without mentioning Home transport:

```text
I scan your profile, send a request, you accept, then we can chat, view posts,
and enter each other's live rooms when we want.
```
