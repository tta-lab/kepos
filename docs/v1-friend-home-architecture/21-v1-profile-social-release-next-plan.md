# V1 Profile Social Release Next Plan

This is the active V1 next plan after the low-cost accept, DM bootstrap, and
shared product-logic proof.

The rule stays strict:

```text
Profile is the social address.
Chat and Contacts are the main social surfaces.
Home is only an explicit live room after trust.
```

## Current State

Low-cost proof now covers the V1 architecture shape:

- request retry on desktop and Android uses profile/social delivery
- accept creates trust and returns the signed DM invite without using Home
- accepted contacts can appear in Chat before the first private message
- desktop can restore accepted Chat rows, thread metadata, and saved messages
  after restart while no Home session is active
- Android can restore ContactBook and accepted thread metadata from app file
  storage, then render them through the shared Chat thread list
- local Treehole restart persistence is part of the final proof packet, not an
  implied side effect of remote Recent posts
- desktop and Android expose Home, Chat, Contacts, and Treehole as the product
  surfaces
- Profile QR means add friend; Home QR and raw transport tools are
  Advanced/debug
- Contacts row and Chat row resolve to the same profile detail model
- trusted profile actions are Message, Recent posts, Enter Home, and Remove
  friend

This is enough to continue implementation without revisiting the product model.
It is not enough to call V1 ready, because the final physical cross-device path
has not been recorded.

## Release Criteria

V1 is ready only when a real desktop plus Android run proves:

1. Android scans desktop Profile QR.
2. Android sends a friend request.
3. Desktop receives the request without entering Android Home.
4. Desktop accepts without entering Android Home.
5. Android observes accepted trust without entering desktop Home.
6. Both clients show each other in Contacts.
7. Both clients show each other in Chat before or after the first private
   message.
8. Contacts and Chat open the same profile detail.
9. Private Chat messages are durable and survive restart.
10. Local Treehole posts survive restart.
11. Friend recent posts show as profile context when available.
12. Enter Home works only as an explicit later action.

## Implementation Order

### 1. Remove Product Ambiguity

Keep Home away from friendship.

- no normal copy should imply Home QR is another add-friend route
- no add-friend code should enter Home
- no accept or DM bootstrap code should depend on Home peer count
- direct host/port remains diagnostics only

### 2. Tighten Cross-Platform UI Parity

Desktop and Android should feel like the same product:

- four primary surfaces: Home, Chat, Contacts, Treehole
- icon-led primary navigation
- Contacts owns add friend, request inbox, profile detail, removed profiles,
  and explicit Home entry
- Chat owns durable private threads and message previews
- Treehole owns my posts
- profile detail owns friend context and recent posts

### 3. Make Delivery Failure Honest

Do not hide P2P uncertainty behind optimistic UI.

- outgoing requests keep queued, searching, sent, delivered, accepted, or failed
  state
- retry resends the same signed request where possible
- pending accept or DM bootstrap state remains visible
- restart does not erase pending social state

### 4. Run Low-Cost Gates

Before any phone smoke, run:

- `npm run lint`
- focused request, accept, DM bootstrap, profile, navigation, and docs tests
- Android bundle/import tests when platform files change

### 5. Record Final Physical Proof

Only when release proof is needed, run the physical desktop plus Android path
and write the result to `tmp/final-v1-proof.md`.

The proof must include:

- commands and app build used
- screenshots or clear observed UI states
- Home peer counts during request and accept
- restart result on both clients
- any failed step and the fix or limitation

## Guardrails

- Do not add a second normal invite path.
- Do not make friendship depend on Home membership.
- Do not present direct host/port as production setup.
- Do not call V1 ready from source-level tests alone.
- Do not run high-cost physical smoke unless it is explicitly requested.
