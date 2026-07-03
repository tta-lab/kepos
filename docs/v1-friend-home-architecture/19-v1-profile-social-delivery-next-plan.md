# V1 Profile Social Delivery Next Plan

This was the active V1 next plan after the Home/add-friend model was corrected
again.

The current next plan is
`23-v1-social-delivery-release-plan.md`. Use `23` for new V1 work. Use
this document for the product model and social-delivery context.

The product rule is now stricter:

```text
Profile is the social address.
Friendship, request delivery, accept delivery, and Chat bootstrap are
profile-to-profile social delivery.
Home is only an explicit live room after trust.
```

Home must not be needed to become friends. It must not be the hidden delivery
route for friend requests. It must not explain why a QR scan, request, accept,
or DM works.

## What Changed

The earlier confusion came from treating Home as both:

- the person's private space
- the live room
- the transport target
- the trust boundary

That made the UX feel like there were two invites: Profile QR and Home QR. The
V1 product cannot ship like that.

V1 has one normal social route:

```text
scan Profile QR -> send friend request -> accept -> Chat and Profile work
```

After trust, Home is just a later action:

```text
trusted profile -> Enter Home
```

## Correct User Model

### Add Friend

There is one normal path:

1. A scans B's Profile QR.
2. A sends a friend request to B's profile route.
3. B sees an incoming request in the social inbox.
4. B accepts.
5. Both sides become trusted contacts.

No automatic Home join happens in this path.

### Contacts And Profile

A trusted contact is a person, not a room membership.

Opening a contact profile should show:

- Message
- Recent posts
- Enter Home
- Remove friend

Message and Recent posts are profile features. Enter Home is a separate live
room action.

### Chat

Chat is the main product result of trust.

The Chat tab should behave like a small private IM:

- friend list or thread list
- last-message preview when a thread exists
- trusted contacts visible even before a first message
- tap row -> durable private conversation

DM delivery and DM bootstrap should follow the profile route. Home room chat is
not the private Chat path.

### Treehole

Treehole remains the place where I post to myself.

For friends, recent posts are profile context. V1 can keep sync simple and
cached, but it should not present Treehole as Home history or room content.

### Home

Home is still useful, but smaller.

Home owns:

- live room chat
- presence
- future listening rooms
- future watch rooms
- future game or local-service sessions

Home does not own:

- becoming friends
- accepting friends
- private Chat
- profile recent posts
- trust authorization

Home QR, raw room keys, direct host/port, and manual room tools belong in
Advanced/debug. They are not the normal add-friend UX.

## Technical Model

### Production Route

Production social delivery should use:

```text
local profile runtime -> target profile route -> signed social frame
```

The social frame can be:

- friend request
- request acknowledgement
- accept result
- DM invite/bootstrap
- later DM delivery metadata
- later profile feed metadata

The exact tunnel can change, but the product boundary should not. Code that
sends friend requests must not need Home runtime.

### Direct Host/Port

Direct host/port is diagnostic only.

It can help prove a low-level transport, but it is not a production fallback.
The production expectation is cross-region P2P without asking the host to expose
a public port.

### Home Runtime

Home runtime should only start or connect when the user chooses a Home action.

Normal social code should fail tests if it:

- enters Home to send a friend request
- reads Home peer count before accepting
- uses Home control as the normal DM bootstrap
- treats leaving Home as losing friendship or Chat

## Remaining V1 Work

### Phase 1: Freeze The Product Semantics

Make desktop and Android use the same visible nouns:

- Profile QR: add friend
- Contacts: people
- Chat: private durable messages
- Treehole: my posts
- Home: live room
- Advanced: raw transport tools

Remove or demote copy that implies:

- Home QR is another way to add a friend
- joining Home is required before request delivery
- direct endpoint entry is normal setup

Done when a new user sees one add-friend path, not two.

### Phase 2: Finish Profile Request Delivery

Request delivery must be honest and retryable.

Required implementation state:

- outgoing request stores enough signed data to retry
- delivery state survives restart
- retry uses the profile route
- failed or searching requests stay visible
- request receive does not require Home peer membership

Done when focused tests prove request send, retry, and receive do not read Home
runtime.

### Phase 3: Finish Accept And DM Bootstrap

Accept should create trust locally and return the bootstrap result through the
profile route.

Required implementation state:

- accept does not enter Home
- accept delivery state is visible on both platforms
- accepted contact appears in Chat before the first message
- DM thread bootstrap is durable
- restart keeps trust, thread, previews, and local message state

Done when accept and first Chat are proven with Home peer count allowed to stay
zero.

### Phase 4: Make Mobile Match Desktop Product Logic

Mobile should not feel like a reduced or older product.

Required mobile parity:

- bottom nav has Home, Chat, Contacts, Treehole
- Profile QR scan creates a profile target, not Home entry
- incoming and outgoing requests are visible
- Chat rows and Contacts rows open the same profile detail
- Message, Recent posts, Enter Home, and Remove friend match desktop semantics
- disabled or pending actions explain state plainly

Done when screenshots and manual use show the same product model on both
clients.

### Phase 5: Final Cross-Device Proof

Do not run high-cost phone smoke by default. Run it only when the user asks for
release proof or when no lower-cost test can prove the issue.

The release proof must show:

1. Desktop shows a Profile QR.
2. Android scans it and sends a friend request.
3. Desktop receives the request without entering Android Home.
4. Desktop accepts without entering Android Home.
5. Android observes trusted state without entering desktop Home.
6. Both clients show each other in Contacts and Chat.
7. Both clients can open the same profile detail.
8. Both clients can send durable Chat messages.
9. Restart keeps contacts, trusted state, Chat thread, previews, and local
   Treehole posts.
10. Enter Home works only as an explicit later action.

The proof output belongs in `tmp/final-v1-proof.md`.

## Implementation Guardrails

- Do not add a second normal invite model.
- Do not make Home QR the normal add-friend path.
- Do not use Home control as production social delivery.
- Do not hide failed delivery behind successful local state.
- Do not regress desktop/mobile parity.
- Prefer shared TypeScript domain logic for QR, request state, trust, Chat, and
  profile view models.
- Keep platform code focused on UI, camera, storage adapters, IPC, and runtime
  glue.

## Current Status

Already true or partly proven:

- Profile-first product model is documented.
- Profile QR request targets are separate from Home entry.
- Chat and Contacts route to shared profile detail on desktop.
- Trusted contacts can appear in Chat before a saved DM snapshot.
- Accept delivery state is surfaced instead of hidden behind a plain accepted
  notice.
- Desktop outgoing friend requests now store their signed request frame and
  expose a Retry action that resends through profile transport, updates
  ContactBook delivery state, and does not read Home runtime.
- Mobile Sent requests now expose a Retry action that reuses the original
  request id, text, timestamp, and target profile, sends through
  `RPC_PROFILE_REQUEST_SEND`, locally marks the request queued, and does not
  enter Home.
- Home is documented as explicit live room, not friendship.

Still open before V1 can be called ready:

- finish accept/DM bootstrap proof without Home
- close mobile UI parity gaps
- run the final desktop/Android proof once the user explicitly asks
- record the proof packet

## Non-Goals

- V2 listening rooms
- V2 watch or screen-share rooms
- V3 RetroArch sessions
- global usernames or discovery
- multi-device identity
- production direct host/port
- Home-based friend bootstrap
