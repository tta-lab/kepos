# V1 Profile-First Implementation Plan

This is the concrete next plan for finishing the V1 person-first IM flow.

The goal is not to add another transport shortcut. The goal is to make Profile, Contacts, friend request, DM, Treehole, and Home line up under one product model.

## Done Criteria

V1 is ready when these are true on desktop and Android:

- scanning a Profile QR creates a request target without entering Home
- sending a friend request uses profile-to-profile P2P delivery
- the receiver sees the incoming request without Home peer membership
- accepting creates mutual trust and a durable DM thread
- Chat shows friends like an IM contact list with last-message preview
- Contacts opens a profile page with DM, recent posts, and explicit Enter Home
- Treehole remains the owner's personal post surface
- Home is an optional live space, not the social bootstrap
- request states are honest: queued, searching, sent, accepted, or failed
- direct host:port is not part of the production add-friend path

## Product State Machine

### Contact States

The shared model should treat contacts as a small state machine:

- `none`: profile is unknown locally
- `target`: profile was scanned or selected, but no request exists
- `outgoing-request`: local user sent a request
- `incoming-request`: remote profile sent a request
- `friend`: mutual trust exists
- `revoked`: local user removed trust

Home membership is not a state in this machine.

### Request Delivery States

Friend request delivery should use these states:

- `queued`: local request exists, but no transport has accepted it yet
- `searching`: P2P route is looking for the target profile
- `sent`: the signed request was written to a connected profile route
- `accepted`: the target accepted and trust/DM bootstrap completed
- `failed`: delivery cannot continue without user action or a retry

Do not show `delivered` until there is an explicit receiver acknowledgement.

## Architecture Split

### Shared TypeScript Domain

Shared code should own:

- Profile QR parse result normalization
- friend request target creation
- signed request verification
- contact book transitions
- delivery-state updates
- DM request/accept records

Platform UI should not duplicate this logic.

### Desktop Runtime

Desktop should:

- start the profile request listener when the local profile starts
- send outgoing friend requests through the profile request runtime
- update contact book delivery state from runtime callbacks
- show incoming requests from the profile listener
- keep Home runtime only for explicit Home entry and live-room traffic

### Android Runtime

Android should match desktop product logic.

Android should:

- start profile services after local profile load, before Home entry
- send outgoing friend requests through `RPC_PROFILE_REQUEST_SEND`
- listen for incoming profile requests through the backend worklet
- update contact book delivery state from `RPC_PROFILE_REQUEST_STATE`
- keep the bottom navigation aligned with desktop: Home, Chat, Contacts, Treehole
- not require Home join for friend request delivery

The Android backend may still be JS/MJS runtime glue, but product/domain logic should come from shared TypeScript modules where the loader path is proven.

## Implementation Order

## Current Status

The profile-level friend request route is now implemented far enough for code-level proof:

- shared runtime derives a target profile request topic
- receiver listens on its own profile request topic
- sender joins the target profile request topic
- signed friend requests are verified before entering UI state
- desktop starts the profile request runtime independently of Home
- Android starts profile services after profile load and sends requests through `RPC_PROFILE_REQUEST_SEND`
- Android receives delivery updates through `RPC_PROFILE_REQUEST_STATE`
- Android leaving Home does not close the profile request service

The next implementation block is accept / DM invite delivery:

- accepting an incoming request should not require `room`
- the DM invite should be delivered over a profile-level route or an equivalent profile bootstrap channel
- Home-control invite broadcast should become debug fallback or be removed from the normal path

### Phase 1: Lock The Shared Model

Finish and test:

- `profile-friend-request-transport`
- `contact-book` delivery-state updates
- duplicate incoming request protection
- signed request verification before UI state changes

Gate:

```sh
npm test -- test/profile-friend-request-transport.test.js test/contact-book.test.js
npm run typecheck
```

### Phase 2: Finish Desktop Profile Delivery

Wire desktop so Profile QR requests are truly profile-level:

- profile runtime starts with the local profile
- outgoing request calls the profile transport
- incoming request enters the same pending-request UI as any other request
- delivery state updates are persisted
- Home-control request delivery is no longer used by the normal path

Gate:

```sh
npm test -- test/desktop-backend-session.test.js test/desktop-message-actions.test.js test/desktop-mlp-shell.test.js
```

### Phase 3: Finish Android Profile Delivery

Wire Android to the same model:

- add profile-service RPC commands
- start profile request listener after profile load
- send Profile QR friend requests through the profile service
- update outgoing request state from backend delivery callbacks
- show incoming requests without Home membership

Gate:

```sh
npm test -- test/mobile-mlp-ui.test.js test/android-backend-bundle.test.js
npm run typecheck
```

### Phase 4: Align UI Around IM

Make the first V1 experience feel like private IM plus personal space:

- Chat: friend list and last-message preview
- Contacts: profile rows and explicit profile pages
- Profile page: DM, recent posts, Enter Home
- Treehole: owner post composer and personal feed
- Home: explicit live room with room chat

Keep core bar icons icon-only when the icon is obvious. Use `Home`/house for Home, not a door.

Gate:

```sh
npm test -- test/mobile-mlp-ui.test.js test/desktop-mlp-shell.test.js
```

### Phase 5: Cross-Device Proof

Manual smoke is expensive, so only run it when the implementation gates pass or when the user asks.

Release smoke:

1. Desktop starts and shows Profile QR.
2. Android starts from a clean or known profile.
3. Android scans desktop Profile QR.
4. Android sends friend request.
5. Desktop receives incoming request while Home peers may be zero.
6. Desktop accepts.
7. Both clients show each other as friends.
8. Android and desktop can exchange DM messages.
9. Android can open desktop profile and see available recent posts.
10. Android can explicitly Enter Home as a separate action.

If step 5 only reaches `queued` or `searching`, the UI must say so honestly. It must not claim desktop received the request.

## Remove Or Quarantine

Remove from the normal path:

- auto-entering Home to add a friend
- Home QR as the normal add-friend route
- Home-control request delivery for production add-friend
- direct host:port friend request delivery
- UI copy that treats trust as Home access

Keep only as debug or explicit live-room behavior:

- Home QR or Home descriptor
- Home control messages
- room chat
- explicit activity/session invites

## Open Technical Questions

These are not product blockers, but they must be answered before calling the transport final:

- whether profile request topics need an acknowledgement frame for `delivered`
- how long queued requests retry before showing a visible problem
- whether request topics should be encrypted in addition to signed
- how Android should keep profile services alive when the app is backgrounded
- whether leaving Home should close only Home or also the profile service

V1 can ship without all of these solved if the UI state is honest and the core add-friend path works.

## Working Rule

When behavior is unclear, prefer this order:

1. Profile identity
2. Contact/trust state
3. DM state
4. Treehole authorization
5. Home session state

Do not let a lower layer redefine a higher product fact.
