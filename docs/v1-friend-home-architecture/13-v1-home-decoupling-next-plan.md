# V1 Home Decoupling Next Plan

This is the next plan after we decided that Home should be weaker in the
product model.

The rule is:

```text
Friendship, request delivery, accept, DM, and profile posts belong to the
Profile/DM layer.
Home is a live room entered explicitly after trust.
```

## Why This Exists

The current risk is not that V1 lacks more features. The risk is that the same
user action still has two hidden meanings:

- "add this person"
- "join or use this person's Home"

That makes the product hard to reason about and makes cross-device bugs look
random. The fix is to make Product and Transport match:

- profile identity is the social address
- profile-level P2P is the request and DM bootstrap route
- ContactBook is the local trust state
- Home descriptor is live-room reachability metadata, not authorization

## Product Rules

- There is one normal add-friend path: scan Profile QR, send request, accept.
- Home QR is not a primary friend path.
- Enter Home is a separate button/action after trust.
- Opening a contact profile does not auto-enter Home.
- Sending a request does not auto-enter Home.
- Accepting a request does not require Home membership.
- Chat is the normal private durable channel.
- Treehole posts are profile context; Home can later refresh/live-sync them, but
  Home is not the permission source.
- Future play/watch/listen invites are activity invites between trusted
  profiles, not trust invites.

## Implementation Target

### 1. Shared Product State

Keep one shared model for both desktop and mobile:

- profile identity
- contact relationship state
- incoming and outgoing friend requests
- accepted DM thread state
- Treehole read policy
- Home descriptor metadata

Platform code may render differently, but it should not invent separate product
logic for "friend", "home", or "request".

Acceptance:

- desktop and mobile use the same state names for queued, searching, sent,
  delivered, accepted, ignored, removed, and trusted
- accepting an invite updates ContactBook on both clients
- Home descriptor changes do not create friendship by themselves

### 2. Profile Request Delivery Only

Production friend request delivery must use profile-level P2P.

Acceptance:

- normal request send path does not call Home entry
- normal request receive path does not require Home peer count
- normal accept/invite return uses profile-level delivery
- Home-control request/invite handling is disabled by default or debug-only
- `delivered` means receiver runtime acknowledgement, not friendship

### 3. DM As The Social Channel

Chat is the main private social surface.

Acceptance:

- Chat list shows trusted contacts and request-like rows
- outgoing request rows show honest delivery state
- incoming request rows can accept or ignore without Home
- profile `Message` and Chat row open the same durable thread
- DM body delivery does not use Home room chat in the normal path

### 4. Profile As The Hub

Contacts and Chat should lead to a profile page, not a room join.

Acceptance:

- trusted profile shows Message, Recent posts, and Enter Home
- incoming profile shows accept/ignore
- outgoing profile shows request status and retry if available
- ignored/removed profile has a clear recovery or blocked state
- Enter Home is visible as a live-room action, not as the way to become friends

### 5. Home As Live Room

Home remains valuable, but smaller.

V1 Home scope:

- live room chat
- presence
- explicit entry from a trusted profile
- future surface for watch/listen/game/local-service sessions

Not V1 Home scope:

- add-friend bootstrap
- durable DM
- permission SSOT
- automatic background room join for every contact

## Source-Level Work Left

1. Search for remaining normal-path calls that enter or depend on Home during
   friend request send, receive, accept, or DM bootstrap.
2. Strengthen tests where behavior is only documented:
   - mobile accepted invite persists ContactBook trust
   - desktop accepted invite persists ContactBook trust and is routed through
     the local invite acceptance context
   - Profile QR scan builds a profile target, not a Home target
   - normal Chat send path does not use Home room chat
3. Make desktop and mobile screens converge on the same product nouns:
   Contacts, Chat, Profile, Treehole, Enter Home, Advanced.
4. Keep Home QR/raw keys/host:port behind Advanced.
5. Run low-cost gates first; defer physical phone smoke until source proof is
   clean.

## Final Release Proof

The final proof should be run once, intentionally:

1. Desktop shows Profile QR.
2. Android scans it.
3. Android sends a friend request.
4. Desktop receives it with Home peer count allowed to stay zero.
5. Desktop accepts without entering Android Home.
6. Android receives accepted state and shows desktop as trusted.
7. Both sides can Chat.
8. Chat survives restart.
9. Desktop Treehole post survives restart.
10. Android opens desktop profile and sees Recent posts when available.
11. Android enters desktop Home explicitly after trust.
12. Desktop revokes Android and future access is blocked.

## Done Means

V1 is ready when the user story is simple and true:

```text
I add you by profile. Then we can chat, see profile context, and enter Home
only when we choose the live-room action.
```

If any normal add-friend or DM path still needs Home, the architecture is not
done.
