# V1 Friend And Home Architecture

This folder resets the V1 mental model for friends, Home, DM, Treehole, QR, and transport.

The short version:

- Adding a friend is a social and authorization action.
- Entering a Home is a session and transport action.
- Home should have no role in adding a friend.
- Profile, Contacts, DM, and Treehole are the main product axis.
- Home is only a live space after trust, not the social bootstrap.
- Historical V1 code leaked Home transport into the friend flow. That is now
  quarantined as debug fallback, not a production path.

## Read Order

1. `01-product-model.md`
   - Product nouns and user-facing rules.
   - Start here when a flow feels confusing.

2. `02-protocol-model.md`
   - What records exist, who signs them, and what transport they use.
   - Use this before changing QR, trust, request, invite, or Home transport code.

3. `03-target-flows.md`
   - Target flows for add friend, enter Home, DM, Treehole, and invite-to-activity.
   - Use this before implementing UI or smoke steps.

4. `04-current-gap-and-refactor.md`
   - Where current V1 differs from the target model and how to unwind it.
   - Use this before touching the current Android/desktop request flow.

5. `05-profile-first-next-plan.md`
   - Concrete next implementation plan for moving from Home-centric bootstrap to profile-first P2P request delivery.
   - Use this for the route decision and product/transport separation.

6. `06-v1-profile-first-implementation-plan.md`
   - Concrete execution plan for finishing V1 person-first IM: shared model, desktop, Android, UI, and cross-device proof.
   - Use this as the full V1 implementation plan.

7. `07-v1-friendship-delivery-next-plan.md`
   - Execution plan that quarantined Home-control fallback and added delivery acknowledgement.
   - Use this before touching Home-control friend bootstrap, request accept, DM invite return, or smoke proof.

8. `08-v1-im-release-next-plan.md`
   - Prior plan for finishing V1 as a ready private IM product.
   - Use this before changing Chat, Contacts, Profile, Treehole, Home entry, debug surfaces, or final V1 proof.

9. `09-v1-profile-dm-delivery-next-plan.md`
   - Prior delivery and UX plan: Profile/DM are the production social path; Home is explicit live-room entry; direct host:port is debug only.
   - Use this before changing friend request delivery, DM delivery, Home entry, direct connection UI, or platform parity.

10. `10-v1-final-product-next-plan.md`
    - Previous V1 finish plan after the Contacts-first/Profile-DM cleanup pass.
    - Use this for the pre-`11` source-level cleanup context.

11. `11-v1-profile-first-im-next-plan.md`
    - Active V1 next plan after the Home/add-friend model was rechecked.
    - Use this as the current source of truth for profile-first IM, Home demotion,
      production P2P delivery, and final release proof order.

## Core Principle

Product semantics must not depend on the current transport shortcut.

If a user taps "Add friend", the product should mean:

> I want to create mutual trust with this person.

It must not mean:

> I want to join their Home room.

Joining a Home should not be used to deliver the request in the target architecture. Friend request and DM delivery must be profile-to-profile P2P.
