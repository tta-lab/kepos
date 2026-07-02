# V1 Friend And Home Architecture

This folder resets the V1 mental model for friends, Home, DM, Treehole, QR, and transport.

The short version:

- Adding a friend is a social and authorization action.
- Entering a Home is a session and transport action.
- Home should have no role in adding a friend.
- Profile, Contacts, DM, and Treehole are the main product axis.
- Home is only a live space after trust, not the social bootstrap.
- Current V1 code still leaks Home transport into the friend flow. That should be treated as wrong direction, not a production path.

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
   - Use this as the next coding plan.

## Core Principle

Product semantics must not depend on the current transport shortcut.

If a user taps "Add friend", the product should mean:

> I want to create mutual trust with this person.

It must not mean:

> I want to join their Home room.

Joining a Home should not be used to deliver the request in the target architecture. Friend request delivery must be profile-to-profile P2P.
