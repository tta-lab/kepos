# V1 Profile P2P Delivery Evidence

This was the V1 next plan after we rechecked the product rule.

The current next plan is
`23-v1-social-delivery-release-plan.md`. Use `23` for new V1 work. Use this
document as profile P2P delivery evidence context.

```text
Home has no role in adding friends.
Profile is the social address.
Chat and Contacts are the main social surfaces.
Production delivery is profile-to-profile P2P.
Direct host:port is diagnostics only.
```

## Target

Finish V1 as a ready private IM product on top of P2P infra.

The release must feel simple:

1. I share or scan a Profile QR.
2. I send a friend request.
3. The other side sees the request in Contacts.
4. The other side accepts.
5. Both sides can open the same profile from Contacts or Chat.
6. Both sides can chat privately.
7. Both sides can see trusted profile context such as recent Treehole posts.
8. Home remains available only as an explicit live-room action after trust.

No normal path should make the user think "join Home" is how friendship works.

## Product Rules

- One profile is one person/device identity in V1.
- One profile owns one Home and one Treehole, but neither owns friendship.
- Profile QR is the normal share surface.
- Home QR is advanced/debug only.
- Add friend means creating mutual trust with a profile.
- Accept means returning trust plus DM bootstrap to the requesting profile.
- Chat is durable and pairwise.
- Treehole is the owner's personal post stream.
- Home is a live shared room after trust, not an authorization step.

## Delivery Rules

Production social delivery must be based on profile routes:

- friend request
- request accept
- DM bootstrap
- private message
- profile recent-post context

These must not depend on:

- Home peer membership
- Home room control traffic
- direct host:port setup
- manual raw key entry

Direct connection can stay as a developer diagnostic because it is useful for
debugging transport. It must not be presented as a user fallback or release
requirement.

## Required UX Shape

### Contacts

Contacts owns people and requests:

- friend list
- outgoing request state
- incoming request inbox
- profile detail
- remove friend
- explicit Enter Home action for trusted profiles

Request rows must show honest state:

- queued
- searching
- delivered
- failed
- accepted

Retry should resend the same signed request where possible.

### Chat

Chat owns durable private conversation:

- friend rows can appear before the first message
- each row has last-message preview when available
- pending and accepted request states should not disappear
- opening a row enters the private thread, not Home

### Profile

Profile is the shared person view:

- Contacts and Chat open the same profile detail model
- trusted profile actions are Message, Recent posts, Enter Home, and Remove
  friend
- Recent posts are profile context, not Home content

### Home

Home is lower priority than identity, Contacts, Chat, and Treehole:

- no automatic Home entry during add friend
- no Home dependency during accept
- no Home dependency during DM bootstrap
- Enter Home is an explicit later action

## Implementation Order

### 1. Lock The Shared Product Model

Audit desktop and Android for any remaining split between "profile friend" and
"home friend".

Done means:

- both clients expose Home, Chat, Contacts, and Treehole as the same four main
  surfaces
- both clients treat Profile QR as add friend
- Home QR is hidden behind Advanced/debug language
- Contacts and Chat use the same profile detail route

### 2. Remove Home From Social Delivery

Audit all request, accept, invite, and DM bootstrap code.

Done means:

- send request does not call Home entry code
- accept does not require Home peers
- DM bootstrap does not require Home peers
- Home control request handling is legacy/debug compatibility only
- tests fail if normal social delivery starts depending on Home state again

### 3. Make Profile P2P State Durable

The user should not lose social state because discovery or delivery is slow.

Done means:

- outgoing request id, signed frame, text, and delivery state persist
- incoming requests survive restart until accepted/rejected
- accepted contacts survive restart
- Chat rows and thread metadata survive restart
- Treehole local posts survive restart

### 4. Prove Honest Cross-Device Behavior

Run low-cost gates first. Physical smoke is expensive and should only happen
when explicitly requested.

Low-cost proof should cover:

- source-level product rules
- storage restore
- desktop view models
- mobile view models
- command vocabulary
- TypeScript/bundle compatibility

Physical release proof must cover:

1. Android scans desktop Profile QR.
2. Android sends a friend request.
3. Desktop receives the request without entering Android Home.
4. Desktop accepts without entering Android Home.
5. Android observes accepted trust without entering desktop Home.
6. Both clients show each other in Contacts.
7. Both clients show each other in Chat.
8. Contacts and Chat open the same profile detail.
9. Private Chat messages survive restart.
10. Local Treehole posts survive restart.
11. Friend recent posts appear as profile context when available.
12. Enter Home works only as an explicit later action.

The final proof packet is still `tmp/final-v1-proof.md`.

## Self Review

What is solid now:

- the product model is clear
- Home is no longer the conceptual center of friendship
- shared storage and view-model tests cover much of the V1 social state
- direct host:port is correctly treated as diagnostics

What still needs release proof:

- real desktop plus Android profile-route request delivery
- real accept delivery without Home membership
- real private Chat durability after restart
- real local Treehole persistence after restart
- real profile recent-post context across devices
- no confusing primary Home QR/add-friend path on mobile

## Guardrails

- Do not add another normal add-friend path.
- Do not make Home membership an authorization signal.
- Do not use Home control traffic as the production friend-request route.
- Do not present direct host:port as production setup.
- Do not call V1 ready from automated tests alone.
- Do not run physical phone smoke unless the user asks for it.
