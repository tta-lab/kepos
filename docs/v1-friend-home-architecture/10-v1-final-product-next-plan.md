# V1 Final Product Next Plan

This was the active next plan for finishing V1 after the Profile/DM route
decision and the first UI cleanup pass.

The current execution doc is
`11-v1-profile-first-im-next-plan.md`, which makes the Home/add-friend split
explicit and owns the remaining V1 proof order.

The current rule is:

```text
Contacts first. Profile QR starts trust. Chat carries durable DM.
Home is a live room after trust. Debug transport stays out of the main path.
```

## Current Source-Level State

Already landed:

- Desktop and Android start on Contacts instead of Home.
- Unknown or empty product-surface fallback resolves to Contacts.
- Profile QR is the product share surface.
- Home QR and direct host:port are labeled as debug/advanced affordances.
- Desktop DM composer no longer requires Home room membership.
- Android DM and friend request send paths are profile/runtime paths, not Home
  entry paths.
- Desktop Contacts can show recent posts when available.
- Chat request rows are synthesized from contact book and mobile request state,
  so incoming/outgoing requests can appear in Chat before a durable DM thread
  snapshot exists.
- Profile detail can now represent trusted, incoming request, outgoing request,
  ignored, and removed states instead of only trusted contacts.
- Automated tests cover product-surface fallback, desktop/mobile startup copy,
  debug affordance demotion, and DM path separation.

Still not proven:

- real desktop/Android request delivery while Home peer count is zero
- accept/invite return on the physical cross-device path
- durable DM both ways across restart on the physical cross-device path
- trusted contact profile showing available posts on the physical cross-device
  path

## Product Shape To Preserve

V1 has four main surfaces:

- Contacts: identity, friend requests, profiles, explicit Home entry
- Chat: durable pairwise DM and request-like conversations
- Treehole: local posts and social context
- Home: live room only after explicit entry

Home can stay visible as one of the four surfaces, but it must not be the first
mental model for adding a person.

## Remaining Implementation Work

### 1. Tighten Profile-First UX Copy

Check desktop and Android for stale copy that still implies Home is required
for adding a friend.

Acceptance:

- empty Contacts says to show My QR or scan a Profile QR
- empty Chat points to contacts/requests, not Home join
- Home copy describes live room entry, not authorization
- debug Home QR/direct host text is not presented as recovery for normal users

### 2. Align Request State Surfaces

Incoming and outgoing requests should be visible where an IM user expects them:
Contacts and Chat.

Acceptance:

- outgoing request has a visible pending/searching/delivered state
- incoming request can be accepted or ignored without entering Home
- accepted request creates or unlocks the contact and DM thread
- ignored/removed state has an honest recovery path

Status: request rows now appear in Chat from shared request state. The
remaining work is to prove the physical delivery/accept path creates the same
state on both devices.

### 3. Make Contacts The Profile Hub

Opening a contact should feel like opening a person's profile, not a transport
debug page.

Acceptance:

- profile shows identity, friend state, recent posts when available, Chat, and
  explicit Enter Home
- Chat works before Home entry when trust/DM state allows it
- Enter Home is a separate action with separate failure state

Status: profile detail now opens for request and blocked states as well as
trusted contacts. Remaining polish is physical proof that cross-device delivery
lands those states on both clients.

### 4. Keep Debug Paths Available But Quarantined

Debug tooling is useful while V1 hardens, but it cannot define the product.

Acceptance:

- raw Home QR, raw key paste, direct host:port, and legacy Home-control
  fallback are in Advanced/developer surfaces
- tests assert the main screens do not depend on these paths
- docs call them diagnostics, not product alternatives

### 5. Final Cross-Device Proof

Do not run this after every small change. Run it only when the user asks for
smoke or when the source-level work above is done and phone time is intentional.

Required proof:

1. Desktop and Android both start on Contacts.
2. Android scans desktop Profile QR.
3. Android sends a friend request.
4. Desktop receives the request while Home peer count may stay at zero.
5. Desktop accepts.
6. Android receives accepted state.
7. Both sides show each other as contacts.
8. DM works both ways.
9. DM survives restart.
10. Local Treehole post survives restart.
11. Trusted contact profile shows available recent posts.
12. Enter Home works after trust as a separate live-room action.

## Verification Before Final Smoke

Use low-cost gates first:

```sh
npm test -- test/product-surfaces.test.js test/mobile-product-copy.test.js test/mobile-mlp-ui.test.js test/desktop-mlp-shell.test.js test/desktop-state.test.js test/desktop-render-presenter.test.js test/two-device-smoke-hooks.test.js
npm run lint
```

Add or adjust focused tests when a remaining item changes code. Do not use
physical phone smoke as the default feedback loop.

## Done Means

V1 is ready when the product can be explained and proven as:

```text
I scan your profile, send a request, you accept, then we can chat, view posts,
and enter each other's Home only when we choose that live-room action.
```

The release is not ready if Home entry, direct host:port, or raw debug QR is
still needed to make the normal friend or DM path work.
