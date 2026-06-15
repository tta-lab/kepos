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
