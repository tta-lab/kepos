# Kepos Cross-Device Smoke Recipe

This is the project-level recipe for agents validating Kepos across desktop and Android.
It complements `docs/v1-smoke-guide.md`, which is the manual user checklist.

## Purpose

Use this recipe before calling V1 or a cross-device change ready.

The goal is not to click every screen. The goal is to prove the product path:

- desktop and Android can start
- identities persist
- trust can be created
- trusted home join works
- room chat stays in the room
- treehole sync respects owner/trust rules
- DM setup and body traffic stay separate from room chat
- durable DM survives restart
- revoke blocks future access

## Gates

Run the strongest practical gate first:

```sh
npm run v1:gate
```

Use a fresh APK gate when native Android output changed:

```sh
npm run android:assemble
```

Then run the CLI smoke set:

```sh
npm run smoke:desktop
npm run smoke:desktop:contacts
npm run smoke:android
npm run smoke:two-device:debug
```

`smoke:two-device:debug` is allowed to use debug import paths because it proves live transport,
storage, restart, and revoke without depending on camera focus or long Android text input.

## Manual Physical QR Check

Run this when QR rendering, scanner UI, camera permissions, layout, or release confidence changed:

1. Start desktop and Android.
2. Desktop creates a home.
3. Desktop opens Large Profile QR.
4. Android scans it and creates trust.
5. Desktop trusts Android through URI import or scan.
6. Desktop opens Large Home QR.
7. Android scans it and joins the trusted-only home.

Expected:

- Android shows a real camera preview before scanning.
- No raw 32-byte room key is needed.
- Profile QR creates trust.
- Home QR joins only after trust exists.
- The scanner can be cancelled without breaking lobby state.

## Persistence Checks

Always include restart evidence when touching identity, contacts, home state, DM threads, or storage:

- desktop contact remains after desktop restart
- Android identity remains after app restart
- DM thread metadata remains after restart
- prior DM messages remain in the thread after restart
- a new DM can still be sent after restart

If a smoke uses a temporary desktop `userDataDir`, contacts are expected to disappear after that
smoke exits. Do not confuse that with normal desktop profile persistence.

## Isolation Checks

Verify these flows do not leak into each other:

- room chat messages do not appear in DM panes
- DM bodies do not appear in room chat
- treehole posts are not treated as room messages
- public home access does not grant treehole read
- trust grants treehole access and DM eligibility

## Revoke Checks

For revoke-sensitive changes, verify:

- revoked contacts leave trusted contact lists
- revoked contacts leave DM recipient options
- accepted DM receive paths are closed for future traffic
- previously replicated data is not promised to disappear

## Device State Checks

Before blaming Kepos UI, check device state:

```sh
adb shell dumpsys power | rg 'mWakefulness|mState='
adb shell dumpsys window | rg 'mCurrentFocus|mFocusedApp'
adb shell pidof io.guion.kepos
```

Locked Android screens, notification shade, or missing Metro should be treated as test environment
state until proven otherwise.

## Cleanup

Before reporting completion, stop dev servers and app processes started only for smoke, then check:

```sh
pgrep -fl 'expo start|mobile:start|Electron.app|smoke-two-device|smoke-android|maestro test' || true
```

The final report should name which gates and smoke paths passed, and whether physical QR was run by
the agent or by the user.
