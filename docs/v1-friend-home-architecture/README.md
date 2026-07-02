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
    - Current product model after the Home/add-friend model was rechecked.
    - Use this to understand profile-first IM, Home demotion, production P2P
      delivery, and final release proof order.

12. `12-v1-profile-first-implementation-next-plan.md`
    - Prior V1 execution plan from the current model to a ready product.
    - Use this for implementation order, low-cost proof, and final release
      evidence.

13. `13-v1-home-decoupling-next-plan.md`
    - Prior next plan for finishing the Home decoupling: Profile/DM own the
      social path, Home is explicit live room after trust.
    - Use this before changing add-friend delivery, DM bootstrap, profile hub,
      or Home entry behavior.

14. `14-v1-product-logic-unification-next-plan.md`
    - Prior product-logic unification plan: desktop and Android should share one
      profile-first IM model and one main product surface vocabulary.
    - Use this before changing navigation labels, request-state copy, profile
      actions, or Home advanced/debug controls.

15. `15-v1-ready-product-next-plan.md`
    - Current V1 finish plan: lock product parity, make Chat the primary trust
      result, keep Treehole personal, demote Home to explicit live room, and run
      the final release proof.
    - Use this for the previous ready-product plan and release proof context.

16. `16-v1-profile-delivery-next-plan.md`
    - Previous next plan after phone smoke clarified the core rule: profile-level
      P2P owns friend requests, accepts, and durable DM; Home is only explicit
      live-room entry after trust.
    - Use this for the profile-delivery cleanup context before `17`.

17. `17-v1-profile-routed-im-next-plan.md`
    - Previous V1 plan: finish Kepos as a profile-routed private IM where
      friendship, requests, Chat, and profile posts are profile-routed, while
      Home is only an optional live room after trust.
    - Use this for the product model locked before `18`.

18. `18-v1-profile-p2p-hardening-next-plan.md`
    - Previous V1 plan: harden the profile-to-profile P2P route for requests,
      accepts, DM bootstrap, Chat, profile posts, and explicit Home entry.
    - Use this for the route-hardening evidence baseline before `19`.

19. `19-v1-profile-social-delivery-next-plan.md`
    - Previous V1 plan: finish the profile-social delivery model. Profile is
      the social address; Home is only an explicit live room after trust.
    - Use this for the product model before the completion plan.

20. `20-v1-profile-social-completion-next-plan.md`
    - Previous V1 plan: finish accept, DM bootstrap, shared product logic, and
      final proof on the profile-social route.
    - Use this for the current low-cost completion evidence.

21. `21-v1-profile-social-release-next-plan.md`
    - Previous V1 plan: release evidence for the profile-social IM product.
    - Use this for the release-proof context before `22`.

22. `22-v1-profile-p2p-delivery-next-plan.md`
    - Previous V1 plan: finish production profile-to-profile P2P delivery while
      keeping Home out of add friend, accept, DM bootstrap, and private Chat.
    - Use this as profile P2P delivery evidence context.

23. `23-v1-social-delivery-release-plan.md`
    - Previous V1 plan: finish the private IM release path on profile-social P2P.
      Profile QR is the normal add-friend path; Debug Home QR is only an
      advanced live-room transport descriptor.
    - Use this as the product-rule baseline before `24`.

24. `24-v1-release-proof-next-plan.md`
    - Previous V1 plan: finish the final release-proof pass for the profile-first
      private IM product.
    - Use this as the final proof bar before calling V1 ready.

25. `25-v1-profile-route-implementation-next-plan.md`
    - Active V1 plan: fix the profile-route implementation and UI parity before
      the final release proof. Friend request, accept, DM bootstrap, and Chat
      are profile-routed; Home is only explicit live-room entry after trust.
    - Use this for current V1 implementation work.

## Core Principle

Product semantics must not depend on the current transport shortcut.

If a user taps "Add friend", the product should mean:

> I want to create mutual trust with this person.

It must not mean:

> I want to join their Home room.

Joining a Home must not be used to deliver the request in the production
architecture. Friend request, accept, and durable DM delivery must be
profile-to-profile P2P. Direct host/port is diagnostics only, not a production
social route.
