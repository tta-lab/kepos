# Research: V1 Local Storage And Migrations

## Question

What local persistence and migration approach should Kepos use for V1 identity, ContactBook, home, DM threads, and schema versions across desktop and Android?

## Recommendation

Use simple versioned JSON documents plus existing Corestore/Autobase directories for replicated logs. Do not add SQLite, MMKV, or AsyncStorage for V1 product state unless a later feature needs indexed queries, large lists, or secure native storage.

- Verified: Desktop currently persists profile identity and home room state as V1 JSON envelopes through a `localStorage`-shaped adapter in `src/local-profile.js`, with legacy key import for earlier prototype state.
- Verified: Android already depends on `expo-file-system`, writes profile/home identity envelopes under `FileSystem.documentDirectory`, imports earlier text files, and passes a `kepos` base URI into the Bare backend for treehole Corestore paths.
- Interpretation: JSON files are enough for V1 because the state shape is one device, one profile, one ContactBook, one owned home, and a small number of local DM thread metadata/message files. V1 does not need cross-record joins, full text search, or high-write indexed queries.
- Recommendation: Prefer app-private file storage on both platforms. On Electron, a later hardening step can move the same V1 envelopes from Chromium localStorage into a Node adapter rooted under `app.getPath('userData')/kepos/v1`. On Android, keep `expo-file-system/legacy` document storage and normalize `file://` URIs before passing paths to Bare. Current Android profile startup fails if `documentDirectory` is unavailable instead of silently falling back to `cacheDirectory` for identity/home/contact/DM state.

## Current Repo State

- Verified: `src/local-profile.js` reads/writes `kepos.v1.identity` and `kepos.v1.home` JSON envelopes using `globalThis.localStorage` by default, and imports the legacy keys `kepos.profile.id`, `kepos.identity.publicKey`, `kepos.identity.secretKey`, and `kepos.home.roomKey`.
- Verified: `src/mobile-profile.js` reads/writes `identity.json` and `home.json` V1 JSON envelopes under `<baseUri>/kepos/v1`, and imports the earlier text files `profile-id.txt`, `home-room-key.txt`, `identity-public-key.txt`, and `identity-secret-key.txt`.
- Verified: `mobile/App.jsx` imports `expo-file-system/legacy`, builds a backend storage base at `<documentDirectory>/kepos`, creates it, and passes it as `storageBasePath` to Bare.
- Verified: Android first-run identity/home generation uses `expo-crypto` secure random bytes. The React Native UI must not call `hypercore-crypto.keyPair()` or `hypercore-crypto.randomBytes()` without a native-safe seed/source, because that path can throw `No secure random number generator available`.
- Verified: `backend/backend.mjs` stores treehole Autobase/Corestore data through `createTreeholeStoragePath({ basePath, roomKey, bootstrapKey })` using a React Native-provided app-private storage base on Android.
- Verified: ContactBook, DM thread metadata, and DM messages now have versioned JSON serializers plus desktop/localStorage-style and Android file-system adapters.
- Verified: protocol records for signed records, trust grants, QR payloads, message requests, DM invites, DM messages, and treehole events carry explicit versions.

Current and future owner files/modules:

- `src/local-profile.js`: owns desktop/localStorage-shaped V1 identity and home envelopes plus legacy import.
- `src/mobile-profile.js`: owns the Expo FileSystem adapter for V1 identity/home JSON envelopes and legacy text-file import.
- `src/contact-book.ts` and `src/contact-book-storage.js`: own shared ContactBook domain rules, validation, serialization, and platform adapters.
- `src/dm-thread.ts`, `src/dm-thread-storage.js`, and `src/dm-message-storage.ts`: own durable DM metadata/message state.
- Later `src/local-store.js` or `src/persistence.js`: can centralize the envelope/migration dispatcher when a second schema version appears.
- Later `desktop/electron/main.cjs` or a desktop preload/main adapter: can move desktop V1 envelopes from Chromium localStorage to `app.getPath('userData')/kepos/v1`.

## Candidate Matrix

| Candidate                      | Fit                                         | Pros                                                                                                           | Cons                                                                                                                                                | V1 call                                |
| ------------------------------ | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Versioned JSON files           | High                                        | Transparent, testable, easy legacy import, works with Node and Expo FileSystem, enough for small local records | Need to write our own atomic write/backup/migration helpers                                                                                         | Use                                    |
| Expo FileSystem                | High on Android                             | Already installed; document directory is app storage; works with Bare path handoff after URI normalization     | Legacy API is async and file-oriented; cache fallback is unsafe for identity                                                                        | Use as Android adapter                 |
| Browser/Electron localStorage  | Medium prototype fit                        | Already works for desktop prototype profile keys                                                               | Tied to Chromium session storage, awkward for backups/migrations, not shared with Bare/Corestore path layout                                        | Migrate away for V1                    |
| AsyncStorage                   | Low                                         | Maintained key-value API; Expo docs include it; familiar for RN                                                | Android has default 6 MB total and about 2 MB per-entry read limits; strings only; adds another storage surface while FileSystem is already present | Do not add                             |
| Expo SQLite                    | Medium later fit                            | Maintained, persisted DB, supports migrations through `PRAGMA user_version`, SQLCipher option exists           | Adds database schema/query complexity V1 does not need; mobile-only unless desktop gets separate DB adapter                                         | Defer                                  |
| MMKV                           | Low for V1                                  | Fast sync key-value, native encryption option, custom path support                                             | Adds Nitro/native dependency, best for hot preferences not appendable JSON/thread files, remote debugging limits                                    | Do not add                             |
| Corestore/Autobase directories | High for treehole and later replicated logs | Already used for treehole; right tool for append-only replicated state                                         | Not a general settings/contact/document store                                                                                                       | Keep for treehole/replicated logs only |

## Proposed Persistence Layout

Root:

- Desktop: `<Electron app.getPath('userData')>/kepos/v1`
- Android: `<FileSystem.documentDirectory>/kepos/v1`
- Avoid `cacheDirectory` for identity, ContactBook, home, and DM. Cache can hold rebuildable data only.

Files:

```text
kepos/v1/
  manifest.json
  identity.json
  contact-book.json
  home.json
  dm/
    threads.json
    <thread-id>.json
  treehole/
    owned/
      <home-room-prefix>/
        corestore/
    joined/
      <owner-profile-prefix>-<bootstrap-prefix>/
        corestore/
  backups/
    corrupt/
```

JSON envelope:

```json
{
  "type": "kepos.identity",
  "schemaVersion": 1,
  "updatedAt": 1790000000000,
  "data": {}
}
```

Suggested documents:

- `manifest.json`: `schemaVersion`, app build/version, profile id, created/updated timestamps, last successful migration.
- `identity.json`: public key, secret key or key reference, createdAt. For V1 this may hold key material directly in app-private storage; later secure storage can replace the secret field with a native key reference.
- `contact-book.json`: ownerProfileId, contacts, trust/revoke/message-request state. This is the ContactBook SSOT for local trust and DM eligibility.
- `home.json`: ownerProfileId, roomKey, address, policy, treehole storage id/path metadata, createdAt.
- `dm/threads.json`: index of thread ids, remote profile ids, state (`pending`, `accepted`, `blocked`, `revoked`), last message metadata.
- `dm/<thread-id>.json`: bounded local thread state and messages for V1. If threads grow large, split into chunk files later without changing the adapter API.
- Treehole storage: keep Corestore directories separate from JSON documents and store only path/id metadata in `home.json`.

Legacy import path:

- Desktop: read existing localStorage keys once, write `kepos.v1.identity` and `kepos.v1.home`, then keep old keys available as debug/rollback support until a later cleanup step.
- Android: read the four existing text files from `<baseUri>/kepos`, write JSON documents under `<baseUri>/kepos/v1`, then keep old text files available as debug/rollback support until a later cleanup step.

## Migration And Corruption Policy

Migration pattern:

- Every persisted JSON document has `type` and integer `schemaVersion`.
- Load path is `read -> parse -> validate envelope -> migrate in memory -> validate target schema -> write migrated file -> return data`.
- Keep migrations small and explicit: `migrations[type][fromVersion] = (doc) => nextDoc`.
- Migrations must be deterministic and side-effect-light. Cross-file migrations should run from `manifest.json` and write a migration checkpoint only after all required documents are written.
- Use atomic-ish writes: write `<name>.tmp`, then move/rename to `<name>.json`; keep `<name>.bak` for the previous good file where the platform adapter can do that cheaply.
- Unknown future `schemaVersion` fails closed with a clear "storage created by newer Kepos" error. Do not downgrade.

Corrupt data behavior:

- Identity corruption: fail closed. Do not create a new identity automatically, because V1 is one device = one profile and silent identity replacement would orphan trust, home, treehole, and DM state. Current desktop and Android profile adapters reject corrupt or partial identity key material. Move the unreadable file to `backups/corrupt/` only if a valid backup exists or after user-confirmed reset in UI.
- ContactBook corruption: fail closed for trust decisions. Do not treat missing/corrupt trust as "public" or "trusted". Current file adapter throws on corrupt ContactBook storage and only initializes an empty book when the file is missing.
- Home corruption: do not join or publish a home. Current desktop and Android profile adapters reject corrupt home room keys. Preserve the corrupt file and require restore/reset.
- DM thread/message corruption: fail closed for V1 file adapters. Current adapters throw on corrupt thread or message storage and only initialize empty state when the file is missing. Per-thread quarantine can be added after the V1 JSON layout is unified.
- Treehole/Corestore corruption: surface the Corestore/Autobase open error and avoid deleting directories automatically. The JSON manifest can mark the treehole unavailable, but log repair/delete should be explicit.
- Missing optional document: create an empty V1 document only when it is truly optional (`contact-book.json`, `dm/threads.json`). Missing `identity.json` after first profile creation is fatal unless this is first run or a legacy import succeeds.

## Sources

- Local: `src/local-profile.js` — current desktop/localStorage-shaped V1 identity and home envelope persistence.
- Local: `src/mobile-profile.js` — current Android file-based V1 profile, identity, and home envelope persistence.
- Local: `mobile/App.jsx` — current `expo-file-system/legacy` usage and Bare backend storage base handoff.
- Local: `backend/backend.mjs` — current Bare backend treehole storage path usage.
- Local: `src/treehole-storage.js` — current normalized treehole Corestore path helper.
- Local: `src/treehole-base.js` — current Corestore/Autobase storage requirement.
- Local: `src/contact-book-storage.js`, `src/dm-thread-storage.js`, and `src/dm-message-storage.ts` — current local trust and DM persistence adapters.
- Local: `docs/v1.04-tradeoffs.md` — ContactBook adapter direction.
- Local: `docs/v1.07-architecture-gaps.md` — current schema version, migration, and remaining live-smoke evidence.
- Expo FileSystem legacy docs: https://docs.expo.dev/versions/v56.0.0/sdk/filesystem-legacy/ — app-scoped document/cache directories, document persistence, read/write APIs.
- AsyncStorage limits docs: https://react-native-async-storage.github.io/2.0/advanced/Limits/ — Android default total and per-entry limits.
- Expo SQLite docs: https://docs.expo.dev/versions/latest/sdk/sqlite/ — persisted SQLite, `PRAGMA user_version` migration example, SQLCipher and key-value store options.
- React Native MMKV README: https://github.com/mrousavy/react-native-mmkv — synchronous native key-value storage, custom path/encryption support, Nitro dependency and limitations.
- Electron app docs: https://electronjs.org/docs/latest/api/app — `app.getPath('userData')` and guidance to store app data under a subdirectory.
