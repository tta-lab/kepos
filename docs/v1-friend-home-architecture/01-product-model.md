# Product Model

## Nouns

### Profile

A profile is one device identity.

V1 rule:

- one device has one profile
- the profile has a signing key
- the profile owns one Home
- the profile owns one Treehole

The profile is the person-like object in the app. Contacts, friend requests, posts, and DMs point to profiles.

### Friend

A friend is a profile that this device trusts.

Product meaning:

- can have accepted durable DM threads with me
- can read and interact with my Treehole, subject to policy
- can enter my trusted-only Home if I choose to open a live Home
- can be revoked locally

Friendship should be presented as a social relation, not as "Home access setup".

### Home

A Home is a live session surface owned by one profile.

Product meaning:

- live room chat
- live presence
- explicit entry point to view that friend's current space
- activity/session surface after trust

Home is not the friend relation itself. It is not the bootstrap path for friendship. It is a live space you can enter after trust exists.

### Treehole

A Treehole is the owner's durable personal feed.

Product meaning:

- owner posts
- trusted friends can read, comment, and like
- profile pages can show cached recent posts

Treehole permissions are derived from trust, not from "I happen to know a Home key".

### Chat

Chat has two different surfaces:

- Home chat: live, room-scoped, ephemeral
- DM: durable, pairwise, friend/request-scoped

They should not be mixed in the UI. Home chat is like talking in someone's room. DM is like private chat with a person.

## User-Facing Rules

### Add Friend

Target meaning:

1. A scans B's Profile QR.
2. A sends B a friend request.
3. Kepos delivers the request over profile-to-profile P2P.
4. B accepts.
5. Both sides store mutual trust.
6. A and B now appear in each other's Contacts.

The user should not need to understand Home transport for this.
Home should not be opened, joined, or mentioned as part of this path.

### Enter Home

Target meaning:

1. A already trusts B, or has a valid one-time activity invite from B.
2. A opens B's profile or Contacts row.
3. A taps "Enter Home".
4. A joins B's live Home session.

Entering Home is an explicit action after or beside friendship. It should not be the mental model for adding a friend.

### View Profile Posts

Target meaning:

1. A opens B's profile.
2. A sees cached recent posts if available.
3. Kepos can refresh posts through profile-level replication when available.

V1 can keep this simple, but the user should see it as "view B's profile", not "join a replication room" or "enter Home".

### Invite To Activity

Target meaning:

1. A and B are already friends.
2. A invites B to an activity: watch, listen, game, local service, etc.
3. The invite carries session details for that activity.

This is not a trust invite. It is an activity invite between trusted profiles.

## Non-Goals For The Product Model

- No public global username system in V1.
- No auto-entering every friend's Home.
- No separate "Home QR is the normal way to become friends" product path.
- No confusing "trust Home" language in primary UX.
- No requirement that users understand P2P rooms, keys, or control channels.
- No direct host:port path in the production product model.
