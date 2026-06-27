# Kepos Docs MOC

This is the map of content for Kepos architecture docs.

## Start Here

1. `docs/v1-dependency-order.md`
   - V1 build order and dependency graph.
   - Use this to decide what task can start next.

2. `docs/v1-research-backlog.md`
   - Research work that must be complete before implementation.
   - Use this to track library selection and architecture blockers.

3. `docs/v1-limitations.md`
   - What V1 deliberately does not solve.
   - Use this to avoid accidentally expanding scope.

4. `docs/v1-tradeoffs.md`
   - Decisions, rejected options, risks, and future escape hatches.
   - Use this when a design choice is debated.

5. `docs/typescript-boundary.md`
   - TypeScript boundary for V1 protocol/domain modules versus platform runtime glue.
   - Use this before adding new shared protocol code.

6. `docs/project-direction.md`
   - Current product, technical, and architecture direction read.
   - Use this before discussing future product shapes or architecture bets.

7. `docs/v1-mlp-desktop-react-architecture.md`
   - V1 MLP desktop direction: Electron React UI, lucide controls, and Bare worker backend.
   - Use this before redesigning desktop UI or moving desktop P2P/runtime code.

8. `docs/v1-mlp-ux-after-architecture-switch.md`
   - V1 MLP UX direction after the desktop React/Bare worker architecture switch.
   - Use this when reorganizing desktop and mobile product flows.

9. `docs/v1-smoke-guide.md`
   - Desktop and Android manual smoke checklist for V1 parity.
   - Use this before calling V1 ready.

10. `docs/cross-device-smoke.md`
    - Agent recipe for validating desktop/Android product paths.
    - Use this before reporting cross-device work as ready.

## Core Architecture

1. `docs/keet-grade-identity-security.md`
   - Identity, signing, trust, device model, and Keet-grade target.
   - V1 requires real identity signing and verification.
   - V1 does not require seed phrase, device attestation, or multi-device linking.

2. `docs/v1-architecture-gaps.md`
   - Architecture gaps still blocking V1.
   - Use this as the issue list before implementation.

3. `docs/dm-bootstrap-security.md`
   - DM invite model, message requests, durable thread, revoke, and bootstrap security.
   - Explicit signed/encrypted invite is the target.

4. `docs/treehole-authorization.md`
   - Treehole signed events, writer grants, reducer policy, tombstones, and owner/trust rules.

5. `docs/qr-code-matching.md`
   - QR envelope, profile/home/message request payloads, and matching flows.

## Future Architecture

1. `docs/v2-roadmap.md`
   - V2 sequence: presence, listening room, and one-to-one watch room.
   - Use this before discussing V2 scope or ordering.

2. `docs/v2-listening-room.md`
   - V2 listening room as one host live audio stream.
   - Use this when discussing local file audio, PCM socket input, and shared room listening.

3. `docs/v2-watch-room.md`
   - V2 watch room as one host OBS-compatible live A/V stream to one trusted viewer.
   - Use this when discussing one-to-one watch rooms or OBS-compatible ingest.

4. `docs/future-local-service-tunnel.md`
   - Trusted session-scoped localhost TCP tunnel for sharing local services.
   - Use this when discussing RetroArch tunnels, local web app sharing, or port-forward-like features.

5. `docs/v3-desktop-retroarch-game-sessions.md`
   - V3 desktop-only RetroArch game sessions from trusted homes.
   - Use this when discussing co-play, ROM peer transfer, and emulator reuse.

6. `docs/v3-retroarch-game-seed-list.md`
   - First and second batch game candidates for V3 RetroArch sessions.
   - Use this when choosing desktop netplay test games.

## Research

1. `docs/research-signing-canonical-encoding.md`
   - V1 signing library and signed-byte encoding recommendation.

2. `docs/research-dm-invite-encryption.md`
   - Encrypted DM invite payload primitive and key separation recommendation.

3. `docs/research-qr-libraries.md`
   - QR generation/scanning libraries for mobile and desktop.

4. `docs/research-local-storage-migrations.md`
   - Local persistence layout, migration policy, and corrupt data handling.

5. `docs/research-retroarch-netplay-tunnel.md`
   - RetroArch netplay TCP tunnel feasibility for V3 game sessions.
   - Use this before implementing the RetroArch launch or tunnel probe.

## User-Facing Overview

1. `docs/kepos-features.html`
   - Local HTML feature overview.
   - Useful for smoke testing and explaining current features.

## V1 Principle

V1 can be slower if needed, but it should do the right architecture first.

The V1 bar is:

- use TypeScript first for new protocol/domain modules when the runtime loading path is verified
- keep JS/JSX/MJS for platform glue and browser/Electron renderer paths until their TS loader path is proven
- query and evaluate maintained open source libraries before implementing protocol-critical pieces
- real identity signing for protocol-critical records
- trust as authorization SSOT
- keys as transport capabilities, not permission
- local alias at trust and message-request boundaries
- no usernames or global handles in V1
- owner-bound home and treehole
- signed DM invites instead of deterministic public pair topics
- signed treehole events before accepting non-owner writes
- platform parity across desktop and Android
