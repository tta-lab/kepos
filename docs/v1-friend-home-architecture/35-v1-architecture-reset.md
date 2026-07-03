# V1 Architecture Reset

This is the current V1 reset contract after the physical Android release proof
found that Profile QR scan worked, but the scanned-profile Chat composer was not
reachable.

The problem is not only a mobile layout bug. It is a product-state problem:
Profile, request target, outgoing request, trusted contact, Chat, Treehole, and
Home are still partly projected by separate UI branches.

## Product Model

V1 is profile-first and Home-secondary.

Normal social path:

```text
scan Profile QR -> request target -> send request -> pending -> accepted -> Chat / Profile / Treehole
```

Optional live/session path:

```text
accepted contact -> Profile detail -> Enter Home
```

Home is not an authorization route. Home is not part of adding a friend. Home is
a live surface that becomes available only after trust or an explicit future
activity invite.

## Relationship State Machine

Every desktop and mobile profile UI must derive from the same relationship
states:

| State              | Meaning                                                 | Primary actions                                                          |
| ------------------ | ------------------------------------------------------- | ------------------------------------------------------------------------ |
| `request_target`   | A Profile QR was scanned but no request was sent yet.   | Message composer sends the friend request. Profile detail is readable.   |
| `outgoing_request` | This device sent a request and waits for acceptance.    | Show pending state. Retry only if delivery allows it.                    |
| `incoming_request` | The remote profile sent a request to this device.       | Accept or ignore.                                                        |
| `trusted`          | The profiles have mutual trust locally.                 | Message, view profile posts, explicit Enter Home if a descriptor exists. |
| `ignored`          | This device ignored that profile's request.             | Allow requests before a new request can be accepted.                     |
| `removed`          | This device revoked or removed trust.                   | Allow requests before future trust can be rebuilt.                       |
| `blocked`          | UI shorthand for states that cannot send a new request. | Explain why the send is blocked.                                         |

Allowed transitions:

```text
none -> request_target
request_target -> outgoing_request
none -> incoming_request
incoming_request -> trusted
incoming_request -> ignored
outgoing_request -> trusted
trusted -> removed
ignored -> request_target after Allow requests
removed -> request_target after Allow requests
```

No transition may require entering Home.

## UI Contract

Desktop and Android may use different components, but they must consume the same
relationship model.

Required projections:

- A scanned `request_target` opens Chat with the scanned profile selected.
- Chat must show a usable composer for `request_target`, even when the user has
  zero contacts.
- Sending from that composer creates a friend request and moves the relation to
  `outgoing_request`.
- Contacts and Chat rows must open the same Profile detail for a profile.
- `trusted` shows Message as the primary action.
- `Enter Home` is visible only as an explicit post-trust action.
- Treehole local posting does not require Home.
- Profile recent posts do not require Home.

Forbidden projections:

- Showing "no contacts" as a blocker when a scanned request target exists.
- Requiring Home readiness, Home peer count, raw Home key, or Debug Home QR to
  send a friend request.
- Treating Home join as trust, friendship, or DM bootstrap.
- Hiding the request composer below nonessential empty states.

## Complexity Diagnosis

The hard part is not that V1 has too many features. The hard part is that older
iterations let several product paths imply relationship state:

- Profile QR could mean trust invite, request target, or debug payload.
- Home could look like an entry path into social trust.
- Chat empty states could treat zero trusted contacts as a blocker, even when a
  scanned request target already existed.
- Desktop and Android could render different empty states and action affordances
  for the same profile.

The reset rule is therefore strict: only the profile relationship state machine
defines what the user can do. Home, Treehole, Chat, and Contacts are projections
of that state. They do not invent their own trust rules.

## Complexity Reset Rule

V1 should now optimize for fewer product truths, not more feature surface.

The codebase is already large enough that local UI fixes can hide architecture
debt. The reset therefore has a deletion rule:

- Keep the main model: Profile -> relationship state -> Chat / Profile /
  Treehole / explicit Home entry.
- Keep shared model helpers in `src/` as the product source of truth.
- Keep desktop and Android components as renderers of those view models.
- Demote Home QR, raw keys, direct host:port, and manual transport controls to
  Advanced/debug surfaces.
- Remove or rewrite any normal onboarding, Chat, Contacts, Profile, or
  Treehole branch that decides product access from Home readiness, room state,
  raw invite text, or transport debug state.

The target is not to rewrite the whole app. The target is to make every V1
screen answer the same question in the same way:

```text
What is my relationship with this profile?
```

Then the screen derives allowed actions from that answer.

## Keep / Demote / Remove

Keep in V1 normal UI:

- Profile QR as the social entry point.
- Friend request target preview after scan or paste.
- Chat composer for `request_target`.
- Incoming and outgoing friend request states.
- Trusted contact Profile detail.
- Durable Chat thread list and message view.
- My Treehole as my own durable posting surface.
- Trusted contact Recent posts as profile context.
- Explicit Enter Home after trust.

Demote to Advanced/debug:

- Home QR as a normal add-friend path.
- Raw Home key entry.
- Manual profile id or topic entry.
- Direct host:port delivery.
- Transport debug controls.

Remove from normal UI logic:

- Any "no contacts" blocker when a request target is selected.
- Any friend request send path that requires Home to exist or be joined.
- Any Profile, Chat, Contacts, or Treehole branch that treats Home join as
  trust creation.
- Any duplicate product vocabulary that exposes "message request", "DM invite",
  "home invite", or "bootstrap" to normal users instead of friend, chat,
  profile, and home.

## Next Implementation Slice

The next source work should not start from smoke. It should start from a small
architecture slice:

1. Search desktop and Android UI for normal-path Home QR, raw key, direct, and
   debug controls.
2. Move those controls behind a single Advanced/debug boundary on both
   platforms.
3. Make the default screen hierarchy show only the V1 product model:

   ```text
   Home / Chat / Contacts / Treehole
   ```

   with Profile detail opened from Chat, Contacts, or scan results.

4. Keep tests focused on model and source structure first. Use physical smoke
   only for the final release-proof path or when a source-level fix cannot be
   trusted without a device.

This is the practical answer to the current complexity concern: reduce the
number of visible product routes before adding more polish.

Current source alignment:

- `request_target`, `outgoing_request`, `incoming_request`, `trusted`,
  `ignored`, `removed`, and `blocked` live in the shared relationship state
  module.
- ContactBook-to-relationship-state inference also lives in the shared module,
  so UI view models do not each define their own ordering.
- Chat view models preserve `ignored` and `removed` as explicit states instead
  of folding them into a generic blocked bucket.
- Request-target Profile detail keeps Home disabled but keeps Message enabled,
  so the user can return to Chat and write the request.
- Desktop and Android both hide misleading zero-contact/zero-thread empty states
  when the selected Chat recipient is a scanned request target.
- Android Contacts now projects trusted contacts, incoming requests, outgoing
  requests, removed/ignored profiles, and scanned request targets through
  `src/mobile-contact-profile-selection.ts` before rendering Profile detail.
  `mobile/people-components.tsx` composes the UI instead of owning the
  relationship-state branching.
- Desktop app state now resolves trusted profile recent posts, selected Profile
  detail, and scanned request-target fallback through
  `src/desktop-profile-selection.ts`. `desktop/app-state.ts` keeps React state
  and bridge wiring instead of owning that relationship/profile projection.
- Desktop and Android selection modules both use
  `src/profile-selection-source.ts` for ordered source matching. The shared
  helper chooses the first source whose `profileId` matches the selected
  profile; platform modules then map that source into their UI view model.
- Desktop and Android Chat empty-state copy now uses
  `src/direct-chat-empty-copy.ts`, so `request_target` prompts the user to write
  an intro while normal empty Chat keeps trusted-contact guidance.
- Desktop and Android Profile detail request actions now call shared
  relationship-state helpers for incoming-request responses and
  removed/ignored recovery instead of branching on raw state strings in
  platform components.
- Desktop Contacts profile-list view models now type `relationshipState` as
  `ProfileRelationshipState` and use the shared incoming-request helper when
  adding accept actions for request profiles.
- Android selected-profile view models now use the shared incoming-request
  helper for accept/ignore actions. Chat empty copy also uses the shared
  request-send helper, so platform components pass relationship state through
  instead of parsing `request_target` themselves.

## Implementation Order

1. Keep this document as the current V1 architecture contract.
2. Put shared relationship state names and helpers in `src/`.
3. Make desktop and Android view models use those shared states.
4. Fix Chat so `request_target` has a stable composer path on mobile and desktop.
5. Prove the previously failing release state before spending time on full
   physical smoke.

## Completion Audit

Current code evidence:

- Product model is documented here as Profile-first and Home-secondary.
- Relationship state names and ContactBook-to-state inference are centralized in
  `src/profile-relationship-state.ts`.
- Desktop and Android Chat send paths call the shared request-target view model
  before deciding whether a Chat composer send creates a friend request or a
  normal Chat message.
- Desktop and Android request-target Profile detail uses the same limited
  request-target profile model: Message is enabled for returning to Chat, while
  Enter Home remains disabled until trust exists.
- Desktop and Android Chat hide misleading zero-thread or zero-contact blockers
  when the selected recipient is a scanned request target.
- Desktop and Android selected Profile projection now flows through shared
  source-level helpers: relationship state inference,
  request-target profile projection, recent-post projection, and ordered
  selected-profile source matching all live in `src/`.

Current automated evidence:

- Latest focused source-reset gate passed with 195 tests covering desktop and
  Android Profile selection, source matching, Profile route closure, renderer
  structure, and docs current-state checks.
- `npm run lint` passed after the same source-reset work; this includes
  typecheck and platform-boundary checks.
- Focused model/UI tests cover profile relationship state, friend request target
  view models, contact profile view models, desktop Contacts, desktop Chat, and
  Android Chat/Contacts source structure.

Remaining evidence before calling V1 ready:

- Physical Android release proof for the exact failed path:
  Profile QR scan -> request target -> reachable `dm-message-input` -> send
  request -> pending -> desktop receives request without entering Home.
- Full final proof packet in `tmp/final-v1-proof.md`, checked by
  `npm run v1:proof:check -- --file tmp/final-v1-proof.md`.

Current blocker for that last evidence: `adb devices -l` reports no connected
devices, so the physical Android proof cannot be run in this pass.

## Current Failure That Triggered This Reset

Observed on a physical Pixel 7a release APK:

1. Android scanned the desktop Profile QR successfully.
2. Android switched to Chat and showed the desktop `profile-request-target-card`.
3. The screen still showed "No message threads yet" and "No contacts yet".
4. The `dm-message-input` was not reachable in the UI tree, so the user could
   not send the friend request.

The fix is to make `request_target` a first-class Chat state, not to add more
smoke retries.
