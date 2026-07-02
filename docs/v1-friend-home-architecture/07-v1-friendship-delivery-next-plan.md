# V1 Friendship Delivery Next Plan

This is the next execution plan after the profile-level request transport and
profile-level DM invite path landed.

The job now is to make the product logic boring:

```text
Profile QR -> friend request -> accept -> mutual trust -> DM/contact/profile
```

Home must stay out of that sentence.

## Current Baseline

Implemented:

- Profile QR creates a person/profile target, not a Home join target.
- Android sends normal friend requests through `RPC_PROFILE_REQUEST_SEND`.
- Desktop sends outgoing message requests through the profile request runtime.
- Desktop and Android start a profile request listener outside Home entry.
- Leaving Home on Android no longer closes the profile request service.
- Accepting an incoming request no longer requires Home membership.
- Signed DM invites now travel over the same profile-level P2P route.
- Incoming profile-level requests and invites are verified before entering UI
  or DM state.

Still not finished:

- There is no receiver acknowledgement frame yet, so UI must not claim
  `delivered`.
- Cross-device proof with Home peers at zero is still manual and expensive.

Now completed in source:

- Desktop Home-control request and invite handling is ignored by default.
- Desktop profile-source request and invite handling stays accepted.
- Android Home-control request and invite handling is ignored by default.
- Legacy Android `RPC_DM_SEND` requires explicit Home trust fallback.
- Automated tests prove request receive, accept, and invite return without Home.

## Architecture Rule

Production friend bootstrap has one route:

```text
profile-to-profile P2P transport
```

Production friend bootstrap must not use:

- Home control broadcast
- direct host:port
- automatic Home join
- Home QR as the normal social entry point

Home remains valid for:

- explicit Enter Home
- live room chat
- presence and current live-space state
- future activity/session invites between already trusted profiles

## Next Implementation Block

### 1. Quarantine Home-Control Friend Bootstrap

Status: implemented in source and tested.

Change Home-control request and invite handling from "normal compatibility
path" to "explicit debug fallback."

Desktop:

- `desktop-control-actions` should know whether a control frame came from
  `profile` or `home`.
- Profile-source request/invite frames stay accepted.
- Home-source request/invite frames are ignored by default.
- A debug flag may re-enable Home fallback, but it must be named as fallback.

Android:

- Backend Home-control request/invite handling should be ignored by default.
- Legacy `RPC_DM_SEND` should not be a normal send path.
- Any Home fallback should require an explicit debug flag.

Acceptance:

- Normal mobile UI still uses `RPC_PROFILE_REQUEST_SEND`.
- Normal desktop accept still sends the invite through profile transport.
- Tests prove Home-control request/invite frames do not create friend/DM state
  unless fallback is explicitly enabled.

### 2. Add Code-Level Proof For Request Accept Without Home

Status: implemented in source and tested.

Add an automated test that proves:

1. A signed request can arrive from the profile route.
2. Accepting it creates the local trust/DM bootstrap result.
3. The signed DM invite is sent back through the profile route.
4. No Home runtime or Home membership is required.

This test does not replace real phone smoke. It prevents future refactors from
accidentally reintroducing Home as a hidden dependency.

### 3. Keep Delivery Wording Honest

Status: still open until acknowledgement frames exist.

Until receiver acknowledgement exists:

- `queued` means local request exists.
- `searching` means the profile route is looking for the target.
- `sent` means the frame was written to a connected route.
- `accepted` means the receiver accepted and invite/trust bootstrap completed.

Do not show `delivered` in product UI until an explicit ack frame exists.

### 4. Align Docs And Smoke Instructions

Status: partly done. Smoke docs still need the final release-proof wording pass
when manual cross-device proof is ready.

Update smoke docs to say:

- manual cross-device smoke is the final proof, not the default verification
  step for every code change
- the key V1 proof is Profile QR request and accept while Home peers are zero
- Enter Home is tested as a separate feature after trust exists

## Test Gate

Run focused tests first:

```sh
npm test -- test/profile-friend-request-transport.test.js test/desktop-message-request-actions.test.js test/desktop-control-actions.test.js test/desktop-backend-session.test.js test/android-backend-bundle.test.js test/mobile-mlp-ui.test.js
```

Then run the normal non-device gate:

```sh
npm test
npm run lint
```

Do not run physical Android smoke unless explicitly requested or unless the
code gate is green and we are producing a release proof packet.

## Manual Proof Later

When the user is ready to spend phone time, run this one path:

1. Desktop opens My QR.
2. Android scans desktop Profile QR.
3. Android sends friend request.
4. Desktop receives the request while Home peer count may be zero.
5. Desktop accepts.
6. Android receives the profile-level DM invite.
7. Both sides show each other as friends.
8. Chat opens from the friend row.
9. DM survives restart.
10. Enter Home is tested after trust, not before.

If step 4 only reaches `queued` or `searching`, that is a transport reachability
problem. It should not be hidden by entering Home.

## Non-Goals

- Do not build V2 media rooms here.
- Do not add direct host:port fallback.
- Do not make Home QR a second primary friend path.
- Do not redesign the whole UI before the friend bootstrap path is clean.
- Do not treat manual smoke as a substitute for source-level separation.

## Completion Bar

This plan is done when:

- profile route is the only normal friend request and accept route
- Home-control friend bootstrap is debug-only or removed
- automated tests prove accept/invite without Home
- docs and smoke instructions match the product model
- manual cross-device smoke has one clear path left to run
