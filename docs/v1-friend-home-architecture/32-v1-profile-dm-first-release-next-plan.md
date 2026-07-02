# V1 Profile And DM First Release Next Plan

This is the active next plan after
`31-v1-profile-p2p-release-next-plan.md`.

The product rule is now stricter:

```text
Profile -> friend request -> mutual trust -> Contacts / Chat / Profile posts
DM/profile delivery -> normal social delivery
Home -> explicit trusted live space only
```

Home should have no relation to adding friends. It should be useful, but lower
priority than Profile, Contacts, Chat, and Treehole.

## Decision

V1 should ship as a private IM built on profile-to-profile P2P delivery.

Normal social delivery uses profile and DM concepts:

- friend request
- friend request receipt state
- accept
- DM bootstrap
- durable pairwise Chat
- profile posts and recent-post reads
- post-trust Home descriptor delivery

Normal social delivery must not use these product routes:

- Home join
- Home peer count
- Home-control request broadcast
- Home-control accept or DM bootstrap
- Home QR as a second friend model
- direct host:port

Direct host:port and Home-control fallback can exist only as diagnostics or
legacy support. They are not production delivery.

## Product Model

Kepos V1 is a person-first private IM.

- Profile is the user's social address.
- Contacts is the trust and request-state surface.
- Chat is the durable private conversation surface.
- Treehole is the local user's profile post surface.
- Profile detail shows Message, recent posts, and explicit Enter Home.
- Home is a live/session space after trust, not the way trust is created.

The expected user loop:

1. A scans B's Profile QR.
2. A sends a friend request to B's profile route.
3. B sees the request in Contacts.
4. B accepts.
5. Both sides have mutual trust.
6. Both sides can Chat and view profile posts.
7. Either side can explicitly Enter Home if a trusted Home descriptor exists.

No step requires entering Home.

## UX Rule

The UI should teach one mental model:

```text
add friend -> contact -> chat/profile -> optional Home
```

Desktop and Android should expose the same product facts:

- bottom navigation or main surfaces: Home, Chat, Contacts, Treehole
- Profile QR is the normal add-friend code
- Contacts owns incoming and outgoing request state
- Chat list shows trusted friends with last-message preview when available
- Profile detail owns Message, recent posts, and Enter Home
- Treehole creates the user's own profile posts
- Home QR and manual entry are advanced/debug surfaces

Home can stay visible as a main tab, but it must not dominate onboarding or
friendship. The first working social path must be Contacts and Chat.

## Architecture Rule

The production dependency direction is:

```text
Identity -> Profile delivery -> ContactBook trust -> DM -> Profile posts
                                             -> optional Home descriptor
```

It is not:

```text
Home -> friend request -> trust -> Chat
```

Implementation should keep these boundaries clear:

- shared TypeScript domain code owns QR payloads, signed records, request
  states, trust policy, profile delivery policy, DM policy, Home descriptor
  policy, and profile detail view models
- desktop and Android code own rendering, storage adapters, camera, Electron,
  React Native, and runtime glue
- platform code may call Home only for explicit Home actions
- tests should fail if normal add-friend, accept, DM bootstrap, or Chat requires
  Home readiness

## Next Implementation Order

### 1. Remove Remaining Home-Centric Product State

Audit desktop and Android for normal social actions that still read or gate on:

- `homeReady`
- `homeRoomKey`
- joined Home runtime
- Home peer count
- Home descriptor except for explicit Enter Home
- Home-control request or DM invite fallback

Done means Profile QR scan, Send request, Accept, Contacts open, Chat open,
Treehole post, and Profile detail can work before Home is opened.

Debug code may remain, but names and copy must say debug, diagnostics, or
legacy.

### 2. Make Request And Chat UX Match On Both Clients

Both clients should support the same user-facing states:

- incoming request
- outgoing request: queued, searching, sent, delivered, accepted, failed
- trusted contact
- removed or ignored contact
- Chat thread for trusted contact
- Profile detail for trusted contact

Android currently needs special attention because the visible UI has lagged
behind desktop. The Android surface should show the same four product areas:

```text
Home / Chat / Contacts / Treehole
```

Buttons may be icon-only in the main bar, but the product states must be
reachable and clear.

### 3. Treat Home As A Post-Trust Activity Surface

Home actions should be explicit:

- Open my Home
- Enter trusted contact's Home
- Debug Home QR
- manual/debug entry

Home actions should not be implicit side effects of:

- scanning a Profile QR
- sending a request
- accepting a request
- opening Chat
- viewing profile posts

The only normal Home-related social delivery is a signed Home descriptor sent
after trust, so the trusted contact can later tap Enter Home.

### 4. Add Low-Cost Proof Before Physical Smoke

Add or keep source tests that prove:

- Profile QR payload does not carry Home descriptors
- Send request does not require Home key or Home readiness
- Accept does not require Home membership
- DM bootstrap uses profile delivery, not Home control
- Chat survives Home leave
- Treehole owner posts do not require Home entry
- Enter Home requires a trusted descriptor
- debug Home fallback names cannot look like production names

Then run:

```sh
npm test -- test/v1-docs-current-state.test.js test/mobile-mlp-ui.test.js test/profile-friend-request-transport.test.js test/desktop-control-actions.test.js test/desktop-message-request-actions.test.js test/desktop-backend-session.test.js test/android-backend-bundle.test.js
npm run lint
npm run v1:gate
```

### 5. Run Final Physical Proof Only After The Cheap Gates

Do not spend phone time until the source-level route is clean.

The final proof still uses `../v1.21-cross-device-smoke.md` and must produce:

```sh
tmp/final-v1-proof.md
```

checked by:

```sh
npm run v1:proof:check -- --file tmp/final-v1-proof.md
```

The proof must show:

- physical Profile QR scan sends a request
- receiver sees the request without entering Home
- accept creates mutual trust without entering Home
- Chat works without entering Home
- profile posts are visible through Profile detail when available
- local Treehole posts survive restart
- durable Chat survives restart
- Enter Home works only as an explicit post-trust action
- revoke blocks future access

## Done Means

- V1 has one normal add-friend path: Profile QR.
- V1 has one production social delivery model: profile/DM P2P.
- Home has no role in friendship, accept, DM bootstrap, or Chat.
- Home is only an explicit trusted live/session surface.
- Desktop and Android expose the same product model.
- Debug surfaces are visibly debug.
- The final proof packet passes.

## Non-Goals

- Do not implement V2 media rooms.
- Do not implement V3 local-service or RetroArch work.
- Do not add group chat.
- Do not add multi-device identity.
- Do not design Home invite as a trust grant.
