# V1 Profile-Only Social Route Next Plan

This is the active next plan after
`29-v1-profile-delivery-home-demotion-next-plan.md`.

The product rule is now final for V1:

```text
Profile QR -> friend request -> accept -> mutual trust -> Contacts / Chat / Profile posts
Home -> explicit live room or activity surface after trust
```

Home has no role in adding a friend.

## Decision

V1 has one production social route:

```text
profile-to-profile P2P delivery
```

V1 should not keep these as product routes:

- Home-control friend request delivery
- Home-control accept or DM bootstrap
- direct host:port delivery
- automatic Home join after scan
- Home QR as a second add-friend model

Direct host:port can stay as diagnostics or developer support only. It should
not be presented as a normal product fallback, because it teaches the wrong
model and does not match the cross-region P2P goal.

## Product Model

The product is a profile-first private IM.

- A Profile is the social address.
- Contacts is the trusted people list.
- Chat is durable pairwise messaging with trusted profiles.
- Treehole is the user's own profile post surface.
- A friend's Profile shows Message, recent posts, and explicit Enter Home.
- Home is a later live/session surface, not authorization.

Adding a friend means:

```text
I want mutual trust with this profile.
```

It must not mean:

```text
I want to join this person's Home.
```

## Delivery Model

All normal social records should ride the profile route:

- friend request
- request accept
- DM bootstrap invite
- DM messages
- profile-level Home descriptor after trust
- future profile updates
- future activity invites between already trusted profiles

Home descriptor delivery is allowed only after trust. It exists so the user can
tap `Enter Home` later without scanning a second debug QR. It is not a trust
grant and must not be embedded in Profile QR.

If a descriptor arrives before the local ContactBook has marked the sender as
trusted, the app may buffer it briefly and apply it after trust is created. It
must not expose Home entry before trust.

## UX Model

There is one normal add-friend path:

1. User scans Profile QR.
2. Scanner sees a profile request target.
3. Scanner sends a friend request over profile P2P delivery.
4. Receiver sees the incoming request in Contacts.
5. Receiver accepts.
6. Both sides become trusted contacts.
7. Chat and Profile work without entering Home.
8. Enter Home is a separate action if a trusted Home descriptor exists.

The UI should make Home feel lower priority than Contacts and Chat:

- bottom or primary nav still includes Home, Chat, Contacts, Treehole
- Contacts and Chat are the normal result of trust
- Profile detail is the bridge to Message, posts, and Enter Home
- Home QR and raw room fields are advanced/debug, not onboarding
- copy should say `Add friend`, `Message`, `View profile`, `Enter Home`
- copy should not say `Home invite` when it means friend request

## Architecture Rule

Product code should depend on these sources of truth:

- identity for signed profile ownership
- ContactBook for trust state
- profile P2P runtime for social delivery
- DM thread state for durable private messages
- treehole log/policy for profile posts
- Home descriptor only for explicit live-room entry

Product code should not depend on:

- Home peer count for friend request success
- joined Home session for accept or DM bootstrap
- direct host/port as production reachability
- Profile QR carrying room capability

## Next Implementation Order

### 1. Finish The Descriptor Race Fix

Post-trust Home descriptor delivery is already implemented at source level, but
there is a real ordering risk:

```text
DM invite creates trust
Home descriptor arrives just before ContactBook update is applied
```

The receiver should buffer a valid profile-delivered descriptor by owner profile
ID when the sender is not trusted yet, then apply it after the DM invite creates
trust. This keeps the rule strict while avoiding flaky `Enter Home`.

Also make the requester send its own local Home descriptor back after accepting
the DM invite, so Home entry is not one-way.

Status: implemented.

Evidence:

- Desktop buffers valid profile-delivered Home descriptor frames when the owner
  is not trusted yet, then applies the pending descriptor after a profile DM
  invite creates trust.
- Desktop replies with the local signed Home descriptor after accepting a
  profile-delivered DM invite.
- Android backend replies with the local signed Home descriptor both after
  accepting a friend request and after accepting the returned DM invite.
- Mobile buffers verified Home descriptor frames until the matching outgoing
  request becomes a trusted contact through the DM thread event, then stores the
  descriptor through the normal trusted ContactBook gate.
- Home descriptors still do not grant trust and still do not come from Profile
  QR.

Focused proof:

```sh
npm test -- test/desktop-control-actions.test.js test/desktop-backend-session.test.js test/android-backend-bundle.test.js test/mobile-mlp-ui.test.js
npm run lint
npm run v1:gate
```

### 2. Align Desktop And Android Product Logic

Both clients should expose the same nouns and same state transitions:

- Profile QR creates a request target.
- Send request does not enter Home.
- Accept request does not enter Home.
- Friend appears in Contacts.
- Chat opens from Contacts and Chat.
- Profile detail shows Message, posts, and Enter Home.
- Enter Home is disabled or unavailable until a trusted descriptor exists.
- Debug Home QR/direct fields are not primary UI.

Where possible, shared TypeScript modules should own the product rules.
Platform code should own rendering, storage adapters, camera, and runtime glue.

Status: in progress.

Evidence added after the descriptor race fix:

- Desktop Home lifecycle no longer owns social runtime lifecycle. Entering or
  leaving Home closes Home/Treehole runtime state only; it does not close the
  profile request runtime and does not restart or clear the durable DM session.
- Android leave-Home UI already leaves durable Chat session state intact; a
  regression test now locks that behavior.
- Desktop and Android still keep explicit Enter Home as a separate action from
  Profile QR, request send, request accept, and Chat open.

### 3. Remove Or Quarantine Legacy Product Paths

Audit normal user actions and tests for hidden fallback:

- Home-control request handling should be ignored by default or marked legacy.
- Home-control DM invite handling should not be a normal path.
- direct host/port should be diagnostics only.
- `join Home` should never be called by scan, request send, accept, or open Chat.

If legacy compatibility remains, it must be named as compatibility or debug in
code and tests.

### 4. Prove The Profile-Only Route With Low-Cost Gates

Use focused proof before physical smoke:

```sh
npm test -- test/profile-friend-request-transport.test.js test/desktop-control-actions.test.js test/desktop-message-request-actions.test.js test/desktop-backend-session.test.js test/android-backend-bundle.test.js test/mobile-mlp-ui.test.js
npm run lint
npm run v1:gate
```

Physical desktop/Android smoke is reserved for final release proof or bugs that
cannot be proven another way.

### 5. Final V1 Proof

V1 is not ready until the final proof packet passes:

```sh
npm run v1:proof:check -- --file tmp/final-v1-proof.md
```

The proof must show:

- physical Profile QR scan works
- request receipt happens with Home peer count at zero
- accept and DM bootstrap happen with Home peer count at zero
- outgoing request state survives restart before acceptance
- ignored request can be allowed and resent
- Contacts and Chat both lead to the same trusted profile detail
- durable Chat survives restart
- local Treehole posts survive restart
- trusted profile recent posts are visible when available
- explicit Enter Home works after trust and descriptor delivery
- revoke blocks future access

## Done Means

- There is one normal add-friend path: Profile QR to friend request.
- Home has no role in creating trust.
- Production delivery is profile-to-profile P2P, not direct host/port.
- Chat, Contacts, Profile, and Treehole work without Home entry.
- Home entry is explicit and post-trust.
- Desktop and Android expose the same product model.
- Final physical proof passes.

## Non-Goals

- Do not start V2 media rooms.
- Do not start V3 local-service or RetroArch sessions.
- Do not add group chat.
- Do not add multi-device identity.
- Do not add a Home invite trust model.
- Do not promote direct host/port as a product fallback.
