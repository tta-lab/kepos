# V1 Friend And Home Architecture

This folder resets the V1 mental model for friends, Home, DM, Treehole, QR, and transport.

The short version:

- Adding a friend is a social and authorization action.
- Entering a Home is a session and transport action.
- They are related by permission, but they are not the same product action.
- Current V1 code still leaks transport details into the friend flow. That should be treated as transitional, not the target architecture.

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

## Core Principle

Product semantics must not depend on the current transport shortcut.

If a user taps "Add friend", the product should mean:

> I want to create mutual trust with this person.

It should not mean:

> I want to join their Home room.

Joining a Home may be one way to deliver the request in the current build, but that is an implementation detail. The UI, docs, tests, and architecture should keep those layers separate.
