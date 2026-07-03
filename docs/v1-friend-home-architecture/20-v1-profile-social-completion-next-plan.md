# V1 Profile Social Completion Next Plan

This was the active next plan after request retry became a desktop and Android
product affordance.

The current next plan is
`23-v1-social-delivery-release-plan.md`. Use `23` for new V1 work. Use this
document for the completion evidence gathered so far.

The V1 rule remains:

```text
Profile is the social address.
Profile-to-profile P2P is the production social route.
Home is only an explicit live room after trust.
```

`19-v1-profile-social-delivery-next-plan.md` defines the product model. This
document defines the next implementation order to get V1 to a ready private IM.

## Current Evidence

Already true or partly proven:

- Desktop and Android both present profile request targets separately from Home
  entry.
- Desktop Sent requests can be retried through profile transport and do not read
  Home runtime.
- Android Sent requests can be retried through `RPC_PROFILE_REQUEST_SEND` using
  the original request id, text, timestamp, and target profile.
- Retry marks the local outgoing request queued, and later delivery state events
  update the contact book.
- Desktop accept sends the signed DM invite through profile transport, saves the
  updated ContactBook, and does not broadcast over Home.
- Android accept creates the accepted thread, sends the signed DM invite through
  `profileRequestRuntime.send(invite)`, sends acceptance delivery state, saves
  and opens the thread, emits `RPC_DM_THREAD`, and does not read Home.
- Android receives `RPC_DM_THREAD` before async storage completes, upserts the
  thread, and marks the matching outgoing request accepted in ContactBook.
- The shared Chat thread list creates accepted rows from trusted ContactBook
  contacts even when there are no saved messages or thread snapshots yet.
- Desktop render proof shows restored accepted Chat rows from ContactBook,
  persisted DM thread metadata, and saved messages while no Home session is
  active.
- Android bootstrap proof shows durable ContactBook and accepted thread metadata
  restore from app file storage, then render through the shared Chat thread view
  after restart.
- Chat and Contacts are the intended trusted-person surfaces.
- Home is documented as a live room, not the way to add friends.
- Desktop and Android navigation use the same four product surfaces: Home,
  Chat, Contacts, and Treehole.
- Home QR, raw room key, and direct endpoint controls are behind Advanced/debug
  surfaces instead of the normal add-friend path.
- Desktop Chat rows can open the same profile detail route as Contacts.
- Android Chat rows and the direct-thread header open Contacts with the selected
  profile id, then `PeopleActions` and `ContactManager` resolve the selected
  contact, pending request, outgoing request, blocked contact, or scanned
  profile target into one `ContactProfileDetail`.
- The shared trusted profile view model defines Message, Recent posts, Enter
  Home, and Remove friend actions.

## What Is Still Not Good Enough

V1 is not ready until these are true on both desktop and Android:

- Friend request accept and invite return are proven on the physical
  cross-device path with Home peer counts staying zero.
- The accepted contact appears in Contacts and Chat on the final physical
  cross-device path without entering Home.
- DM bootstrap durability is proven through physical restart on both clients.
- The first private message path is clearly Chat, not Home room chat.
- Profile detail is the shared destination from Contacts and Chat.
- Treehole remains my own post surface, while a friend's recent posts are
  profile context.
- Home entry is explicit and secondary.

## Phase 1: Prove Accept Without Home

Implement and test accept delivery as profile-social delivery.

Required behavior:

- accepting a request creates local trust immediately
- accept sends a signed result back through the profile route
- the sender can observe accepted or syncing state without joining Home
- both sides keep honest state if the return path is delayed
- Home peer count can stay zero for the whole flow

Low-cost status: complete for source and model proof. Desktop and Android tests
fail if accept uses Home control, Home entry, or direct host/port delivery.

Remaining proof: physical cross-device release proof still needs to record Home
peer counts at accept/invite return.

## Phase 2: Prove DM Bootstrap Without Home

After accept works, make Chat the durable result of trust.

Required behavior:

- accept creates or unlocks a durable pairwise thread
- a trusted contact appears in Chat before the first message
- thread preview and local message state survive restart
- first message send uses the DM/profile route, not Home room chat
- failed or pending bootstrap state is visible instead of hidden

Low-cost status: complete for model, storage, and render proof. Tests prove
accepted threads are saved/opened, `RPC_DM_THREAD` updates Android UI state,
trusted contacts can become Chat rows before messages, accepted message sends
avoid Home, desktop renders restored accepted Chat rows without Home, and
Android bootstrap restores trusted ContactBook plus accepted thread metadata
from app file storage.

Remaining proof: physical desktop and Android restart proof still needs to show
the accepted Chat thread, preview, and first private message path after restart.

## Phase 3: Finish Shared Product Logic

Desktop and Android should use the same nouns and state transitions.

Required behavior:

- bottom navigation or primary navigation has Home, Chat, Contacts, Treehole
- Profile QR means add friend
- Home QR, raw room key, and direct host/port are Advanced/debug
- request rows show queued, searching, sent, delivered, accepted, or failed
- Contacts row and Chat row open the same profile detail
- trusted profile actions are Message, Recent posts, Enter Home, and Remove
  friend

Low-cost status: complete for source and model proof. Tests prove shared
navigation nouns, Advanced/debug Home QR placement, desktop profile opening
from Chat, Android Chat and Contacts sharing one profile detail route, and
trusted profile actions.

Remaining proof: physical screenshots/manual proof still need to show the same
model on both clients in the real cross-device path.

## Phase 4: Final Low-Cost Gates

Run low-cost proof before any physical phone smoke.

Required gates:

- typecheck
- lint
- focused model and UI tests for request, accept, DM bootstrap, and navigation
- Android bundle/import tests
- doc current-state test

Do not run the high-cost phone smoke unless the user asks for release proof.

## Phase 5: Final Cross-Device Proof

When the user asks for release proof, run the physical desktop plus Android
path and record it in `tmp/final-v1-proof.md`.

The proof must show:

1. Android scans desktop Profile QR.
2. Android sends a friend request.
3. Desktop receives it without entering Android Home.
4. Desktop accepts without entering Android Home.
5. Android observes trusted state without entering desktop Home.
6. Both clients show each other in Contacts and Chat.
7. Both clients open the same profile detail from Contacts and Chat.
8. Both clients send durable private Chat messages.
9. Restart preserves contacts, trust, threads, previews, and local Treehole
   posts.
10. Enter Home works only as a later explicit action.

## Guardrails

- Do not add another normal invite path.
- Do not make Home QR part of add-friend bootstrap.
- Do not use direct host/port as production social delivery.
- Do not hide delivery failure behind optimistic local state.
- Prefer shared TypeScript for domain and protocol logic.
- Keep platform code focused on UI, storage, camera, IPC, and runtime glue.
