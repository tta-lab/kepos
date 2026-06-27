# V2 Watch Room

This document records the V2C direction for Kepos watch rooms.

The decision is deliberately narrow: the first watch room is a one-to-one live
audio/video share inside a trusted home. It is not a meeting product.

The preferred first input path is OBS-compatible local ingest. OBS handles
capture, scene composition, audio mixing, and encoding. Kepos handles trust,
session state, P2P delivery, and playback.

## Decision

Kepos V2C should model a watch room as:

```text
one host live A/V stream -> one trusted viewer
```

The first version supports:

- 1 host
- 1 viewer
- desktop first
- OBS-compatible local ingest
- host audio/video stream
- room chat remains available

The first version does not support:

- multiple viewers
- cameras
- viewer microphone
- microphone mixing
- recording
- SFU
- public links
- meeting controls

## Why

The product goal is closer to:

```text
I am watching something; one trusted friend can watch with me.
```

It is not:

```text
Replace Zoom or Tencent Meeting.
```

This keeps the feature aligned with Kepos home:

- explicit trusted relationship
- private room
- no platform meeting room
- no public broadcast
- no extra account graph

It also keeps the first technical surface small. One outgoing media stream is
much easier to reason about than multi-viewer conferencing.

Using OBS-compatible local ingest keeps Kepos from owning all screen capture and
audio mixing work in the first version. OBS already knows how to capture
windows, screens, system audio, microphone input, scenes, and overlays. Kepos can
focus on trusted delivery.

## Relationship To V2 Listening Room

V2B listening room is:

```text
one host live audio stream
```

V2C watch room is:

```text
one host live audio + video stream
```

The two features should share ideas where possible:

- session state
- host-owned stream lifecycle
- trusted join
- dedicated media stream channel
- room chat separate from media payloads
- no recording by default

But watch room adds screen/window capture and video encoding.

## Scope

In scope:

- desktop host
- desktop viewer
- trusted viewer only
- one active viewer per watch room
- local media ingest from OBS or an OBS-compatible producer
- encoded audio/video stream
- viewer playback
- room chat alongside the stream
- explicit stop/close

Out of scope:

- mobile host
- mobile viewer
- more than one viewer
- viewer video
- viewer microphone
- multi-party voice
- recording or replay
- public invite links
- meeting lobby
- screen annotation
- remote control
- file transfer

## Session Shape

```ts
type WatchRoomSession = {
  type: 'kepos.watch-room.session.v1'
  version: 1
  sessionId: string
  homeOwnerProfileId: string
  hostProfileId: string
  viewerProfileId: string
  sourceType: 'local_ingest'
  video: {
    codec: 'h264' | 'vp8' | 'vp9' | 'av1'
    maxWidth: number
    maxHeight: number
    maxFps: number
  }
  audio: {
    codec: 'opus'
    sampleRate: 48000
    channels: 2
  }
  state: 'invited' | 'connecting' | 'playing' | 'stopped' | 'failed'
  createdAt: number
  startedAt?: number
  stoppedAt?: number
}
```

Session records that affect state should be signed by the host profile.

## Media Path

Target path:

```text
OBS or compatible producer
  -> localhost ingest
  -> Kepos media packetizer
  -> Kepos P2P media stream
  -> viewer decoder/playback
```

The first implementation should prefer forwarding already encoded A/V from the
ingest path. Kepos should avoid decoding and re-encoding unless a later
implementation proves it is needed.

The room chat remains separate:

```text
room chat frames != media frames
```

## Product Rules

- only a trusted contact can be invited as viewer
- only one viewer can join in v1
- host owns start and stop
- host leaving closes the watch room
- viewer leaving closes or returns the room to stopped state
- no recording UI in v1
- no public share link in v1
- media is live and ephemeral

## Technical Questions

Before implementation, investigate:

- best local ingest protocol for OBS-compatible input: RTMP, SRT, or WHIP
- whether Kepos can forward encoded A/V without transcoding
- whether WebRTC should be used for viewer playback or whether Kepos should send
  encoded frames over its own P2P channel
- codec availability across target desktop platforms
- minimum viable bitrate and latency for 720p / 30fps
- how to surface ingest connection, stream start, and stream failure states
  cleanly

The first implementation should not depend on solving multi-viewer bandwidth or
SFU design.

## Implementation Order

1. Session model

   Add the watch room session state and signed host control records.

2. Local ingest probe

   Accept one OBS-compatible localhost stream and play it locally.

3. One-viewer media stream

   Forward the ingested encoded A/V stream to one trusted viewer over a
   dedicated media stream channel.

4. Home UI

   Show invite, connecting, playing, stopped, and failed states in the home.

5. Hardening

   Handle ingest not connected, ingest ended, viewer disconnect, host stop,
   network failure, and revoke.

## Success Bar

V2C is useful when:

- Neil invites Ada to watch from a trusted home.
- Neil starts OBS or an OBS-compatible local producer.
- Ada sees the live video.
- Ada hears the live audio.
- room chat still works.
- Neil stops sharing and the stream closes cleanly.

The first version succeeds without meetings, cameras, microphones, recording, or
more than one viewer.
