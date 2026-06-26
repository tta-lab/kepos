# Research: V1 Signing And Canonical Encoding

## Question

Which maintained open source libraries should Kepos use for V1 identity signing, verification, and canonical signed bytes?

V1 needs real signatures for trust grants, home/profile/message-request QR payloads, treehole events, DM invites, and DM messages. The decision must work for Node desktop, Bare Android backend, and React Native-safe paths. The project preference is Holepunch/Keet first, then generic Ed25519 if needed.

## Recommendation

Use `hypercore-crypto` for V1 Ed25519 signing and verification, and use `compact-encoding` with explicit per-record schemas for canonical signed bytes.

- Verified: Kepos already depends on `hypercore-crypto` in the root and desktop packages, and the package exposes `keyPair()`, `sign(message, secretKey)`, and `verify(message, signature, publicKey)`. It is MIT licensed and was updated to `3.7.0` in May 2026.
- Verified: `hypercore-crypto` depends on `sodium-universal`, which wraps `sodium-native` for Node and `sodium-javascript` for browser bundlers. `sodium-native` itself is actively maintained by Holepunch.
- Interpretation: This is the best V1 fit because it is already in the stack, uses the same ecosystem as Hypercore, gives simple serializable 32-byte public keys and 64-byte secret/signature bytes, and keeps identity signing separate from future Keet-style HD identity.
- Interpretation: `compact-encoding` is the best signed-byte layer when Kepos owns the protocol schemas. It avoids JSON ordering and number-format traps, produces small QR-friendly bytes, and is part of the same Holepunch stack.

Use `keet-identity-key` later for mnemonic/root identity and device attestation, not as the first V1 signing primitive. It is relevant to the target Keet-grade identity model, but it adds HD identity, proofs, and data attestation before Kepos has settled the signed record envelope.

Keep `@noble/ed25519` as the generic fallback if React Native bundling or mobile crypto proves easier with pure ESM JavaScript than with the Holepunch sodium path.

## Candidate Matrix

| Candidate                 | Role                                             | License    | Maintenance                                                             | API shape                                                                                                                                                   | Signing / verifying                                                                                    | Serializable keys                                                                                     | Platform fit                                                                                                                                     |
| ------------------------- | ------------------------------------------------ | ---------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `hypercore-crypto`        | Ed25519 primitive                                | MIT        | Verified: npm `3.7.0`, modified May 2026                                | CommonJS: `crypto.keyPair()`, `crypto.sign(message, secretKey)`, `crypto.verify(message, signature, publicKey)`                                             | Verified: yes                                                                                          | Verified: public/secret keys are byte buffers; signatures are byte buffers                            | Best first choice for Node and Bare-aligned code; React Native needs bundler validation because it goes through `sodium-universal`               |
| `keet-identity-key`       | Keet identity, HD keys, device/data attestations | Apache-2.0 | Verified: npm `3.2.0`, modified May 2026                                | CommonJS: `generateMnemonic()`, `from({ mnemonic, seed })`, `bootstrap(deviceKey)`, `attestData(data, keyPair, proof)`, `verify(proof, attestedData, opts)` | Verified: supports attesting arbitrary data and verifying proofs; not a minimal detached-signature API | Verified: public keys and proofs are byte data; exact proof format should be treated as library-owned | Strong future fit for Keet-grade identity; too much surface for V1 detached record signatures unless Kepos also adopts its proof chain model now |
| `keypear`                 | Deterministic Ed25519 keychain                   | Apache-2.0 | Verified: npm `1.2.2`, modified Apr 2024                                | CommonJS: `new Keychain()`, `keys.get(name)`, `keyPair.sign(message)`                                                                                       | Verified: signs; README did not show a verify API                                                      | Verified: keypair exposes `publicKey`; secret/scalar handling is library-owned                        | Lower V1 fit: depends on `sodium-native`, older release cadence, verify path is not obvious from public README                                   |
| `@noble/ed25519`          | Pure JS Ed25519 fallback                         | MIT        | Verified: npm `3.1.0`, modified Apr 2026                                | ESM: `keygen`, `getPublicKey`, `sign`, `verify`; async forms available                                                                                      | Verified: yes                                                                                          | Verified: 32-byte secret key seed, 32-byte public key, 64-byte signature as `Uint8Array`              | Strong React Native-safe fallback with required `getRandomValues` and SHA-512 setup; Node minimum is `20.19` for v3                              |
| `tweetnacl`               | Pure JS NaCl/Ed25519 fallback                    | Unlicense  | Verified: npm `1.0.3`, last release Feb 2020, package modified Apr 2023 | CommonJS: `nacl.sign.keyPair()`, `nacl.sign.detached()`, `nacl.sign.detached.verify()`                                                                      | Verified: yes                                                                                          | Verified: 32-byte public key, 64-byte secret key, 64-byte signature                                   | Very portable and audited, but stale and slower; use only if newer libraries fail                                                                |
| `libsodium-wrappers-sumo` | WASM/JS libsodium fallback                       | ISC        | Verified: npm `0.8.4`, modified Apr 2026                                | Async init: `await sodium.ready`, then libsodium functions                                                                                                  | Verified: yes via libsodium Ed25519 APIs                                                               | Verified: `Uint8Array` keys/signatures                                                                | Broad browser/Node/Bun fit, but heavier and async; React Native may prefer `react-native-libsodium` instead                                      |
| `compact-encoding`        | Deterministic binary encoding                    | Apache-2.0 | Verified: npm `3.3.0`, modified Jun 2026                                | CommonJS encoders with `preencode`, `encode`, `decode`, plus helpers                                                                                        | Not applicable                                                                                         | Not applicable                                                                                        | Best V1 canonical-byte choice if Kepos defines fixed schemas and test vectors                                                                    |
| `canonicalize`            | RFC 8785 canonical JSON                          | Apache-2.0 | Verified: npm `3.0.0`, modified Apr 2026                                | ESM: `canonicalize(obj)` returns canonical JSON string                                                                                                      | Not applicable                                                                                         | Not applicable                                                                                        | Good debug/interchange fallback; less compact for QR and must restrict JSON values to I-JSON-safe data                                           |
| `json-canonicalize`       | Canonical JSON variant                           | MIT        | Verified: npm `2.0.0`, modified Jun 2025                                | ESM/TS: `canonicalize`, `canonicalizeEx`                                                                                                                    | Not applicable                                                                                         | Not applicable                                                                                        | Pass for V1: README documents default behavior that differs from RFC 8785 for `undefined` in arrays                                              |
| `cbor-x`                  | CBOR binary encoding                             | MIT        | Verified: npm `1.6.4`, modified Mar 2026                                | ESM/CJS: `encode`, `decode`                                                                                                                                 | Not applicable                                                                                         | Not applicable                                                                                        | Useful general CBOR library, but not the first V1 choice unless Kepos explicitly adopts deterministic CBOR rules and test vectors                |

## Platform Compatibility Risks

- Verified: `hypercore-crypto`, `keet-identity-key`, and `compact-encoding` are CommonJS packages. That is fine for current Node-style code, but React Native bundling must be tested instead of assumed.
- Verified: `sodium-universal` says it uses `sodium-native` for Node and `sodium-javascript` for browser bundlers. It also notes feature parity differences between the two sodium backends.
- Interpretation: Bare Android is likely the strongest reason to stay close to Holepunch packages, because `sodium-native` and related dependencies are maintained under the same ecosystem. This still needs a real Bare Android smoke test for `keyPair`, `sign`, and `verify`.
- Verified: `@noble/ed25519` v3 is ESM and documents that React Native needs `react-native-get-random-values` plus SHA-512 wiring. It also lists Node `20.19` as the v3 minimum.
- Interpretation: If Kepos needs one shared JS implementation across Expo/React Native and Node without native addons, `@noble/ed25519` is the cleanest fallback. The cost is moving away from the Holepunch sodium path and handling ESM/CommonJS boundaries.
- Verified: `tweetnacl` supports modern browsers and Node and uses `Uint8Array`, but its latest release is old. It should not be the main V1 choice while maintained alternatives are available.

## Canonical Encoding Recommendation

Use deterministic binary encoding for signed protocol records:

1. Define one signed envelope shape with explicit domain separation, version, record type, signer public key, payload bytes, and signature.
2. Encode each signable payload with a fixed `compact-encoding` schema. Do not use `compact-encoding`'s JSON helpers for signed bytes.
3. Sign the exact encoded payload bytes plus a stable domain/version prefix, for example `kepos-v1:<record-type>`.
4. Store or transport signatures, public keys, and payloads as bytes; convert to hex or base64url only at UI, JSON storage, or QR boundaries.
5. Add test vectors for each record type before accepting network data.

Interpretation: canonical JSON is acceptable for debug tools, local inspection, or an early migration bridge, but it is not the best primary signed-byte format for Kepos V1. QR payloads and replicated records benefit from compact binary bytes, and fixed schemas make incompatible changes obvious.

Do not sign ad hoc `JSON.stringify()` output. If JSON must be signed, use `canonicalize` and restrict inputs to stable JSON data: no `undefined`, no functions, no `NaN`, no `Infinity`, no implicit dates, and no ambiguous binary fields. Encode binary fields as base64url or hex before canonicalization.

## Fallback Plan

1. Primary path: `hypercore-crypto` + `compact-encoding`.
2. If React Native cannot bundle or run the sodium path cleanly: use `@noble/ed25519` for signing while keeping `compact-encoding` signed bytes unchanged.
3. If `@noble/ed25519` v3 ESM or Node version requirements are a blocker: evaluate pinning a maintained v2 line or use `tweetnacl` only as a portability fallback.
4. If Kepos adopts seed phrases and multi-device attestation in V1 instead of later: use `keet-identity-key` for the root identity/device proof model, but still define Kepos signed payload bytes explicitly.
5. If binary encoding causes cross-runtime friction: use `canonicalize` as an RFC 8785 JSON fallback, with strict input validation and shared test vectors.

## Sources

- Verified: local Kepos docs require real V1 signing and deterministic signed bytes: `docs/v1-dependency-order.md`, `docs/keet-grade-identity-security.md`, `docs/v1-limitations.md`.
- Verified: `hypercore-crypto` npm metadata and README: https://www.npmjs.com/package/hypercore-crypto and https://github.com/mafintosh/hypercore-crypto
- Verified: `keet-identity-key` npm metadata and README: https://www.npmjs.com/package/keet-identity-key and https://github.com/holepunchto/keet-identity-key
- Verified: `keypear` npm metadata and README: https://www.npmjs.com/package/keypear and https://github.com/holepunchto/keypear
- Verified: `compact-encoding` npm metadata and README: https://www.npmjs.com/package/compact-encoding and https://github.com/holepunchto/compact-encoding
- Verified: `sodium-universal` npm metadata and README: https://www.npmjs.com/package/sodium-universal and https://github.com/holepunchto/sodium-universal
- Verified: `sodium-native` npm metadata and README: https://www.npmjs.com/package/sodium-native and https://github.com/holepunchto/sodium-native
- Verified: `@noble/ed25519` npm metadata and README: https://www.npmjs.com/package/@noble/ed25519 and https://github.com/paulmillr/noble-ed25519
- Verified: `tweetnacl` npm metadata and README: https://www.npmjs.com/package/tweetnacl and https://github.com/dchest/tweetnacl-js
- Verified: `libsodium-wrappers-sumo` npm metadata and README: https://www.npmjs.com/package/libsodium-wrappers-sumo and https://github.com/jedisct1/libsodium.js
- Verified: `canonicalize` npm metadata and README: https://www.npmjs.com/package/canonicalize and https://github.com/erdtman/canonicalize
- Verified: RFC 8785 JSON Canonicalization Scheme: https://www.rfc-editor.org/rfc/rfc8785
- Verified: `json-canonicalize` npm metadata and README: https://www.npmjs.com/package/json-canonicalize and https://github.com/snowyu/json-canonicalize.ts
- Verified: `cbor-x` npm metadata and README: https://www.npmjs.com/package/cbor-x and https://github.com/kriszyp/cbor-x
- Verified: RFC 8949 CBOR, including deterministic encoding considerations: https://www.rfc-editor.org/rfc/rfc8949
