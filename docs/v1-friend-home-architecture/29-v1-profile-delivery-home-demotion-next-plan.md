# V1 Profile Delivery And Home Demotion Next Plan

This is the active next plan after
`28-v1-profile-delivery-home-independent-next-plan.md`.

The decision is now stricter than "Home is not required for friend requests":
Home should have almost no role in the normal IM product path.

```text
Profile QR -> friend request -> accept -> Contacts / Chat / Profile posts
Home -> explicit live room or later activity surface after trust
```

## Product Rule

Kepos V1 is a profile-first private IM.

- A person has one profile.
- A profile is the social address.
- Profile QR is the only normal add-friend QR.
- Friend request delivery uses profile-to-profile P2P.
- Accept creates mutual trust at the profile relationship layer.
- Chat and profile posts are reached from Contacts, Chat, and Profile.
- Home is only an optional live room after trust.

Home must not be used as:

- the add-friend model
- the authorization model
- the friend request transport
- the DM bootstrap transport
- the normal private Chat fallback
- the reason two users can see each other's profile posts

If a feature needs an "invite" word, V1 should reserve that for trusted
activity/session invites after friendship already exists. It should not mean
"grant trust" or "join my Home to become my friend."

## Architecture Rule

The production social route is profile delivery:

```text
source profile -> target profile -> signed social record
```

The signed social records include:

- friend request
- friend accept / request-bound DM invite
- DM bootstrap
- DM message
- future lightweight profile updates
- future trusted activity/session invite

Home has its own route:

```text
trusted contact -> explicit Enter Home -> live room presence / room chat
```

Those routes may reuse the same low-level P2P stack, but product code should
not depend on Home to make social delivery work.

## UX Rule

The normal V1 product should feel like a small private messenger:

- `Contacts`: friends, incoming requests, outgoing requests, removed/ignored
  profiles, and profile details.
- `Chat`: friend list or thread list with last-message preview, then a durable
  pairwise conversation.
- `Treehole`: the user's own local post surface.
- `Profile`: a person's context: Message, recent posts, and explicit Enter Home
  when a signed Home descriptor is available.
- `Home`: live room state and room chat only.

Android and desktop can use different layouts, but they must expose the same
nouns and flows. A user should not learn one product on desktop and a different
product on Android.

## Home Descriptor Policy

Profile QR must not embed a Home descriptor.

The current source already enforces this for generated Profile QR payloads and
for scan handling: a Profile QR creates a profile request target, not a saved
Home descriptor.

For V1, there are only two allowed Home descriptor paths:

1. Advanced/debug Home QR after trust exists.
2. Profile-level post-trust delivery of a signed Home descriptor.

The second path is the better product route and should be implemented before
calling V1 ready if `Enter Home` is expected to work without manual debug QR
exchange. The receiver must only store the descriptor if the owner profile is
already trusted.

Do not restore Home descriptor embedding inside Profile QR to make `Enter Home`
easier.

## Next Implementation Order

### 1. Lock The Docs And Product Vocabulary

- Update docs that still imply Profile QR can carry a Home descriptor.
- Keep `Home QR` described as advanced/debug.
- Keep "invite" wording out of add-friend copy unless it means a trusted
  activity/session invite.
- Keep `AGENTS.md` pointing at this document as the active V1 plan.

Done means future code work has one source of truth for the V1 product model.

### 2. Implement Post-Trust Home Descriptor Delivery

Add a profile-level delivery frame for signed Home descriptors.

Rules:

- sender signs a `kepos.home.address.v1` payload
- sender delivers it over profile-to-profile P2P, not Home control traffic
- receiver verifies the signature
- receiver stores it only for an already trusted contact
- untrusted descriptors are ignored or kept only as a non-authorizing debug
  observation, not as a usable Home entry

This closes the gap created by correctly removing Home descriptors from Profile
QR.

### 3. Unify Desktop And Android Product Logic

Check both clients against the same model:

- bottom or primary navigation exposes Home, Chat, Contacts, Treehole
- Profile QR scan creates a request target
- request send and accept do not enter Home
- incoming requests appear in Contacts
- accepted friends appear in Contacts and Chat
- profile detail has Message, recent posts, and explicit Enter Home
- Enter Home is disabled or unavailable until a trusted descriptor exists
- debug Home QR and direct host/port are not normal user paths

Shared domain/view-model code should own the product state where possible.
Platform code should own rendering, camera, storage adapters, and runtime glue.

### 4. Run Low-Cost Proof Before Physical Smoke

Use focused tests and gates before asking for the phone:

```sh
npm test -- test/share-qr-service.test.js test/desktop-qr-service.test.js test/signed-qr-scan.test.js test/desktop-message-actions.test.js test/contact-book.test.js
npm run lint
npm run v1:gate
```

Physical cross-device smoke is reserved for the final release proof or for bugs
that cannot be proved another way.

### 5. Final Physical Proof

V1 is not done until `tmp/final-v1-proof.md` passes:

```sh
npm run v1:proof:check -- --file tmp/final-v1-proof.md
```

The final proof must show:

- physical Profile QR scan works
- request receipt happens with Home peer count at zero
- accept / DM bootstrap happens with Home peer count at zero
- outgoing request state survives restart before acceptance
- ignored request can be allowed and resent
- Contacts and Chat both lead to the same trusted profile detail
- durable Chat survives restart
- local Treehole posts survive restart
- trusted profile recent posts are visible when available
- explicit Enter Home works after trust and descriptor delivery
- revoke blocks future access

## Done Means

- The normal add-friend flow has one path: Profile QR to friend request.
- Home is visibly and technically demoted to live room/activity space.
- Profile delivery owns social delivery.
- Chat, Contacts, Profile, and Treehole work without entering Home.
- Desktop and Android expose the same V1 product model.
- The final physical proof packet passes.

## Non-Goals

- Do not start V2 media rooms.
- Do not start V3 local-service or RetroArch sessions.
- Do not add group chat.
- Do not add multi-device identity.
- Do not make direct host/port a product fallback.
- Do not make Home QR a second add-friend path.
