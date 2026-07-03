# V3 Desktop RetroArch Game Sessions

This document records a possible V3 direction: Kepos home as a trusted desktop
game lobby for RetroArch netplay.

This is not V1 scope. It should not change the V1 profile, trust, treehole, DM,
or Android parity targets.

## Decision

For V3, Kepos may support desktop-only RetroArch game sessions.

Kepos should not become an emulator frontend. It should use the existing
RetroArch and libretro ecosystem for emulation, controller handling, save state,
audio, video, and netplay.

The target V3 shape is:

- Kepos Desktop manages home, trust, signed game invites, ROM peer transfer,
  asset cache, RetroArch launch, a local TCP tunnel, and session state.
- RetroArch Desktop manages emulator cores, game execution, controller
  assignment, and netplay.

Android is deferred for this feature. Deep libretro embedding is explicitly out
of scope.

## Why This Fits Kepos

Kepos already models a home as a trusted private space. A game session is a
natural child session of that home:

- trusted friends can see and accept an invite
- the invite can be signed by the host identity
- ROM transfer can happen only between trusted peers
- game traffic can use an independent session channel
- room chat stays room chat
- treehole and DM remain separate durable products

This follows the same architecture principle as DM: home is the social entry
point, not the transport for every payload.

## Prior Art

RetroArch netplay and Fightcade show that retro co-play is a mature domain.
The common high-quality model is:

- both peers run the same emulator core
- both peers load the same content
- both peers exchange frame-stamped controller input
- the emulator stays synchronized through deterministic execution
- better implementations use save states, replay, and rollback to hide latency

Steam Remote Play Together, Parsec, Moonlight, and Sunshine prove a different
model: the host runs the game, streams video and audio, and guests send
controller input back as virtual local controllers.

Kepos V3 should first reuse RetroArch netplay instead of implementing either a
rollback engine or a remote-play video pipeline.

## Scope

In scope:

- desktop only
- trusted home game invites
- host selects a local ROM
- Kepos computes and advertises `romHash`
- guest checks local asset cache
- guest can request the ROM from the host peer if missing
- downloaded ROM is verified by hash before launch
- Kepos exposes a local TCP proxy so RetroArch netplay can cross ordinary
  home networks without requiring the host to have a public IP
- Kepos launches RetroArch as host or client
- Kepos tracks session state: invited, accepted, transferring, ready, launched,
  failed

Out of scope:

- Android support
- iOS support
- browser support
- embedded libretro cores
- Kepos-owned emulator UI
- Kepos-owned netplay engine
- video streaming remote play
- public ROM catalogs
- public matchmaking
- public ROM search or indexing
- cloud ROM backup

## Product Flow

Host path:

1. Neil opens his home on desktop.
2. Neil chooses "Play with RetroArch".
3. Neil selects a local ROM.
4. Kepos computes `romHash`, `romSize`, and a local asset record.
5. Neil invites Ada from trusted contacts.
6. Kepos creates a signed `GameInvite`.
7. Ada accepts.
8. Kepos starts a ROM asset transfer if Ada does not already have the hash.
9. Kepos starts a host-side local tunnel to the RetroArch netplay port.
10. When both sides are ready, Kepos launches RetroArch host/client sessions.

Guest path:

1. Ada sees a trusted home game invite.
2. Ada accepts.
3. Kepos checks whether the ROM hash exists in Ada's local asset cache.
4. If missing, Kepos pulls the ROM from Neil over a peer asset channel.
5. Kepos verifies the completed file hash.
6. Kepos starts a guest-side local tunnel endpoint.
7. Kepos launches RetroArch as the joining peer, connecting to the local tunnel
   instead of Neil's public IP.

Normal users should not copy IP addresses, raw keys, or ROM paths between
machines.

## Game Invite Shape

The first domain object can be a signed invite:

```ts
type GameInvite = {
  type: 'kepos.game.invite.v1'
  version: 1
  createdAt: number
  expiresAt?: number
  sessionId: string
  mode: 'retroarch_netplay'
  hostProfileId: string
  guestProfileIds: string[]
  title?: string
  system?: 'nes' | 'snes' | 'arcade' | 'genesis' | 'unknown'
  coreId?: string
  romHash: string
  romSize: number
  controllerAssignments: Record<string, 1 | 2 | 3 | 4>
  sessionDiscoveryKey: string
  tunnel: {
    protocol: 'tcp'
    hostNetplayPort: number
  }
  proof: unknown
}
```

Rules:

- `proof` must verify against `hostProfileId`.
- guest profiles must be trusted by the host at invite time.
- `romHash` is the content identity.
- local filenames are not protocol identity.
- `sessionDiscoveryKey` is a session capability, not a trust grant.
- `tunnel` describes the local RetroArch netplay transport that Kepos should
  bridge over the game session P2P channel.

## Asset Transfer

ROM transfer should be treated as a private peer asset transfer, not as a ROM
distribution feature.

Minimal control messages:

```ts
type GameAssetRequest = {
  type: 'kepos.game.asset.request.v1'
  sessionId: string
  romHash: string
}

type GameAssetChunk = {
  type: 'kepos.game.asset.chunk.v1'
  sessionId: string
  romHash: string
  offset: number
  bytes: Uint8Array
}

type GameAssetComplete = {
  type: 'kepos.game.asset.complete.v1'
  sessionId: string
  romHash: string
  romSize: number
}
```

Rules:

- only accepted invited guests can request the asset
- the receiver must verify the final hash before launch
- failed hash verification deletes the local partial file
- assets should be cached by hash under app-private desktop storage
- asset transfer should use a game session channel, not room chat frames

## Kepos P2P Tunnel

The cross-region version of this feature should not require the RetroArch host
to have a public IP or manually forwarded port.

Kepos should provide a local TCP tunnel for RetroArch:

```text
Ada RetroArch
  -> 127.0.0.1:<guest-proxy-port>
  -> Ada Kepos
  -> Kepos P2P game tunnel
  -> Neil Kepos
  -> 127.0.0.1:<host-retroarch-netplay-port>
  -> Neil RetroArch
```

RetroArch still owns the netplay protocol. Kepos only forwards the byte stream
between local TCP sockets and the authenticated game session P2P channel.

This gives the feature two implementation levels:

1. `retroarch_direct`

   Kepos launches RetroArch and passes direct host/port information. This is
   useful for LAN, Tailscale, ZeroTier, manual port forwarding, or early launch
   adapter tests.

2. `retroarch_tunneled`

   Kepos launches RetroArch against a local proxy and forwards the stream over
   the Kepos P2P game tunnel. This is the target product path for ordinary
   cross-region home networks.

Tunnel rules:

- only accepted invited guests can open the tunnel
- the tunnel is bound to one signed `GameInvite`
- the tunnel opens after ROM hash verification
- the tunnel closes when the session closes, invite expires, or either profile
  revokes the other
- tunnel bytes are not room chat, treehole, or DM data
- tunnel metrics can be coarse: connected, disconnected, bytes sent, bytes
  received, last error

Open questions for implementation:

- verify the current RetroArch version still uses one direct TCP netplay
  connection for the host/client path
- verify the command-line behavior of `--host`, `--connect`, and `--port` on
  the target desktop platforms
- confirm whether password, nickname, and player assignment can be automated
- confirm whether relay/MITM mode is irrelevant when Kepos supplies the tunnel
- confirm whether RetroArch tries auxiliary sockets in direct mode that would
  need more tunnel handling

Known from public RetroArch/libretro documentation:

- RetroArch netplay protocol uses TCP because reliability and in-order delivery
  are required for correct behavior.
- the default direct netplay port is TCP `55435`.
- the CLI exposes `--host`, `--connect SERVER`, and `--port PORT`.
- `--connect` supports host strings such as `address`, `address|port`, and
  `address|port|session` in current command-line handling.

These facts make a local TCP proxy plausible, but they do not replace a live
desktop probe.

## RetroArch Launch Adapter

Kepos should isolate RetroArch integration behind a desktop adapter.

Adapter responsibilities:

- discover or configure the RetroArch executable
- validate that a selected ROM path exists locally
- validate that a cached asset path exists before launch
- choose or record the core identifier when possible
- start the local tunnel before launching the guest RetroArch process
- build host launch arguments
- build guest launch arguments
- surface errors as Kepos session state

Kepos should not depend on one fixed RetroArch install layout. The first
version can require user configuration of the RetroArch binary and asset cache.

## Android Deferral

Android is deliberately deferred because the hard part is not ROM transfer.

The likely Android problems are:

- launching external RetroArch reliably through intents
- exposing downloaded ROM files across app sandbox boundaries
- matching installed cores and their names
- passing netplay arguments consistently
- handling controller and virtual button behavior
- dealing with version differences across RetroArch Android builds

Deep libretro embedding could avoid some external-app friction, but it would
make Kepos responsible for emulator frontend work. That is not the goal.

## Architecture Boundary

The V3 game feature should keep these boundaries:

- home decides who can see and accept the invite
- signed game invite decides session intent
- asset channel moves ROM bytes
- Kepos P2P tunnel carries RetroArch netplay bytes when direct host/port is not
  enough
- RetroArch executes and synchronizes gameplay
- Kepos observes and records coarse session state
- no game message body travels through room chat
- no game data is stored in treehole or DM

This keeps the feature aligned with the existing V1 spine:

- identity signs protocol-critical records
- trust is the authorization SSOT
- keys are transport/session capabilities
- each durable product owns its own state

## Implementation Order

V3 should be staged:

1. Desktop launch prototype

   Both peers already have the ROM. Kepos creates a signed invite and launches
   RetroArch host/client with configured paths.

2. Desktop asset cache

   Kepos computes and stores ROM hash metadata and can find a local cached ROM
   by hash.

3. Desktop peer ROM transfer

   Guest pulls the ROM from the host over a game asset channel, verifies the
   hash, then launches RetroArch.

4. Direct RetroArch netplay launch

   Kepos launches RetroArch host/client using direct host/port settings. This
   proves the launch adapter, core/content choices, and player slots before the
   tunnel is required.

5. RetroArch netplay probe

   Prove on desktop that RetroArch can host on a local TCP port and that a
   client can join through `127.0.0.1:<proxy-port>` with `--connect` and
   `--port` or equivalent config. This should happen before building the full
   Kepos P2P tunnel.

6. Kepos P2P tunnel

   Kepos exposes local TCP proxies and forwards RetroArch netplay bytes over a
   game session P2P channel, so ordinary cross-region peers do not need public
   IPs or manual port forwarding.

7. Session status UI

   Home shows invited, accepted, transferring, ready, launched, and failed
   states.

8. Error hardening

   Handle missing RetroArch, missing core, launch failure, transfer failure,
   hash mismatch, tunnel failure, expired invite, revoked guest, and closed
   session.

## Success Bar

This direction is worth keeping if desktop can do this without manual network or
file exchange:

- Neil invites Ada from a trusted home.
- Neil selects a local ROM.
- Ada accepts without already having the file.
- Kepos transfers and verifies the ROM.
- Kepos starts a P2P tunnel for RetroArch netplay.
- Both desktop clients launch RetroArch against the coordinated session.
- RetroArch netplay starts with Neil and Ada assigned to controller slots.

If this works, Kepos gains a clear V3 product path: a private home can be a
trusted game lobby without Kepos owning emulator maintenance.
