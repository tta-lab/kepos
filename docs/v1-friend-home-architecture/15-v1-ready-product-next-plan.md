# V1 Ready Product Next Plan

This is the current V1 finish plan after Home was removed from the friendship
path and desktop/Android navigation started sharing the same product surface
model.

The goal is a ready private IM product, not only a working transport demo:

```text
Profile QR -> friend request -> accept -> Contacts -> durable Chat -> profile
posts -> explicit Home entry
```

## Product Decision

Home is not part of adding a friend.

The normal social path is:

1. A scans B's Profile QR.
2. A sends B a friend request.
3. B accepts or ignores the request.
4. Accept creates mutual trust and DM eligibility.
5. Both users can message from Chat and open each other's profile.
6. Either user can enter the other's Home later as an explicit live-room action.

There is no normal V1 path where "add friend" means "join Home".

## V1 Mental Model

### Profile

Profile is the social address.

It owns:

- identity
- display name
- avatar snapshot
- Profile QR
- one Home descriptor as optional reachability metadata
- one Treehole

### Contact

Contact is the local relationship record.

It owns:

- alias
- request state
- trusted state
- revoked or ignored state
- saved profile snapshot
- saved Home descriptor when available

ContactBook is the relationship SSOT. Home membership is not.

### Chat

Chat is the primary durable person-to-person surface.

It owns:

- contact list with last message preview
- incoming request rows
- outgoing request state
- durable pairwise thread
- unread state

Chat does not require either side to be inside Home.

### Treehole

Treehole is the profile-owned durable post surface.

It owns:

- local user's own posts
- trusted contact recent-post cache
- comments and likes after trust

Treehole access comes from trust policy. It is not granted by knowing a Home
room key alone.

### Home

Home is a live room.

It owns:

- live room chat
- live presence
- live activity sessions
- future V2/V3 sharing surfaces

Home entry is explicit. Home QR and raw room controls belong behind Advanced or
debug UI.

## Architecture Rule

Friendship, DM, Treehole, and Home are separate product facts.

- Friendship is profile-to-profile trust.
- Friend requests and accepts use profile-level P2P delivery.
- DM uses pairwise durable private delivery.
- Treehole uses owner/trust authorization.
- Home uses signed Home descriptors for live entry.

The low-level P2P stack may reuse topics, swarms, feeds, or tunnels. The UI and
domain model must not leak those shortcuts into product meaning.

## Implementation Order

### Phase 1: Lock The Shared Product Surface

Status: source-complete.

Required:

- desktop rail and Android bottom tabs use the same product surface list
- Home, Chat, Contacts, and Treehole labels stay shared
- icons stay shared by intent, with Home shown as a house
- tests fail if either client hand-codes a different tab set

Current evidence:

- desktop rail derives labels, titles, ids, icons, active state, and tab
  actions from `productSurfaceTabs`
- Android bottom tabs derive labels, ids, icons, active state, and tab actions
  from `productSurfaceTabs`
- `test/product-surfaces.test.js` checks both clients use the shared main-nav
  source instead of local product-label helpers

Why:

The two clients must feel like the same app before manual smoke is useful.

### Phase 2: Finish Contacts And Profile Parity

Required:

- Contacts is a real people list on Android, not a debug panel
- trusted contact rows open profile detail
- incoming requests can be accepted or ignored from Contacts
- outgoing requests show honest state: queued, searching, sent, delivered, or
  failed
- removed or ignored contacts have a clear recovery action such as
  `Allow requests`
- profile detail exposes `Message`, `Recent posts`, and `Enter Home` when
  allowed

Current evidence:

- shared contact profile models expose `messageEnabled`, so desktop and Android
  disable `Message` for untrusted, pending, removed, ignored, and scanned
  request-target profiles
- trusted profile details keep `Message` enabled; pending/request profiles keep
  relationship status visible without opening durable Chat prematurely

Why:

V1 lives or dies on whether "I added this person" is visible and understandable.

### Phase 3: Make Chat The Primary Result Of Trust

Required:

- accepted contacts appear in Chat
- Chat rows show latest message preview and unread state
- opening Chat does not enter Home
- sending durable DM does not use Home room chat in the normal path
- accepted request / DM invite return works over profile-level delivery

Why:

The product promise after accepting a friend is private messaging, not live room
membership.

### Phase 4: Keep Treehole As Personal Posts

Required:

- the local user can write their own Treehole posts
- trusted users can read recent posts when data is available
- profile detail can show cached recent posts
- refresh uses checked profile/Home descriptor logic and does not silently
  redefine friendship
- room chat messages never become Treehole posts

Why:

Treehole gives Kepos a profile-like personal surface without becoming a public
feed product.

### Phase 5: Demote Home To Explicit Live Room

Required:

- Home is still visible as a first-class surface
- entering another user's Home is always explicit
- Home QR, raw room key, direct host/port, and fallback controls are Advanced
  or debug-only
- leaving Home does not stop profile request delivery
- friend request and accept work while Home peer count may be zero

Why:

Home is important for future V2/V3, but it should not confuse V1 friendship.

### Phase 6: Release Proof

Required automated proof:

- source tests prove tab parity
- source tests prove request send does not enter Home
- source tests prove accept does not require Home membership
- source tests prove DM invite return uses profile-level delivery
- source tests prove Home-control friendship paths are debug fallback only
- `npm run v1:gate` passes

Required manual proof:

- desktop creates profile and shows Profile QR
- Android scans desktop Profile QR
- Android sends friend request
- desktop receives request with Home peer count allowed to stay zero
- desktop accepts
- Android sees trusted contact
- both sides can open Chat and send durable messages
- restart keeps profile, contact, treehole, and durable Chat state
- profile detail shows recent posts when available
- Enter Home works only as an explicit later action

## Out Of Scope For This Plan

- V2 listening rooms
- V2 watch rooms
- V3 RetroArch or local-service tunnel
- multi-device account linking
- global usernames or search
- public profile discovery
- group DM
- SFU, OBS ingest, or media pipeline work

These remain valid future work, but V1 should not start them before the private
IM path is ready.

## Done Criteria

V1 is done when this sentence is true on desktop and Android:

```text
I can add you through your Profile QR, you can accept me, we can message each
other after restart, I can see your profile context, and Home is only something
we enter when we choose to.
```

If a user still has to ask whether they should scan Profile QR or Home QR to add
a friend, V1 is not done.

If a request only works after the sender joins the recipient's Home, V1 is not
done.

If Android and desktop show different product structure for the same account
state, V1 is not done.

## Immediate Next Engineering Step

Finish the parity pass before more smoke:

1. keep the shared `productSurfaceTabs` model as the only normal tab source
2. close any Android Contacts/Profile/Chat behavior still behind desktop
3. move or label old Home QR and raw transport controls as Advanced
4. run source-level tests before using the physical phone
5. do one final cross-device proof packet after source proof is green

This keeps smoke cheap: the phone should verify a coherent product path, not
discover basic mismatches that source tests can catch first.
