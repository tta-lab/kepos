# V1 Product Logic Unification Next Plan

This is the next plan after Home was decoupled from friendship.

The remaining V1 work is not to add another feature. It is to make desktop and
Android behave like the same product:

```text
Profile QR -> friend request -> accept -> Contacts + durable Chat + profile context.
Home is entered later, explicitly, as a live room.
```

## Product Rule

Home must not be part of adding a friend.

- A Profile QR is a social address.
- A friend request is profile-to-profile delivery.
- Accepting a request creates mutual trust and DM eligibility.
- Chat is the normal durable private channel.
- A profile page is where the user sees message, posts, and Enter Home.
- Home is only a live room action after trust or an activity invite.

If a normal path still says "join Home" in order to add, accept, or chat, that
path is wrong.

## Why This Plan Exists

The current risk is split-brain product logic:

- desktop has more of the target IM shape
- Android still exposes older Home/Profile QR split in places
- some tests still encode older assumptions
- some UI labels make Home look like the main product

That makes smoke confusing. A user can send a request and see no obvious result
because the UI mixes request delivery, Home reachability, and profile state.

V1 should be smaller and clearer:

```text
People first. Messages second. Posts third. Home later.
```

## Unified Model

Both clients should render from the same product facts.

### Profile

One device has one profile. The profile is the social address.

Required facts:

- profile id
- display name
- avatar when available
- Profile QR payload
- optional signed Home descriptor as reachability metadata

The Home descriptor can help later Home entry. It must not grant friendship by
itself.

### Contact

ContactBook is the local source of relationship truth.

Required states:

- unknown
- outgoing request: queued, searching, sent, delivered
- incoming request
- trusted
- ignored
- revoked or removed

Desktop and Android should use the same state names and copy.

### Chat

Chat is the primary durable private surface.

Required facts:

- trusted contacts appear in the Chat list
- pending request rows can appear in the Chat list with honest state
- accepting a request opens DM eligibility without entering Home
- DM send must not use Home room chat in the normal path

### Profile Page

The profile page is the hub for one person.

Required actions:

- Message
- Accept / Ignore when there is an incoming request
- Retry or status when there is an outgoing request
- Recent posts when available
- Enter Home only when trusted and a descriptor exists

Opening a profile must not auto-enter Home.

### Home

Home is a live room.

Required behavior:

- it can have a house icon and a visible Home entry
- entering Home is explicit
- entering Home may switch to the live-room/chat surface
- leaving Home must not stop profile-level request delivery
- Home QR, raw room key, and direct host/port belong in Advanced

Home is not the permission source for profile posts or DM.

## Implementation Order

1. Audit normal user paths for hidden Home dependency.
   - mobile Profile QR scan
   - mobile request send
   - mobile request accept
   - desktop request send
   - desktop request accept
   - DM invite return
   - DM body send

2. Normalize shared state and copy.
   - one vocabulary for request delivery states
   - one vocabulary for trusted contacts
   - one vocabulary for profile actions
   - one vocabulary for Home as live room

3. Bring Android UI up to desktop product parity.
   - bottom navigation: Home, Chat, Contacts, Treehole
   - Contacts is a real people list, not a debug panel
   - Chat is a real list/thread entry point
   - Profile QR is the normal add-friend QR
   - Home QR is Advanced

4. Keep desktop aligned with the same model.
   - no labels that imply Home is required for friendship
   - Chat and Contacts do not depend on room membership
   - profile actions route to DM/profile/Home explicitly

5. Strengthen automated proof before manual smoke.
   - Profile QR scan creates a profile request target, not a Home target
   - request send does not call Home entry
   - accept does not require Home membership
   - invite return uses profile-level delivery
   - Chat send does not use Home room chat
   - Home peer count can stay zero during request and accept

6. Run the final cross-device proof once source proof is clean.
   - Android scans desktop Profile QR
   - Android sends request
   - desktop receives request while Home peers may stay zero
   - desktop accepts without joining Android Home
   - Android becomes trusted
   - both sides can Chat
   - restart keeps durable Chat and profile state
   - Enter Home works only as an explicit later action

## Done Criteria

V1 is ready when this is true on both desktop and Android:

```text
I add you by scanning your profile. You accept. We can chat and view profile
context. We enter Home only when we choose that live-room action.
```

No normal V1 path may require Home entry for friendship, request delivery,
acceptance, or durable Chat.

## Current Next Step

Use this document as the active product-logic plan after
`13-v1-home-decoupling-next-plan.md`.

The next engineering pass should update source and tests in this order:

1. Android navigation and visible UI parity.
2. Profile request send/accept state proof.
3. Chat list and profile page parity.
4. Home QR and raw room controls moved behind Advanced.
5. Final cross-device proof packet.
