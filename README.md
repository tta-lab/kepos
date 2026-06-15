# kepos
A private garden for 30 friends. Write treeholes that can never be deleted, draw and guess, chat — with no servers.

## P2P chat prototype

This first draft is a terminal chat room built on Hyperswarm. It has no server,
no account system, and no message history. A room is just a shared 32-byte key.

Install dependencies:

```bash
bun install
```

Create a room:

```bash
bun start -- create --nick Neil
```

Share the printed room key with another peer, then join from another terminal or
machine:

```bash
bun start -- join <room-key> --nick Ada
```

Current scope:

- create a room key
- join a room by key
- discover peers through Hyperswarm
- send live text messages to connected peers

Not in this draft:

- Hypercore message history
- member invitations or bans
- treeholes
- games
- mobile UI

## Android UI prototype

The mobile draft is an Expo React Native app. It lets you create a room key,
join by key, enter a room screen, and send local chat messages through the same
chat session state used by the CLI-facing code.

Run it on an Android phone with Expo Go:

```bash
bun run mobile:start
```

Then scan the QR code from the Expo terminal.

Build/run a native Android dev app:

```bash
bun run android
```

Current Android scope:

- create room UI
- join room UI
- room header and peer status
- message list and composer
- shared chat session state with tests

Not wired yet:

- Hyperswarm on Android
- Bare worklet backend
- React Native to Bare RPC
- real peer-to-peer messages between phones
