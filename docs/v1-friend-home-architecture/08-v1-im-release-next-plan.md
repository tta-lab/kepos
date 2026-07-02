# V1 IM Release Next Plan

This is the current V1 plan after profile-level friend request delivery, invite
return, Home fallback quarantine, and receiver acknowledgements landed.

The goal is no longer to prove that Home should not own friendship. That
decision is made. The goal now is to make V1 feel like a ready private IM
product on top of P2P.

## Product Sentence

V1 should be explainable as:

```text
Profile QR -> friend request -> mutual trust -> Chat / Profile / Treehole / explicit Home entry
```

Home is deliberately last in that sentence. It is a live space a trusted user
can enter. It is not the way friendship is created.

## Current Baseline

Implemented source-level behavior:

- Profile QR creates a profile/contact target, not a Home join target.
- Normal friend request send uses the profile-level request runtime.
- Normal accept / invite return uses the profile-level request runtime.
- Request and invite frames are signed and verified before changing UI or DM state.
- Receiver acknowledgement exists; `delivered` means the target runtime accepted
  a valid signed frame.
- Home-control request and invite handling is ignored by default.
- Legacy Home fallback requires explicit debug configuration.
- Automated tests prove accept and invite return without Home membership.

Still missing before calling V1 ready:

- real desktop/Android proof of the normal product path
- UI parity between desktop and Android for the four main surfaces
- clearer friend/request/contact state transitions in the product UI
- final cleanup of debug affordances from primary screens

## Architecture Rules For The Remaining Work

- Add friend is profile-to-profile. It is not Home entry.
- DM is pairwise and durable. It is not room chat.
- Treehole is the owner's durable post surface. It is not room history.
- Home is an explicit live-room action after trust.
- The product UI should not ask users to choose transport.
- Direct host:port is not a production fallback.
- Manual Home QR / raw key / debug send paths belong in Advanced or developer
  tools only.

## Phase 1: Product State Audit

Audit desktop and Android for these states:

- no profile created
- profile exists, no contacts
- Profile QR scanned, request target ready
- request queued / searching / sent / delivered
- incoming request
- ignored request
- allow requests recovery
- trusted contact
- removed contact
- explicit Enter Home available

Acceptance:

- desktop and Android use the same state names and product meaning
- Home membership is not required to reach incoming request or accept states
- `delivered` is not shown as friendship

## Phase 2: Main Navigation And Surface Parity

The first V1 product should have four obvious surfaces:

- Home
- Chat
- Contacts
- Treehole

Desktop and Android do not need identical layout, but they need identical
product logic:

- Chat opens friend/request threads.
- Contacts opens profiles and request actions.
- Treehole creates and views personal posts.
- Home shows current live room state and explicit entry actions.

Acceptance:

- Android bottom navigation exposes the same four product surfaces.
- Desktop rail exposes the same four product surfaces.
- Empty states guide the next product action, not a transport/debug action.
- Core bar icons can be icon-only when the icon is clear; use labels in content
  areas where meaning would otherwise be ambiguous.

## Phase 3: Friend Request UX Finish

The add-friend flow should be boring:

1. A shows Profile QR.
2. B scans Profile QR.
3. B reviews the profile preview.
4. B sends a friend request.
5. A sees incoming request in Chat and Contacts.
6. A accepts or ignores.
7. Both sides see the contact.
8. Chat opens from the friend row.

Acceptance:

- request send never auto-enters Home
- accept never requires Home membership
- request receipt is visible on both desktop and Android surfaces that should
  show it
- ignored/removed states have an explicit recovery path without restoring old
  trust silently

## Phase 4: Profile And Treehole As Social Context

Profile is the person's page. Treehole is the owner's personal post stream.

For V1:

- a trusted contact profile should show identity, avatar, friend state, recent
  posts when available, Chat, and Enter Home when possible
- the local user's Treehole should allow creating durable posts
- a trusted contact's Treehole/posts should be readable after the data is
  available through the current signed Home/profile sync path

Acceptance:

- "profile" and "Home" are not presented as the same thing
- a user can understand a friend before entering that friend's Home
- own posts survive restart
- post visibility respects the owner/trust rule

## Phase 5: Debug Surface Cleanup

Keep debug tools, but move them away from the default story.

Move or demote:

- raw Home QR
- raw key paste
- direct debug send
- transport counters that do not help normal users
- fallback toggles

Acceptance:

- primary screens explain the product through people, messages, posts, and live
  rooms
- Advanced still has enough tooling to diagnose P2P and QR issues
- docs clearly mark debug paths as debug paths

## Phase 6: Final V1 Proof

Do not run this after every small change. Run it when the source-level work is
done and the user is ready to spend phone time.

Required proof:

1. Desktop creates/loads profile.
2. Android creates/loads profile.
3. Android scans desktop Profile QR.
4. Android sends friend request.
5. Desktop receives incoming request while Home peer count may stay at zero.
6. Desktop accepts.
7. Android receives the profile-level invite/accept result.
8. Both sides show each other as contacts.
9. Chat works both ways and survives restart.
10. Local Treehole post survives restart.
11. Trusted contact profile can show available recent posts.
12. Enter Home works after trust as a separate action.

If step 5 stalls at `queued` or `searching`, the product should say so honestly.
It must not silently claim friendship or hide the failure by joining Home.

## Non-Goals

- no V2 media rooms
- no V3 local service tunnels
- no public account server
- no direct host:port production fallback
- no deep rewrite of the P2P stack unless the final proof exposes a real
  architecture blocker

## Done Means

V1 is ready when:

- the normal add-friend path is profile-level and proven on desktop/Android
- Chat, Contacts, Profile, Treehole, and explicit Home entry form one coherent
  product
- debug surfaces no longer define the default UX
- non-device gates are green
- the final manual proof packet has current evidence
