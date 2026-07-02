# Kepos Docs MOC

This is the map of content for Kepos architecture docs.

## Start Here

1. `docs/00-project-direction.md`
   - Current product, technical, and architecture direction read.
   - Use this before discussing future product shapes or architecture bets.

2. `docs/v1.01-dependency-order.md`
   - V1 build order and dependency graph.
   - Use this to decide what task can start next.

3. `docs/v1.11-mlp-desktop-react-architecture.md`
   - V1 MLP desktop direction: Electron React UI, lucide controls, and Bare worker backend.
   - Use this before redesigning desktop UI or moving desktop P2P/runtime code.

4. `docs/v1.12-mlp-ux-after-architecture-switch.md`
   - V1 MLP UX direction after the desktop React/Bare worker architecture switch.
   - Use this when reorganizing desktop and mobile product flows.

5. `docs/v1.13-mlp-ui-stack-tailwind-daisyui.md`
   - V1 MLP UI stack decision: React, TailwindCSS, daisyUI, and lucide.
   - Use this before implementing the desktop React renderer.

6. `docs/v1.14-mlp-style-directions.html`
   - Visual style board for the selected theme pair: Neo Cozy for light, Indie Console for dark.
   - Quiet Cyber is not included as a V1 MLP style candidate.

7. `docs/v1.15-mlp-implementation-audit.md`
   - Current V1 MLP implementation audit: finished UX/model evidence, proven desktop worker bridge, and remaining release-proof risk.
   - Use this before deciding whether a new V1 task is implementation work or evidence hardening.

8. `docs/v1.16-final-mlp-ui-ux-refactor.md`
   - Final V1 MLP person-first UI/UX refactor target: friend request, mutual trust, profile, contacts, messages, recent posts, and explicit home entry.
   - Use this before changing QR, trust, navigation, profile, contacts, messages, or treehole UX.

9. `docs/v1-friend-home-architecture/README.md`
   - Fresh V1 model for friends, Home, DM, Treehole, QR, and transport.
   - Use this when friend request and Home entry feel coupled or confusing.

10. `docs/v1.17-ready-im-completion-plan.md`

- Canonical V1 completion evidence plan and self-review for a ready private IM product on top of P2P infra.
- Use this as the checklist before starting V2 or calling V1 ready.

11. `docs/v1.20-smoke-guide.md`
    - Desktop and Android manual smoke checklist for V1 parity.
    - Use this before calling V1 ready.

12. `docs/v1.21-cross-device-smoke.md`
    - Agent recipe for validating desktop/Android product paths, including the final V1 release proof packet.
    - Use this before reporting cross-device work as ready or generating `tmp/final-v1-proof.md`.

## V1 Architecture

1. `docs/v1.02-research-backlog.md`
   - Research work that must be complete before implementation.
   - Use this to track library selection and architecture blockers.

2. `docs/v1.03-limitations.md`
   - What V1 deliberately does not solve.
   - Use this to avoid accidentally expanding scope.

3. `docs/v1.04-tradeoffs.md`
   - Decisions, rejected options, risks, and future escape hatches.
   - Use this when a design choice is debated.

4. `docs/v1.05-typescript-boundary.md`
   - TypeScript boundary for V1 protocol/domain modules versus platform runtime glue.
   - Use this before adding new shared protocol code.

5. `docs/v1.06-identity-security.md`
   - Identity, signing, trust, device model, and Keet-grade target.
   - V1 requires real identity signing and verification.
   - V1 does not require seed phrase, device attestation, or multi-device linking.

6. `docs/v1.07-architecture-gaps.md`
   - Architecture gaps still blocking V1.
   - Use this as the issue list before implementation.

7. `docs/v1.08-dm-bootstrap-security.md`
   - DM invite model, message requests, durable thread, revoke, and bootstrap security.
   - Explicit signed/encrypted invite is the target.

8. `docs/v1.09-treehole-authorization.md`
   - Treehole signed events, writer grants, reducer policy, tombstones, and owner/trust rules.

9. `docs/v1.10-qr-code-matching.md`
   - QR envelope, profile/home/message request payloads, and matching flows.

10. `docs/v1.30-kepos-features.html`
    - Local HTML feature overview.
    - Useful for smoke testing and explaining current features.

## V2 Architecture

1. `docs/v2.01-roadmap.md`
   - V2 sequence: presence, listening room, and one-to-one watch room.
   - Use this before discussing V2 scope or ordering.

2. `docs/v2.02-listening-room.md`
   - V2 shared music room over NAS-backed or self-hosted music services.
   - Use this when discussing Navidrome, Subsonic-compatible music, shared queues, and synchronized room playback.

3. `docs/v2.03-watch-room.md`
   - V2 watch room over self-hosted video or one host OBS-compatible live A/V stream to one trusted viewer.
   - Use this when discussing one-to-one watch rooms, self-hosted video, or OBS-compatible ingest.

4. `docs/v2.04-shared-self-hosted-media-rooms.md`
   - V2 shared rooms over mature self-hosted media services.
   - Use this when discussing music rooms, watch rooms, reading rooms, NAS-backed media, and adapter-led local app sharing.

## V3 Architecture

1. `docs/v3.01-local-service-tunnel.md`
   - Trusted session-scoped localhost TCP tunnel for sharing local services.
   - Use this when discussing RetroArch tunnels, local web app sharing, or port-forward-like features.

2. `docs/v3.02-desktop-retroarch-game-sessions.md`
   - V3 desktop-only RetroArch game sessions from trusted homes.
   - Use this when discussing co-play, ROM peer transfer, and emulator reuse.

3. `docs/v3.03-retroarch-game-seed-list.md`
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

## V1 Principle

V1 can be slower if needed, but it should do the right architecture first.

The V1 bar is:

- use TypeScript first for new protocol/domain modules when the runtime loading path is verified
- use TSX for React UI source, and keep JS/MJS only for platform glue, loader constraints, or narrowly scoped compatibility work
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
