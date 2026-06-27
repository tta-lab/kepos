# V1 MLP UX After Architecture Switch

This document describes how Kepos should improve UX after the desktop
architecture moves toward React UI plus a Bare worker backend.

The architecture switch matters because it lets the UI become a product shell
instead of a direct protocol console.

## Goal

V1 MLP should make the first private-home loop feel obvious:

```text
create my home
trust a friend
join a friend's home
chat in the home
read or post to treehole
send a DM
restart and still see durable state where expected
```

The UX should hide protocol machinery until the user needs debug detail.

Kepos should feel like:

```text
a private home for trusted friends
```

not:

```text
a P2P key exchange demo
```

## Product Tone

The UI should be calm, local, and trusted.

Recommended tone:

- quiet rather than loud
- personal rather than corporate
- dense enough for repeated use
- warm enough to feel like a place
- explicit about trust without sounding paranoid

Avoid:

- marketing hero layouts inside the app
- decorative cards inside cards
- platform-social clutter
- raw protocol strings as primary UI
- security theater wording
- meeting-app language for V1

## UX Principle

Every visible surface should answer one of these questions:

1. Where am I?
2. Who is trusted here?
3. What can I do now?
4. What is live and what is durable?
5. What changed because of trust or revoke?

If a UI element does not answer one of these, move it to advanced/debug or
remove it.

## Shared Mental Model

Desktop and mobile should share the same product words:

| Concept            | Product Word    | Avoid As Primary UI        |
| ------------------ | --------------- | -------------------------- |
| profile key        | Profile         | public key                 |
| home room key      | Home            | room key                   |
| signed profile URI | Profile QR      | signed URI                 |
| signed home URI    | Home QR         | address payload            |
| ContactBook entry  | Trusted friend  | contact record             |
| revoke             | Revoke trust    | delete                     |
| treehole           | Treehole        | feed                       |
| room chat          | Home chat       | channel                    |
| DM request         | Message request | encrypted invite bootstrap |

Raw ids and URIs should remain copyable, but they should not define the normal
experience.

## Desktop UX Direction

Desktop becomes the primary product workbench for V1 MLP and later V2/V3.

Use:

```text
Electron renderer
React
lucide icons
Bare worker bridge
```

### Layout

Recommended desktop layout:

```text
left rail        main surface                    right context
Home            current chat/treehole/DM        people/status/QR
DM
Treehole
People

bottom rail:
Profile / Advanced / Leave
```

The left rail should be stable. It should not collapse into setup controls.

### Home View

Home is the default surface after joining or creating.

It should show:

- home chat
- composer
- current peer count
- trusted people summary
- primary actions: invite, copy home, leave

It should not show raw home key unless the user opens advanced.

Empty state:

```text
No messages yet
```

Primary action:

```text
Invite a friend
```

### People View

People owns trust.

It should show:

- trusted friends
- pending message requests if any
- trust status
- revoke trust action
- profile QR
- trust profile action

Trusting a friend should be framed as:

```text
Add trusted friend
```

The detail view can show:

- local alias
- short profile id
- trust source
- trusted at
- revoked state

### Treehole View

Treehole should feel like a durable wall for the home owner, not a generic feed.

It should show:

- posts
- comments
- likes
- author display names or local aliases
- clear disabled state when writing is not allowed

Empty state:

```text
No posts yet
```

If the local user cannot create a main post, the composer should not look
broken. It should explain the state with one short line:

```text
Only the owner can post here.
```

Comments and likes can stay available when policy allows.

### DM View

DM should not require typing profile ids in normal use.

It should prioritize:

- trusted friend picker
- accepted thread state
- incoming request cards
- send composer

Manual profile id entry belongs in advanced/debug.

Message requests should read as social actions:

```text
Neil wants to start a DM.
```

not as protocol actions:

```text
Incoming kepos.message.request.v1
```

### QR And URI UX

QR is a sharing action, not a permanent dashboard block.

Use dialogs or side panels for:

- Show Profile QR
- Show Home QR
- Paste Profile URI
- Paste Home URI
- Copy URI

Keep large QR rendering for screen-to-phone scanning.

### Status UX

P2P state should be visible but secondary.

Recommended statuses:

- Starting
- Looking for peers
- Connected
- Syncing treehole
- Offline
- Error

Advanced status can include:

- short home key
- short profile id
- treehole status
- backend worker status
- raw error detail

### Desktop Icon Language

Use lucide for common actions:

- `Home`
- `MessageCircle`
- `Sprout` or `Trees`
- `Users`
- `UserPlus`
- `UserMinus`
- `QrCode`
- `Copy`
- `ShieldCheck`
- `LogOut`
- `Send`
- `Heart`
- `Settings`
- `AlertCircle`

Buttons should be icon-first when the command is common, with a tooltip or short
label when needed. Do not use icons as decoration.

## Mobile UX Direction

Mobile should stay close to the same mental model, but use a phone-native
structure.

Recommended mobile shape:

```text
top header: current home / status
bottom tabs: Home, DM, Treehole, People
primary action: contextual floating or fixed button
```

Mobile should not mirror the desktop three-column layout.

### Mobile Home

Mobile Home should prioritize:

- current home chat
- composer
- peer status
- invite/join actions behind a header action or People tab

The first screen should not start as a long setup page after the user already
has a profile.

### Mobile People

People should become the home for:

- scan profile QR
- show my profile QR
- scan home QR
- show my home QR
- trusted contacts
- revoke trust

This reduces setup clutter in the chat surface.

### Mobile QR

Mobile has the camera, so scanning should be first-class.

Use:

- `Scan Profile QR`
- `Scan Home QR`
- `Show My Profile QR`
- `Show My Home QR`

Paste URI should exist, but scanning should be the normal mobile path.

### Mobile DM

Mobile DM should use trusted contact chips or a list before any manual profile
id input.

Incoming requests should be cards with:

- alias or short id
- message preview
- accept
- ignore or revoke later

### Mobile Treehole

Treehole should match desktop semantics:

- owner can post
- trusted peers can comment/like when policy allows
- disabled composer states are explicit
- empty state is short

## Onboarding

First run should reduce to three product choices:

```text
Create My Home
Join a Home
Trust a Friend
```

The app can still create profile/home keys automatically, but the UI should not
teach the user about that first.

On desktop, these actions can live in a welcome surface.

On mobile, these actions can live in a compact setup screen plus People tab.

## Error Handling

Errors should be layered:

1. user-facing short message
2. retry or next action
3. advanced detail

Examples:

```text
Could not join this home.
Check that this friend is trusted on this device.
```

```text
P2P backend is not ready.
Try again after it starts.
```

Raw exception messages should be visible in advanced detail, not as the main
toast copy.

## Live Versus Durable

The UI must make the data model honest:

- Home chat is live and ephemeral.
- Treehole is durable.
- DM is durable and pairwise.
- Revoke blocks future access but does not erase already replicated data.

This does not need long explanatory copy. It can be shown through placement and
short labels:

```text
Live home chat
Durable treehole
Direct messages
Trust revoked
```

## Accessibility And Fit

V1 MLP should not ship a cramped UI.

Rules:

- text must not overlap at desktop or mobile sizes
- buttons need stable dimensions
- icon buttons need accessible labels or tooltips
- long ids must wrap or truncate intentionally
- dialogs must be keyboard reachable on desktop
- mobile QR scanner must have clear cancel and permission-denied states

## Implementation Order

1. Define shared product words and command/event names.
2. Move desktop backend behind the Bare worker bridge.
3. Keep existing desktop behavior working through the bridge.
4. Add desktop React renderer and lucide.
5. Build desktop MLP shell: left rail, main surface, right context.
6. Move QR/trust/home join flows into product actions.
7. Align mobile tabs and People/QR structure with desktop words.
8. Add empty, loading, disabled, and error states on both platforms.
9. Run desktop smoke, contact smoke, Android checks, and cross-device smoke.

## Success Bar

The UX pass is successful when a new trusted friend can use Kepos without
learning protocol terms.

Minimum user loop:

1. Neil opens desktop and creates his home.
2. Ada opens mobile and scans Neil's profile QR.
3. Ada trusts Neil.
4. Ada scans Neil's home QR.
5. Ada joins the home.
6. Both exchange home chat.
7. Ada reads or interacts with Neil's treehole.
8. Ada sends Neil a DM request.
9. Neil accepts.
10. Both restart and the durable state still makes sense.

If this loop needs raw key explanation, the MLP UX is not done.
