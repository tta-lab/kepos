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
- `docs/v1-friend-home-architecture/08-v1-im-release-next-plan.md`: prior V1 plan for finishing Kepos as a ready private IM product.
- `docs/v1-friend-home-architecture/09-v1-profile-dm-delivery-next-plan.md`: prior delivery and UX next plan; Profile/DM are the production social path, Home is explicit live-room entry, and direct host:port is debug only.
- `docs/v1-friend-home-architecture/10-v1-final-product-next-plan.md`: previous V1 finish plan after the Contacts-first/Profile-DM cleanup pass.
- `docs/v1-friend-home-architecture/11-v1-profile-first-im-next-plan.md`: V1 profile-first IM product model; use this when product nouns or flow semantics are unclear.
- `docs/v1-friend-home-architecture/12-v1-profile-first-implementation-next-plan.md`: prior V1 implementation next plan; use this for implementation order, low-cost proof, production P2P delivery, and final release evidence.
- `docs/v1-friend-home-architecture/13-v1-home-decoupling-next-plan.md`: prior next plan for Home decoupling; Profile/DM own social delivery, Home is explicit live room after trust.
- `docs/v1-friend-home-architecture/14-v1-product-logic-unification-next-plan.md`: prior plan for desktop/Android product-logic unification.
- `docs/v1-friend-home-architecture/15-v1-ready-product-next-plan.md`: prior plan for V1 ready-product completion.
- `docs/v1-friend-home-architecture/16-v1-profile-delivery-next-plan.md`: previous profile-delivery plan after phone smoke clarified that Home is not part of add-friend bootstrap.
- `docs/v1-friend-home-architecture/17-v1-profile-routed-im-next-plan.md`: previous V1 plan that locked the profile-routed IM product model.
- `docs/v1-friend-home-architecture/18-v1-profile-p2p-hardening-next-plan.md`: previous V1 plan; route-hardening context for profile-to-profile P2P.
- `docs/v1-friend-home-architecture/19-v1-profile-social-delivery-next-plan.md`: previous V1 plan; product model for profile-social delivery on the profile-to-profile P2P route.
- `docs/v1-friend-home-architecture/20-v1-profile-social-completion-next-plan.md`: previous V1 plan; low-cost completion evidence for accept, DM bootstrap, shared product logic, and profile-social proof.
- `docs/v1-friend-home-architecture/21-v1-profile-social-release-next-plan.md`: previous V1 plan; release evidence for the profile-social IM product.
- `docs/v1-friend-home-architecture/22-v1-profile-p2p-delivery-next-plan.md`: previous V1 plan; profile-to-profile P2P delivery evidence while keeping Home out of add friend, accept, DM bootstrap, and private Chat.
- `docs/v1-friend-home-architecture/23-v1-social-delivery-release-plan.md`: previous V1 plan; private IM release path on profile-social P2P, with Profile QR as the normal add-friend path and Debug Home QR as an advanced live-room descriptor.
- `docs/v1-friend-home-architecture/24-v1-release-proof-next-plan.md`: previous V1 plan; final release-proof bar before calling V1 ready.
- `docs/v1-friend-home-architecture/25-v1-profile-route-implementation-next-plan.md`: previous V1 plan; profile-route implementation and UI parity evidence.
- `docs/v1-friend-home-architecture/26-v1-readiness-closure-next-plan.md`: previous V1 plan; readiness closure and final physical proof packet context.
- `docs/v1-friend-home-architecture/27-v1-profile-social-finalization-next-plan.md`: active V1 plan; profile-social finalization and final physical proof packet owner.
- `docs/v1.07-architecture-gaps.md`: remaining architecture gaps for V1 after identity and QR design.
- `docs/v1.03-limitations.md`: explicit V1 limitations, non-goals, and success bar.
- `docs/v1.04-tradeoffs.md`: accepted V1 tradeoffs, rejected options, risks, and future escape hatches.
- `docs/v1.05-typescript-boundary.md`: TypeScript boundary for V1 protocol/domain modules versus platform runtime glue.
- `docs/v1.20-smoke-guide.md`: desktop and Android manual smoke checklist for V1 parity.
- `docs/v1.21-cross-device-smoke.md`: agent recipe for desktop/Android gates, smoke, QR, persistence, revoke, cleanup, and the final V1 release proof packet at `tmp/final-v1-proof.md`, checked by `npm run v1:proof:check`.
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
- Home is not part of add-friend bootstrap. It is an explicit live-room action
  after trust, not authorization, not friend request delivery, and not the main
  DM route.
- There is one normal add-friend path: scan Profile QR, send request over the
  profile route, accept, then Chat/Profile work. Home QR is advanced/debug and
  must not appear as a parallel primary invite model.
- Profile-to-profile P2P is the only production social delivery route for
  friend requests, accepts, and DM bootstrap. Direct host:port is diagnostics
  only, not a product fallback.
- Opening a profile, sending a request, accepting a request, and opening Chat
  must not auto-enter Home in the normal product path.
- Desktop and mobile must use shared product/domain logic for QR generation,
  trust, friend requests, home descriptors, and treehole/DM policy. Platform
  code should only own rendering, camera, storage adapters, and runtime glue.
- Identity signing is part of V1 for trust, QR/home payloads, treehole events, DM invites, message requests, and DM messages.
- Treehole main posts can only be created by the owner.
- Trusted users can read, comment, and like the owner's treehole.
- Public home access allows room chat only, not treehole read.
- Room chat is ephemeral.
- DM is durable, pairwise, and separate from home room traffic.
- Profile QR is the only normal add-friend QR.
- Friend request, accept, DM bootstrap, and normal private Chat use
  profile-level P2P delivery, not Home control traffic.
- Home is explicit post-trust live-room entry. It is not the friend request
  route, not the authorization route, and not a production fallback for Chat.
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
