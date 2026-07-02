# V1 Social Delivery Release Plan

This is the active V1 next plan after the profile P2P delivery decision.

Use `22-v1-profile-p2p-delivery-next-plan.md` as evidence context. Use this
document for new V1 implementation work.

## Target

Finish V1 as a ready private IM product:

```text
Profile QR -> friend request -> mutual trust -> Chat / Profile / Treehole / explicit Home
```

The product should feel like a small trusted-circle messenger. P2P is the base,
not the visible workflow.

## Product Rules

- Profile is the social address.
- Contacts owns people, requests, and profile detail.
- Chat owns durable pairwise messages.
- Treehole is the owner's personal post stream.
- Home is only an explicit live room after trust.
- Debug Home QR is an advanced transport descriptor, not an add-friend route.
- Direct host:port is diagnostics only.

## Current State

The source and low-cost tests now support most of this model:

- desktop and Android expose Home, Chat, Contacts, and Treehole as the main
  product surfaces
- Profile QR is the normal friend-request path
- trusted profile details expose Message, Recent posts, Enter Home, and Remove
  friend
- Recent posts no longer have a hidden refresh action that enters Home
- outgoing request state, accepted contacts, Chat rows, and local Treehole data
  have storage coverage
- desktop and Android share typed product vocabulary and several view models
- Profile QR is the normal add-friend path
- Debug Home QR controls are under Advanced/debug UI and must say Debug Home QR
  when user-visible

This is still not a release proof. The real desktop plus Android product path
has not been recorded end to end.

## Remaining V1 Work

### 1. Finish Product Copy And Surface Guardrails

Done means:

- no normal add-friend copy mentions Home QR
- all user-visible Home QR controls say Debug Home QR
- Debug Home QR copy explains live-room entry, not friendship
- Profile QR remains the only normal add-friend QR
- tests fail if normal social UI starts presenting Home QR as a peer add path

### 2. Prove Profile P2P Delivery Without Home

Done means:

- request send uses profile/social delivery, not Home entry
- request accept returns trust and DM bootstrap without Home peer membership
- requester observes accepted trust without entering the other Home
- both clients can show the friend in Contacts and Chat
- private Chat works before any Home session is entered

### 3. Finish Cross-Platform Product Parity

Done means desktop and Android both support the same user story:

- share or scan Profile QR
- send request
- see incoming and outgoing request states
- accept or ignore
- open the same profile from Contacts and Chat
- open Chat from profile
- read Recent posts as profile context when available
- enter Home only through explicit profile action

### 4. Record Release Evidence

Low-cost gates should run before any physical smoke:

- source-level product-rule tests
- storage restore tests
- desktop and Android view-model tests
- command vocabulary tests
- lint and TypeScript compatibility checks

Physical smoke is expensive and should only run when asked. The release packet
must still prove:

1. Android scans desktop Profile QR.
2. Android sends a friend request.
3. Desktop receives it without entering Android Home.
4. Desktop accepts without entering Android Home.
5. Android observes accepted trust without entering desktop Home.
6. Both clients show each other in Contacts.
7. Both clients show each other in Chat.
8. Contacts and Chat open the same profile detail.
9. Private Chat messages survive restart.
10. Local Treehole posts survive restart.
11. Friend Recent posts appear as profile context when available.
12. Enter Home works only as an explicit later action.

The final packet remains `tmp/final-v1-proof.md`.

## Guardrails

- Do not add another normal add-friend path.
- Do not make Home membership an authorization signal.
- Do not use Home control traffic as production friend-request delivery.
- Do not present direct host:port as production setup.
- Do not call V1 ready from automated tests alone.
- Do not start V2 until this V1 release evidence is complete.
