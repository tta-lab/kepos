# Kepos Project Direction

This note records the current read of Kepos: what it is, what it believes, what
is already real, and where the next architecture discussion should focus.

## Product Shape

Kepos is not only a chat app. It is a private garden for a small circle.

The product model is:

- one device is one profile
- one profile owns one Home
- one profile owns one Treehole surface
- Home chat is live and ephemeral
- Treehole is durable profile text
- Chat messages are durable, pairwise, and separate from Home chat
- trust is the product permission boundary
- raw keys are transport capabilities and debug handles, not normal user-facing permission

This gives Kepos a clear stance: private social space should start from local
identity and explicit trust, not from usernames, global search, or a central
account system.

## Technical Shape

The current stack is a local-first P2P stack:

- Hyperswarm for peer discovery and transport
- Autobase for durable multiwriter treehole logs
- Electron plus pear-runtime for desktop
- Expo React Native plus a Bare backend for Android
- `hypercore-crypto` for identity signing
- fixed `compact-encoding` schemas for signed bytes
- `sodium-universal` sealed boxes for encrypted DM invite payloads
- TypeScript-first shared protocol and domain modules, TSX for React UI source,
  and JS/MJS kept for platform runtime glue where the loader path is not yet worth changing

The important architecture boundary is that identity, trust, signed QR payloads,
treehole policy, DM bootstrap, and durable local state live in shared domain
code. Platform code should wire those rules into UI and runtime behavior, not
redefine them.

## Current Evidence

This read is based on the repository docs, source, and tests as of 2026-07-02.

Verified locally:

- `npm run v1:gate` has passed for the current V1 source shape, including
  lint, typecheck, 902 Node tests, TypeScript compatibility probes, desktop
  bundle generation, Bare Android bundle checks, Expo Android export, and APK
  native-library alignment.
- `npm run android:assemble:release` has passed for the standalone Android
  release APK path.
- V1 model smoke ties signed Profile QR friend requests, trusted Home access,
  treehole writer policy, accepted message requests, durable signed DM messages,
  and revoke policy together.
- Signed records use real keypairs and deterministic signed bytes.
- ContactBook is the shared local trust and request state model.
- Signed QR payloads cover Profile QR friend-request targets, signed Home
  descriptors, and message request routes.
- DM message bodies have a dedicated replication channel and are not accepted as
  home room body frames.
- Treehole signed mode enforces owner-only main posts and trusted comments/likes.
- Desktop Pear/Bare smoke covers the bundled worker bridge for the current app
  path, including Profile/Home QR publication, Home creation, owner Treehole
  posting, contact persistence, message request display, and revoke persistence.

This is stronger than a prototype that only has UI and transport. The project
already has a coherent domain model and tests for the parts that would be
costly to change later.

## Product Beliefs

Kepos appears to believe:

- identity should be a key, not a username
- display names are local aliases, not global truth
- trust should be explicit and directional
- small private groups are a first-class product shape
- durable personal text belongs to a profile-owned space
- live room chat should not pretend to be durable history
- revoke should be honest: block future access, but do not claim to delete data
  already replicated to someone else
- normal users should scan or accept, not copy raw 32-byte keys

These beliefs are coherent. They are also narrow, which is good for V1.

## Confidence

Architecture confidence is high enough to keep going.

The project is spending time on the right hard parts: identity, signing, trust,
QR bootstrap, treehole ownership, DM separation, revoke semantics, and
cross-platform parity.

Implementation confidence is medium-high.

The shared model is tested, and there is desktop/Android smoke wiring. The next
confidence gap is not another domain model. It is repeated live use on real
devices under ordinary network, restart, and permission conditions.

Product confidence is medium.

The thesis is good, but the first user loop must become simpler:

1. create a profile
2. scan a friend's profile QR
3. send a friend request
4. accept or ignore the friend request
5. open the durable Chat thread
6. enter the trusted contact's Home explicitly
7. read recent posts or write to Treehole
8. restart both apps and see contacts, messages, and posts persist
9. remove a friend and see future access stop

If this loop works in minutes without explaining raw keys or protocol terms,
Kepos becomes much easier to believe in.

## Main Risk

The largest near-term risk is scope, not protocol direction.

Do not pull V1 toward every attractive future:

- multi-device identity
- seed phrase backup
- iOS
- public discovery
- usernames
- media posts
- group DM
- background delivery
- complex per-feature permissions

Those may matter later, but they should not blur the first loop.

## Product Level

Kepos should be treated as a high-upside, low-certainty product.

It is not a normal chat app. The stronger read is that Kepos is trying to define
a new social primitive:

```text
trusted private P2P home
```

Today, Kepos is still an early working prototype with a strong technical and
product thesis. It is not yet a proven user habit.

The level depends on which milestone is reached:

1. V1 only as private chat plus treehole

   This is useful, but not enough by itself to make Kepos feel like a new
   category. It proves the identity, trust, QR, room, DM, and treehole spine.

2. V2 with listening rooms and richer presence

   This starts to make the home feel alive. It shifts Kepos from private
   messaging toward a shared place.

3. V3 with Local Service Tunnel and RetroArch sessions

   This is the category-changing step. A home becomes a place where trusted
   friends can temporarily use local software, play games, and share private
   live sessions without a platform owning the space.

If V3 works, the product should be understood as:

```text
small-circle social computing platform
```

That is different from:

- a chat app
- a P2P demo
- a VPN
- a public hosting platform
- a developer tunnel

## Main Product Risk

The main risk is not whether the code can be written. The main risk is whether
people need a no-platform private shared space badly enough to change habits.

Most people already use WeChat, Discord, Telegram, QQ, or other networked social
tools because their people are already there. Kepos must offer something those
tools do not.

The strongest differentiators are:

- friends directly sharing local things
- no platform owning the shared space
- home as a person's place, not only a group chat
- room, live audio, game sessions, treehole, DM, and local services under one
  trust model
- identity as keys and local aliases, not usernames or global handles
- explicit trust and revoke instead of ambient platform membership

The route to confidence is not broad feature count. It is proving short real
loops with real people:

- V1: trust a friend, enter home, chat, treehole, DM, restart, still works
- V2: enter a home and hear the host's live audio stream
- V3: accept a trusted game/local-service share and use it without network setup

Each version should prove one human loop before the next layer expands.

## Future Possibilities

Likely paths worth discussing:

1. Small-circle private social space

   A calm space for close friends, family, small groups, or offline communities.
   This is the most direct product path.

2. Local-first social identity primitive

   Kepos can become a reusable model for profile identity, trust, home, QR
   bootstrap, and pairwise DM. Other features can hang from that spine.

3. Personal space without platform ownership

   Kepos can explore social software without central accounts, global search,
   feed ranking, or analytics-driven distribution.

4. Holepunch mobile/desktop reference app

   Even before product maturity, the project can be useful as a reference for
   Android Bare, Hyperswarm, signed local identity, and cross-device P2P flows.

5. Trusted local service sharing

   Kepos can make local software usable inside a trusted relationship. The
   important primitive is not generic port forwarding by itself, but a signed,
   session-scoped local service tunnel controlled by profile identity, home
   trust, expiry, and revoke.

   This can start with V3 RetroArch game sessions and later apply to local web
   demos, notebooks, AI tools, or other single-port local services.

6. Private P2P shared space

   Kepos should be read as a social product, not only a network tool. The
   unusual bet is a private network circle where friends share presence, chat,
   durable personal text, live audio, game sessions, and local services without
   making a platform the owner of the space.

   The pieces exist separately in other products: chat apps, VPNs, tunnels,
   remote play, self-hosting tools, and P2P protocols. The rare shape is putting
   them behind a friend-scale home/trust model with no central account graph and
   no public distribution layer.

   This is the strongest long-term product thesis: a no-platform shared space
   for trusted people.

## Architecture Questions For The Next Discussion

These are the questions to test before pushing farther:

- Does one-device-one-profile remain acceptable through V1, or does it block too
  much real use?
- When should Kepos add root identity, device proofs, and backup?
- Should home, treehole, and DM each have rotatable capabilities under a stable
  profile identity?
- What is the minimum honest revoke model before users can trust the product?
- Should public home remain chat-only, or is an explicit public treehole policy
  needed later?
- How much offline behavior is required before the app feels reliable?
- What should be replicated by protocol, and what should stay local-only?
- When does a small private garden become a group or community object?

The next architecture work should answer these by pressure-testing future
product shapes against the current V1 spine, not by expanding V1 by default.
