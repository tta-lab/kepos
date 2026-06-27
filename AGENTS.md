# Kepos Agent Notes

## Project Docs MOC

Use these docs as the current architecture map for Kepos.

- `docs/moc.md`: docs map and V1 architecture entry point.
- `docs/v1.01-dependency-order.md`: numbered V1 dependency order and task sequencing.
- `docs/v1.06-identity-security.md`: target identity and security model, including Keet-style identity, device attestation, trust grants, and DM security.
- `docs/v1.08-dm-bootstrap-security.md`: target DM invite, message request, durable thread, revoke, and bootstrap security model.
- `docs/v1.10-qr-code-matching.md`: QR payloads and matching flows for profile trust, home entry, and message requests.
- `docs/v1.07-architecture-gaps.md`: remaining architecture gaps for V1 after identity and QR design.
- `docs/v1.03-limitations.md`: explicit V1 limitations, non-goals, and success bar.
- `docs/v1.04-tradeoffs.md`: accepted V1 tradeoffs, rejected options, risks, and future escape hatches.
- `docs/v1.05-typescript-boundary.md`: TypeScript boundary for V1 protocol/domain modules versus platform runtime glue.
- `docs/v1.20-smoke-guide.md`: desktop and Android manual smoke checklist for V1 parity.
- `docs/v1.21-cross-device-smoke.md`: agent recipe for desktop/Android gates, smoke, QR, persistence, revoke, and cleanup.
- `docs/v1.30-kepos-features.html`: local HTML overview of implemented user-visible features and supported platforms.

## Current V1 Product Rules

- V1 can be slower, but protocol-critical architecture should be solid before product polish.
- Query and evaluate maintained open source libraries before implementing protocol-critical crypto, encoding, QR, storage, or replication pieces.
- One device is one profile.
- One profile owns one home room.
- One profile owns one treehole.
- Identity signing is part of V1 for trust, QR/home payloads, treehole events, DM invites, message requests, and DM messages.
- Treehole main posts can only be created by the owner.
- Trusted users can read, comment, and like the owner's treehole.
- Public home access allows room chat only, not treehole read.
- Room chat is ephemeral.
- DM is durable, pairwise, and separate from home room traffic.
- Trust has one V1 scope: `home`.
- Revoke blocks future access but does not delete already replicated data.
- Manual raw key entry is debug or support UX, not normal product UX.

## Local Conventions

- Use npm and Node for this project.
- Use TypeScript first for new shared protocol/domain modules; keep JS/JSX/MJS for platform runtime glue until the loader path is proven.
- Use conventional commit syntax such as `feat(scope): message`, `fix(scope): message`, `refactor(scope): message`, or `chore(scope): message`.
- Do not add claude.ai links to commit messages.
- Do not push directly to `main` or `master`.
- Preserve unrelated local changes and untracked artifacts.
