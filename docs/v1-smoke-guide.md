# Kepos V1 Smoke Guide

This guide is the manual parity check for desktop and Android.

## Build Gates

Run these before device smoke:

```sh
npm run v1:gate
```

`npm run v1:gate` runs lint, tests, TypeScript compatibility probes, Bare Android bundle checks,
Expo Android JS export, and APK native-library alignment checks.

`npm run android:assemble` is the stronger APK build gate when a fresh native build is needed.

Current automated coverage proves lint, tests, typecheck, Android bundle creation, Expo Android JS bundle creation, and APK native-library alignment. It does not prove device runtime behavior; the two-device path below is still required.

`test/v1-model-smoke.test.js` covers the shared V1 model path with one owner and one peer:

- profile QR trust in both directions
- trusted-only home access after local trust
- treehole writer grant policy from ContactBook
- owner-only treehole posts plus trusted comments and likes
- one message request accepted into a durable DM thread
- signed DM messages persisted through the shared runtime/storage APIs
- revoke blocking future treehole writer grants

This is model evidence only. It does not exercise camera scan permissions, Pear desktop runtime, Android Bare lifecycle, live Hyperswarm transport, or rendered UI state.

## Basic CLI Smoke

Desktop smoke uses Playwright's Electron support and launches the real Electron app with an isolated
temporary profile:

```sh
npm run smoke:desktop
```

Expected:

- renderer bundle is built before launch
- profile URI starts with `kepos://profile`
- home URI starts with `kepos://home`
- Create Home joins a home
- treehole state reaches ready

Android smoke uses Maestro against the installed standalone Android app. This is intentionally a
basic UI smoke while the mobile UI is still moving:

```sh
npm run smoke:android
```

Install Maestro when needed:

```sh
brew tap mobile-dev-inc/tap
brew install --formula mobile-dev-inc/tap/maestro
```

The `maestro` cask installs the GUI app; the formula installs the CLI used by `npm run
smoke:android`.

Expected:

- lobby exposes stable React Native test IDs
- Create Home opens the room view
- Chat and Treehole tabs are visible

This smoke does not try to prove camera QR scan behavior. Use the manual checklist below for QR
camera permission and scan handling until the UI stabilizes enough to justify fuller automated
camera coverage.

A debug two-device smoke can exercise the live desktop/Android transport without relying on camera
scan or fragile long-text input through the Android keyboard:

```sh
npm run smoke:two-device:debug
```

This launches desktop with Playwright, reads Android's profile URI from the UI hierarchy, writes an
Android app-private ContactBook entry through `adb run-as`, joins the desktop home through the
manual 64-character debug key path, and verifies peer connection, room chat, and desktop-to-Android
treehole replication. It then verifies message request acceptance, signed DM body exchange, Android
DM persistence across restart, post-restart DM delivery, and the desktop revoke path closing the
accepted DM receive path. It is useful CLI evidence for the live runtime, but it does not replace
the QR camera checklist below.

The desktop app in this debug smoke uses a temporary Electron `userDataDir`, and the script deletes
that directory when it exits. Contacts created in this smoke are expected to disappear from the
smoke desktop profile and will not appear in a normal manually launched desktop profile.

`smoke:android` assumes the app is already installed on a connected device or emulator and can load
its JS bundle. For the local debug APK, keep Metro running:

```sh
adb reverse tcp:8081 tcp:8081
npm run mobile:start
```

Use `npm run android:assemble` and
`adb install -r android/app/build/outputs/apk/debug/app-debug.apk` when a fresh APK is needed.

## Start Desktop

Install desktop runtime dependencies once:

```sh
npm run desktop:install
```

Run the desktop app:

```sh
npm run desktop
```

Expected:

- desktop lobby opens
- profile QR image is visible
- home QR image is visible
- text URI fields remain available as debug fallback

## Start Android

Run on a connected Android device:

```sh
npm run android
```

Expected:

- Android lobby opens
- profile QR image is visible
- home QR image is visible
- Scan Home QR and Scan Profile QR open the camera after permission

If testing through ADB, keep the device unlocked. A black screenshot while `dumpsys power` reports
`mWakefulness=Dozing` or while `mCurrentFocus` is `NotificationShade`/`AlternateBouncerView` is
device lock state, not Kepos UI evidence.

Useful checks:

```sh
adb -s <serial> shell dumpsys power | rg 'mWakefulness|mState='
adb -s <serial> shell dumpsys window | rg 'mCurrentFocus|mFocusedApp'
adb -s <serial> shell pidof io.guion.kepos
```

## Two-Device Path

Use one desktop and one Android profile.

1. Desktop: Create Home.
2. Android: scan desktop profile QR.
3. Android: trust the desktop profile.
4. Desktop: import or scan Android profile URI.
5. Desktop: trust the Android profile.
6. Android: scan desktop home QR.
7. Android: join desktop home.
8. Both: verify peer count increases.

Expected:

- raw room keys are not needed for the normal path
- trust is written to ContactBook
- trusted-only home join succeeds only after profile trust exists
- treehole bootstrap and writer capabilities are shared only after the owner sees a signed home hello from a trusted profile

## Room Chat

1. Desktop sends a home chat message.
2. Android receives it.
3. Android sends a home chat message.
4. Desktop receives it.

Expected:

- room chat is ephemeral
- messages appear only in the room chat pane
- DM panes do not show room chat messages

## Treehole

1. Desktop owner creates a treehole post.
2. Android sees the post after joining trusted home.
3. Android comments on the post.
4. Android likes the post.
5. Desktop sees the comment and like.

Expected:

- owner can create main posts
- trusted non-owner can comment and like
- trusted non-owner cannot create main posts in the owner's treehole

## Message Request And DM

1. Android opens DM tab.
2. Android selects the desktop contact chip.
3. Android sends one message request.
4. Desktop accepts the request.
5. Both sides show the trusted contact as a DM recipient option.
6. Android sends a DM body through the contact chip.
7. Desktop receives it.
8. Desktop replies.
9. Android receives it.
10. Restart both apps and rejoin the home.
11. Send another DM.
12. Desktop revokes the Android contact.
13. Android sends another DM.

Expected:

- message request travels over home control path
- accepted request creates trust and a durable DM thread
- signed DM bodies use dedicated DM replication, not the home room
- DM messages persist locally per thread
- DM messages do not appear in home chat
- revoked contacts are removed from desktop trusted contacts and DM recipients
- desktop closes the accepted DM receive path for the revoked contact

## QR Failure Checks

1. Scan a non-Kepos QR.
2. Scan a tampered profile/home URI.
3. Deny camera permission.

Expected:

- invalid QR does not write trust or join home
- tampered signed URI is rejected
- permission denial is visible and does not crash the app

## Known V1 Limits

- each device is its own profile
- revoke blocks future access but does not delete already replicated data
- desktop camera scan is deferred
- manual URI/key entry remains as debug or support fallback
