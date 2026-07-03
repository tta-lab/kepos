# Research: RetroArch Netplay Tunnel Feasibility

## Question

Can Kepos make RetroArch netplay work across ordinary cross-region home
networks without requiring the RetroArch host to expose a public IP or manually
forward a port?

## Short Answer

Likely yes, if Kepos provides a local TCP proxy and forwards that TCP byte stream
over a Kepos P2P game tunnel.

This still needs a live desktop probe before implementation.

## Verified Findings

- RetroArch netplay uses TCP. Libretro's netplay documentation says the protocol
  uses TCP because reliability and in-order delivery are required for correct
  behavior.
- RetroArch direct netplay defaults to TCP port `55435`.
- RetroArch CLI exposes:
  - `--host`
  - `--connect SERVER`
  - `--port PORT`
- Current `--connect` handling supports host strings such as:
  - `address`
  - `address|port`
  - `address|port|session`
- RetroArch already has a relay/MITM path for users who cannot forward ports,
  which supports the general idea that netplay can be tunneled at the TCP
  connection layer.

## Kepos Tunnel Shape

Target path:

```text
Ada RetroArch
  -> 127.0.0.1:<guest-proxy-port>
  -> Ada Kepos
  -> Kepos P2P game tunnel
  -> Neil Kepos
  -> 127.0.0.1:<host-retroarch-netplay-port>
  -> Neil RetroArch
```

RetroArch still owns:

- emulator execution
- netplay protocol
- frame input exchange
- rollback/replay
- controller slot behavior

Kepos owns:

- trusted game invite
- ROM peer transfer and hash verification
- local TCP proxy
- P2P tunnel
- session lifecycle and errors

## Why This Is Plausible

If RetroArch direct netplay is one TCP connection, Kepos does not need to
understand RetroArch protocol frames. It only needs to forward bytes in both
directions.

This is application-level port forwarding, closer to SSH local forwarding than
to a full VPN.

## What This Is Not

This is not Tailscale.

Kepos would not expose a virtual network interface, route arbitrary IP packets,
manage DNS, or expose the host machine's network. The tunnel is scoped to one
signed game session and one local RetroArch netplay connection.

This is also not deep libretro embedding. RetroArch remains an external runtime.

## Risks

- RetroArch direct netplay may rely on more than one socket in some modes.
- CLI automation may differ across desktop platforms or RetroArch versions.
- Password, nickname, and controller assignment may require config-file writes
  rather than pure CLI flags.
- TCP-over-P2P reliable stream may add latency or head-of-line blocking.
- Kepos P2P NAT traversal may still fail on strict networks; a relay fallback
  may eventually be needed.
- RetroArch relay/MITM mode may have command-line quirks; Kepos should avoid
  depending on it for the first tunneled path.

## Required Probe

Before building the full Kepos tunnel:

1. Launch RetroArch host locally with a known ROM/core and explicit netplay port.
2. Launch RetroArch client locally using `--connect 127.0.0.1|<port>` or the
   current equivalent.
3. Insert a minimal localhost TCP proxy between client and host.
4. Confirm the client can join through the proxy.
5. Confirm host and guest get player 1/player 2 behavior.
6. Repeat on two desktop machines over a simple TCP forward before adding Kepos
   P2P transport.

Success means:

- direct mode only needs a proxyable TCP connection for the target path
- RetroArch CLI/config automation is good enough for a V3 adapter
- Kepos can proceed to wrap the proxy in a P2P game tunnel

## Recommendation

Keep the V3 architecture as:

```text
Kepos = trusted lobby + ROM sync + RetroArch launcher + P2P TCP tunnel
RetroArch = emulator + netplay protocol
```

Do not implement a full game VPN, embedded libretro frontend, or custom netplay
engine for V3.

## Sources

- Libretro Netplay documentation: RetroArch netplay protocol and TCP behavior.
- Libretro Netplay FAQ: default TCP `55435`, host port-forwarding, relay option.
- RetroArch command-line manual: `--host`, `--connect`, `--port`.
- RetroArch netplay source/documentation references: netplay handshake,
  TCP socket initialization, and relay/MITM notes.
