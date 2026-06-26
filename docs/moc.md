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

6. `docs/v1-smoke-guide.md`
   - Desktop and Android manual smoke checklist for V1 parity.
   - Use this before calling V1 ready.

7. `docs/cross-device-smoke.md`
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

## Research

1. `docs/research-signing-canonical-encoding.md`
   - V1 signing library and signed-byte encoding recommendation.

2. `docs/research-dm-invite-encryption.md`
   - Encrypted DM invite payload primitive and key separation recommendation.

3. `docs/research-qr-libraries.md`
   - QR generation/scanning libraries for mobile and desktop.

4. `docs/research-local-storage-migrations.md`
   - Local persistence layout, migration policy, and corrupt data handling.

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
