# V1 Profile Delivery Next Plan

This is the current next plan after we rechecked the friend/Home model during
phone smoke.

The product rule is now stricter:

```text
Profile owns friendship and private messaging.
DM/request delivery uses profile-level P2P.
Home is only an explicit live room after trust.
```

Home must not be involved in adding a friend, accepting a friend, or sending a
private message in the production path.

## Why This Plan Exists

The smoke issue was not only UI polish. It exposed that some user paths still
felt like they were mixing these facts:

- profile trust
- friend request delivery
- DM delivery
- Home room entry
- Home QR or room capability

That creates a bad product model. A user should not need to ask whether they
are "adding a person" or "joining a Home". They should scan a profile, send a
request, get accepted, and then chat.

## Final V1 Product Model

### Profile

Profile is the social address.

It owns:

- identity
- display name and avatar snapshot
- Profile QR
- friend requests
- trust state
- DM eligibility
- recent Treehole/profile context
- an optional signed Home descriptor for later live-room entry

### Contact

Contact is the local relationship record.

It owns:

- request state
- trusted, ignored, removed, or blocked state
- alias and profile snapshot
- last DM preview
- cached recent posts when available

ContactBook is the relationship source of truth. Home membership is not.

### Chat

Chat is the normal result of trust.

It owns:

- trusted contact rows
- request rows when useful
- durable pairwise messages
- unread and last-message preview state

Opening Chat must not enter Home.

### Home

Home is a live room.

It owns:

- live room chat
- live presence
- future watch, listen, game, and local-service sessions

Home entry is explicit. It is not a friend-request transport and not a
permission source.

## Delivery Decision

V1 production delivery has one direction:

```text
profile-to-profile P2P only
```

Do not keep direct host/port as a product route. Direct host/port can stay as a
debug fallback only if it is hidden behind Advanced and never required by the
normal user path.

Required production behavior:

- sending a friend request uses the target profile route
- receiving a friend request does not require joining the sender's Home
- accepting a friend request returns the accept over the profile route
- durable DM bootstrap uses profile/contact state, not Home room membership
- durable DM send does not use Home room chat as the normal channel
- Home peer count may remain zero during request and accept

## UX Decision

There should be one normal add-friend path:

1. A scans B's Profile QR.
2. A sees B as a profile target.
3. A sends a request.
4. B accepts or ignores the request.
5. Both sides now have a trusted contact.
6. Chat becomes available.
7. Profile shows Message, Recent posts, and Enter Home when allowed.

There is no normal V1 "Home invite to become friends" flow.

Activity invites are different. In V2/V3, an already trusted friend may invite
another trusted friend to watch, listen, play, or share a local service. That is
a session invite, not an authorization or trust invite.

## Implementation Plan

### Phase 1: Remove Home From Friendship Semantics

Required:

- Profile QR scan creates a profile request target, not a Home target
- request send does not call Home entry
- request accept does not require Home membership
- accept return uses profile-level delivery
- tests fail if normal request paths use Home-control fallback

Done when:

- the source proves Home peer count can stay zero during request and accept
- desktop and Android copy never describe add-friend as joining Home

### Phase 2: Make Contacts And Profile The Person Hub

Required:

- Contacts rows open profile detail
- incoming request profile detail can Accept or Ignore
- ignored or removed profile detail can Allow requests
- trusted profile detail shows Message, Recent posts, and Enter Home when
  allowed
- untrusted profile detail does not enable Message

Done when:

- desktop and Android expose the same profile actions from shared state
- request recovery is visible without using raw debug controls

### Phase 3: Make Chat The Primary Trust Result

Required:

- accepted contacts appear in Chat
- Chat rows show last-message preview
- opening Chat opens the durable DM thread
- sending a DM does not enter Home
- restart keeps durable DM state

Done when:

- after accept, the obvious next action is Message, not Enter Home

### Phase 4: Keep Treehole As Profile Context

Required:

- local Treehole remains the place to post to yourself
- trusted contacts can see cached recent posts when available
- profile detail can show recent posts
- room chat never becomes Treehole content

Done when:

- posts are explained and rendered as profile context, not room history

### Phase 5: Demote Home Controls

Required:

- Home remains a top-level surface with the house icon
- Enter Home is visible from a trusted profile as a live-room action
- Home QR, raw room key, direct host/port, and low-level transport controls are
  Advanced/debug only
- leaving Home does not affect friendship, Chat, or profile delivery

Done when:

- the user can understand Home as "visit this person's live space", not "set up
  friendship"

### Phase 6: Final Proof

Automated proof:

- product surface parity tests pass
- profile scan does not create a Home target
- request send does not enter Home
- request accept does not require Home
- accept return uses profile-level delivery
- DM send does not use Home room chat in the normal path
- `npm run v1:gate` passes

Manual proof, run once intentionally:

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

## Non-Goals

- V2 listening room
- V2 watch room
- V3 RetroArch sessions
- multi-device account linking
- global username search
- public server relay as the default product model

## Done Criteria

V1 is ready when this sentence is true on both desktop and Android:

```text
I add you by profile, you accept, we can chat, see profile context, and enter
Home only when we choose that live-room action.
```

If any normal path still needs Home for friendship or DM delivery, V1 is not
done.
