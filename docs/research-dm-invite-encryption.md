# Research: V1 DM Invite Encryption

## Question

What open source primitives and libraries should Kepos use for encrypted DM invite payloads and pairwise durable DM channel setup across Node, Bare Android backend, and React Native-safe surfaces?

## Recommendation

Use separate identity signing and encryption/key agreement material.

- Verified: `keet-identity-key` gives Kepos the closest Keet-aligned identity direction: stable root identity, device proofs, and data attestations over Ed25519-style keys. Use it, or `hypercore-crypto` as the smaller interim step, for identity signing and signed public invite fields.
- Verified: libsodium sealed boxes encrypt a payload to a recipient public key using X25519 and XSalsa20-Poly1305, with an ephemeral sender key, and the recipient cannot authenticate the sender from the sealed box alone. That fits Kepos because the DmInvite public fields are already signed by the sender identity.
- Interpretation: the best V1 invite boundary is "sign public routing fields, then sealed-box only the private channel material to the recipient's encryption public key." Do not make the identity public key also be the encryption public key.
- Interpretation: prefer `sodium-universal` or direct `sodium-native` in Node/Bare worker code for sealed boxes, because Kepos already depends on Holepunch libraries that use `sodium-universal`, and `sodium-universal` exposes `crypto_box_seal` / `crypto_box_seal_open` in its compatibility table.
- Interpretation: for React Native UI code, keep cryptography in the Bare backend where possible. If crypto must run in RN JS/JSI later, test `react-native-libsodium` first because it exposes `crypto_box_seal`, `crypto_box_seal_open`, `crypto_aead_xchacha20poly1305_ietf_*`, and Ed25519 signing APIs. Keep `react-native-nacl-jsi` as a possible fallback for box/secretbox, but it does not document sealed boxes in the fetched README.
- Interpretation: defer full Noise for invite encryption. Use sealed boxes for one-shot DmInvite payloads. Consider `noise-handshake` later for an interactive DM transport handshake if the durable DM replication layer needs per-session forward secrecy or authenticated transport keys.

## Candidate Matrix

| Candidate                                         | Fit                                                  | Why                                                                                                                                                                                                                                                                     | Risks                                                                                                                                                                                                                                      |
| ------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `keet-identity-key`                               | P0 later for Keet-grade identity/signing direction   | Verified: Holepunch package for hierarchical deterministic Keet identity, root `identityPublicKey`, device bootstrap, device/data attestations, Apache-2.0.                                                                                                             | Verified: depends on `sodium-universal`; still needs a dedicated adoption probe before replacing the current `hypercore-crypto` V1 identity path. It is identity/signing, not sealed invite encryption by itself.                          |
| `hypercore-crypto`                                | P0 interim signing/random/discovery primitive        | Verified: already in Kepos; exposes Ed25519 key pairs, sign/verify, random bytes, discovery keys; MIT.                                                                                                                                                                  | Verified: docs do not expose sealed boxes or key agreement. Not enough for DmInvite encryption.                                                                                                                                            |
| `sodium-universal` / `sodium-native` sealed boxes | P0 for first encrypted invite payload implementation | Verified: `sodium-universal` wraps `sodium-native` and `sodium-javascript`; compatibility table includes `crypto_box_seal`, `crypto_box_seal_open`, keypair, seed keypair, scalarmult, secretbox, and sign APIs. Verified: `sodium-native` is a thin libsodium binding. | Verified: `sodium-universal` browser path lacks full parity. Current `npm run v1:gate` proves the chosen path bundles for Bare Android; live Android runtime remains covered by device smoke.                                              |
| `react-native-libsodium`                          | P1 if crypto must run in RN app code                 | Verified: supports iOS, Android, Web; exposes sealed boxes, XChaCha20-Poly1305 AEAD, secretbox, Ed25519 signing; MIT.                                                                                                                                                   | Verified: requires Node >= 20.19.4 and Expo dev-client plugin setup. Adds native RN integration work; should be avoided if Bare backend can own crypto.                                                                                    |
| `@noble/curves` + `@noble/ciphers`                | P1/P2 portable JS fallback                           | Verified: noble supports Ed25519 and X25519, is audited, supports major runtimes, and notes RN may need `getRandomValues`. MIT.                                                                                                                                         | Verified: current `@noble/curves` and `@noble/ciphers` require Node >= 20.19.0. Also no sealed-box high-level API; Kepos would need to compose X25519 + HKDF + AEAD carefully, which is more protocol surface than libsodium sealed boxes. |
| `noise-handshake`                                 | P2 later for interactive channel setup               | Verified: Holepunch package, Apache-2.0, depends on `sodium-universal`, supports Noise handshakes and outputs rx/tx keys.                                                                                                                                               | Interpretation: overkill for one-shot invite payload encryption. Useful later if DM transport wants a Noise pattern, but it adds handshake state, replay decisions, and transport coupling.                                                |
| `@chainsafe/libp2p-noise`                         | Pass for V1                                          | Verified: maintained libp2p Noise implementation with bring-your-own crypto.                                                                                                                                                                                            | Interpretation: pulls in libp2p shape and many dependencies that do not match Kepos/Holepunch stack.                                                                                                                                       |
| `tweetnacl`                                       | Pass except as reference/fallback                    | Verified: audited JS NaCl port, public domain, supports X25519 box, secretbox, Ed25519.                                                                                                                                                                                 | Verified: docs flag low-level protocol risks and no sealed-box core API. It is not Holepunch-aligned and would push more protocol design onto Kepos.                                                                                       |

## Proposed Invite Crypto Boundary

Use this V1 boundary:

```js
DmInvitePublicFields {
  type,
  inviteId,
  fromProfileId,
  fromSigningPublicKey,
  fromEncryptionPublicKey?,
  toProfileId,
  toEncryptionPublicKeyId,
  channelPublicKey,
  channelDiscoveryKey,
  createdAt,
  expiresAt?,
  requestId?
}

DmInvite {
  ...DmInvitePublicFields,
  proof,
  encryptedPayload
}
```

`proof` signs deterministic bytes for the public fields. The proof must cover recipient identity, recipient encryption key id, channel public/discovery keys, expiry, and request id.

`encryptedPayload` should be `crypto_box_seal(encode(DmInvitePayload), toEncryptionPublicKey)` in the first encrypted stage:

```js
DmInvitePayload {
  channelSecret?,
  channelEncryptionKey,
  initialWriterKey?,
  welcomeMessageId?,
  capabilities,
  inviteId,
  fromProfileId,
  toProfileId,
  createdAt
}
```

Verified: libsodium sealed boxes provide confidentiality to the recipient but do not authenticate the sender. Interpretation: this is acceptable here because sender authentication comes from the outer invite signature. The decrypted payload should repeat critical context (`inviteId`, `fromProfileId`, `toProfileId`, `createdAt`) so the recipient can reject payload substitution even if storage or transport mixes invite envelopes.

Staged path:

1. Add crypto-agnostic domain fields: signing public key id, encryption public key id, encrypted payload bytes, algorithm id such as `x25519-xsalsa20poly1305-sealedbox:v1`.
2. Implement deterministic signed public-field encoding and verify it with `hypercore-crypto` or `keet-identity-key` proofs.
3. Add a separate per-profile encryption keypair. In V1 one device equals one profile, so it can be locally persisted with the profile identity, but it should remain a distinct key.
4. Encrypt only `DmInvitePayload` using libsodium sealed boxes.
5. Use the decrypted channel material to open a dedicated durable DM log. Keep deterministic pair topics prototype-only.
6. Later, if DM transport needs an interactive security layer, evaluate `noise-handshake` over a per-thread or per-device X25519 static key, with identity signatures binding Noise static keys to profile identity.

## Revocation And Rotation Notes

- Verified: current Kepos V1 docs say revoke blocks future access and does not delete already replicated data.
- Interpretation: revocation should reject new DmInvites from revoked profiles, stop issuing invites to revoked profiles, and mark local threads closed/revoked. It should not claim old ciphertext or already replicated DM history was removed.
- Interpretation: key rotation should mint a new invite with new channel material. Do not rotate by deriving a new public topic from profile ids.
- Interpretation: because signing keys are stable and encryption keys may need shorter lifetimes, key separation makes revoke and rotation cleaner. A profile can keep the same identity while publishing or exchanging a new encryption public key id.
- Interpretation: message requests should use the same outer-signature model but should not carry full DM channel material until accepted/replied to. On accept, create or accept a DmInvite and bind it to `requestId`.
- V1 decision: message requests and accepted DM invite flows carry the sender/recipient encryption public key material needed for setup and store accepted thread metadata locally. A separate signed encryption-key advertisement record can wait until multi-device identity or key rotation requires it.

## Platform Compatibility Risks

- Verified: `sodium-universal` is designed for Node and browser, wraps `sodium-native` and `sodium-javascript`, and its table shows sealed boxes on both backends. Current V1 gates include Node probes and Bare Android bundle checks; live Android runtime remains part of device smoke.
- Verified: `keet-identity-key` depends on `sodium-universal`; `keypear` depends on `sodium-native`; `hypercore-crypto` depends on `sodium-universal`. Interpretation: the Holepunch path already assumes sodium works in the backend runtime, so the first compatibility test should be sodium in Bare Android, not React Native JS.
- Verified: `react-native-libsodium` has Android support and exposes the right APIs, but it requires native RN setup and Node >= 20.19.4. Interpretation: use only if crypto must leave the Bare backend.
- Verified: noble v2 requires Node >= 20.19.0 and RN needs `getRandomValues`. Interpretation: noble is a strong fallback for pure JS tests/tools, but less aligned with Kepos's current Holepunch/Bare backend path.
- V1 boundary: keep long-term secret operations in shared Node/Bare-compatible modules or the Bare backend where practical. React Native UI may pass local identity material during startup because one device is one profile in V1, but normal bridge/control traffic should pass public keys, ciphertext, and signed records rather than raw long-term secrets.

## Sources

- Verified: `keet-identity-key` README, Apache-2.0, hierarchical deterministic Keet identity, device bootstrap, data attestations: https://github.com/holepunchto/keet-identity-key
- Verified: Pear guide for portable Keet identity, Bare worker-oriented usage and `keet-identity-key` + `hypercore-crypto`: https://docs.pears.com/how-to/manage-identity/create-a-portable-identity-with-keet-identity-key/
- Verified: `keypear` README, Apache-2.0, deterministic Ed25519 keychains, sign and DH methods: https://github.com/holepunchto/keypear
- Verified: `hypercore-crypto` README, MIT, Ed25519 keypairs, sign/verify, random bytes, discovery keys: https://github.com/holepunchto/hypercore-crypto
- Verified: libsodium sealed boxes, X25519 + XSalsa20-Poly1305, anonymous sender, ephemeral key: https://libsodium.gitbook.io/doc/public-key_cryptography/sealed_boxes
- Verified: libsodium FAQ recommends distinct signing and encryption keys where possible, and notes different lifetimes for signing and encryption keys: https://doc.libsodium.org/quickstart
- Verified: libsodium Ed25519-to-X25519 conversion docs recommend distinct keys if affordable: https://doc.libsodium.org/doc/advanced/ed25519-curve25519
- Verified: `sodium-universal` README and compatibility table, MIT, includes sealed boxes and key primitives: https://github.com/holepunchto/sodium-universal
- Verified: `sodium-native` README, MIT, thin libsodium binding: https://github.com/holepunchto/sodium-native
- Verified: `react-native-libsodium` README, MIT, Android/iOS/Web support and sealed box exports: https://github.com/serenity-kit/react-native-libsodium
- Verified: `@noble/curves` README, MIT, audited JS Ed25519/X25519 support and RN random polyfill note: https://github.com/paulmillr/noble-curves
- Verified: `noise-handshake` npm metadata, Apache-2.0, Holepunch Noise handshake over `sodium-universal`: https://registry.npmjs.org/noise-handshake
- Verified: Noise Protocol Framework overview and protocol naming: https://noiseprotocol.org/noise.html
- Verified: `@chainsafe/libp2p-noise` README and crypto interface: https://github.com/ChainSafe/js-libp2p-noise
- Verified: `tweetnacl` README, public domain, audit note, X25519 box, secretbox, Ed25519, security caveats: https://github.com/dchest/tweetnacl-js
