# Kepos Agent Notes

## Project Docs MOC

Use these docs as the current architecture map for Kepos.

- `docs/moc.md`: docs map and V1 architecture entry point.
- `docs/v1.01-dependency-order.md`: numbered V1 dependency order and task sequencing.
- `docs/v1.06-identity-security.md`: target identity and security model, including Keet-style identity, device attestation, trust grants, and DM security.
- `docs/v1.08-dm-bootstrap-security.md`: target DM invite, message request, durable thread, revoke, and bootstrap security model.
- `docs/v1.10-qr-code-matching.md`: QR payloads and matching flows for profile trust, home entry, and message requests.
- `docs/v1.16-final-mlp-ui-ux-refactor.md`: final V1 MLP person-first UI/UX refactor target: friend request, mutual trust, profile, contacts, messages, recent posts, and explicit home entry.
- `docs/v1.17-ready-im-completion-plan.md`: canonical V1 completion evidence checklist and self-review for a ready private IM product on top of P2P infra.
- `docs/v1-friend-home-architecture/07-v1-friendship-delivery-next-plan.md`: prior V1 execution plan for profile-level friend request/accept delivery and Home-control fallback quarantine.
- `docs/v1-friend-home-architecture/08-v1-im-release-next-plan.md`: current V1 plan for finishing Kepos as a ready private IM product.
- `docs/v1-friend-home-architecture/09-v1-profile-dm-delivery-next-plan.md`: current delivery and UX next plan; Profile/DM are the production social path, Home is explicit live-room entry, and direct host:port is debug only.
- `docs/v1-friend-home-architecture/10-v1-final-product-next-plan.md`: active V1 finish plan after the Contacts-first/Profile-DM cleanup pass; use this before remaining V1 product polish or final desktop/Android proof.
- `docs/v1.07-architecture-gaps.md`: remaining architecture gaps for V1 after identity and QR design.
- `docs/v1.03-limitations.md`: explicit V1 limitations, non-goals, and success bar.
- `docs/v1.04-tradeoffs.md`: accepted V1 tradeoffs, rejected options, risks, and future escape hatches.
- `docs/v1.05-typescript-boundary.md`: TypeScript boundary for V1 protocol/domain modules versus platform runtime glue.
- `docs/v1.20-smoke-guide.md`: desktop and Android manual smoke checklist for V1 parity.
- `docs/v1.21-cross-device-smoke.md`: agent recipe for desktop/Android gates, smoke, QR, persistence, revoke, cleanup, and the final V1 release proof packet at `tmp/final-v1-proof.md`.
- `docs/v1.30-kepos-features.html`: local HTML overview of implemented user-visible features and supported platforms.

## Current V1 Product Rules

- V1 can be slower, but protocol-critical architecture should be solid before product polish.
- Query and evaluate maintained open source libraries before implementing protocol-critical crypto, encoding, QR, storage, or replication pieces.
- One device is one profile.
- One profile owns one home room.
- One profile owns one treehole.
- Profile QR is the product share surface: it represents the person, can carry
  that person's current home descriptor, and starts the friend request/trust
  path. Home QR is only an advanced/debug home descriptor surface, not a
  parallel primary invite model.
- Desktop and mobile must use shared product/domain logic for QR generation,
  trust, friend requests, home descriptors, and treehole/DM policy. Platform
  code should only own rendering, camera, storage adapters, and runtime glue.
- Identity signing is part of V1 for trust, QR/home payloads, treehole events, DM invites, message requests, and DM messages.
- Treehole main posts can only be created by the owner.
- Trusted users can read, comment, and like the owner's treehole.
- Public home access allows room chat only, not treehole read.
- Room chat is ephemeral.
- DM is durable, pairwise, and separate from home room traffic.
- Trust has one V1 scope: `home`.
- Production friend bootstrap must use profile-to-profile P2P delivery. Home
  control request/invite handling is debug fallback or legacy compatibility,
  not the normal path.
- Production private delivery must be Profile/DM oriented. Home entry is a
  separate live-room action after trust. Direct host:port is diagnostics only,
  not a production fallback.
- Revoke blocks future access but does not delete already replicated data.
- Manual raw key entry is debug or support UX, not normal product UX.

## Local Conventions

- Use npm and Node for this project.
- Prefer TypeScript for all new code. React UI source should be TSX. Keep JS/MJS only for existing runtime glue, loader constraints, or narrowly scoped compatibility work.
- Prefer TailwindCSS and daisyUI for new frontend UI and UI refactors. Use local CSS only when the existing surface has not migrated yet, when a platform wrapper requires it, or when Tailwind/daisyUI cannot express the needed behavior cleanly.
- Do not run high-cost smoke tests by default. Unless the user explicitly asks
  for smoke, the work is release proof, or the change cannot be verified any
  other way, prefer focused tests, typecheck, lint, and bundle gates.
- Use conventional commit syntax such as `feat(scope): message`, `fix(scope): message`, `refactor(scope): message`, or `chore(scope): message`.
- Do not add claude.ai links to commit messages.
- Do not push directly to `main` or `master`.
- Preserve unrelated local changes and untracked artifacts.
