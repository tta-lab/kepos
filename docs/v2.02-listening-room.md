# V2 Listening Room

This document records the V2B direction for Kepos listening rooms.

The decision is deliberately narrow: the first listening room is a live audio
stream. It does not try to be a synchronized music-file player.

## Decision

Kepos V2B should model a listening room as one host live audio stream.

All input sources feed the same stream pipeline:

```text
audio source -> PCM frames -> Opus encoder -> Kepos P2P stream -> peer playback
```

The source can be a local file, a socket producer, or a future macOS system
audio capture helper. Kepos should not expose separate product modes for these
sources in the first version.

## Why

The product sentence should stay simple:

```text
The host plays sound; people in the room hear it.
```

This avoids adding a second playback model with file hash matching, asset cache,
seek synchronization, and local-player drift correction. Those may be useful
later, but they are not needed to prove the room.

The stream model also decouples Kepos from platform audio capture. A macOS
helper can push PCM into Kepos without making Kepos own macOS system-audio
recording from day one.

## Scope

In scope:

- one host audio stream per listening room
- trusted room participants can listen
- local file source decoded into PCM by the host
- local socket source that accepts PCM from an external producer
- fixed first-version stream format
- Opus encoding before P2P transport
- peer playback with a small jitter buffer
- room state: idle, buffering, playing, stopped, failed

Out of scope:

- synchronized local file playback
- music file hash cache
- peer-side local-file matching
- multi-host mixing
- playlist sync
- lyrics
- recording
- public broadcasting
- cloud audio storage
- platform-native macOS system audio capture inside the main Kepos app

## Source Model

V2B supports two source adapters behind the same room model.

### Local File Source

The host selects a local audio file.

Kepos decodes that file into PCM frames and sends the stream to listeners. The
peer does not need the file and does not play it locally from storage.

Rules:

- host owns playback position
- host pause/resume affects the stream
- seek is a host action that changes the stream
- listeners receive audio frames, not a file asset

### PCM Socket Source

An external process connects to a local Kepos socket and pushes PCM frames.

This is the bridge for:

- macOS system audio capture helper
- microphone helper
- browser tab capture helper
- ffmpeg pipe
- future player integrations

The socket input keeps platform capture code outside Kepos core.

First-version input format:

```text
sampleRate: 48000
channels: 2
format: s16le
frameDurationMs: 20
```

If a producer cannot provide this format, the first version may reject it rather
than resample inside Kepos.

## Session Shape

```ts
type ListeningRoomSession = {
  type: 'kepos.listening-room.session.v1'
  version: 1
  sessionId: string
  homeOwnerProfileId: string
  hostProfileId: string
  sourceType: 'local_file' | 'pcm_socket'
  codec: 'opus'
  sampleRate: 48000
  channels: 2
  frameDurationMs: 20
  state: 'idle' | 'buffering' | 'playing' | 'stopped' | 'failed'
  createdAt: number
  startedAt?: number
  stoppedAt?: number
}
```

Session records that affect room state should be signed by the host profile.

## Stream Frames

Control frames:

```ts
type ListeningRoomControl =
  | {
      type: 'kepos.audio.start.v1'
      sessionId: string
      createdAt: number
      metadata?: {
        title?: string
        artist?: string
        sourceLabel?: string
      }
    }
  | {
      type: 'kepos.audio.stop.v1'
      sessionId: string
      createdAt: number
      reason?: string
    }
```

Audio frames:

```ts
type ListeningRoomAudioFrame = {
  type: 'kepos.audio.frame.v1'
  sessionId: string
  sequence: number
  timestampMs: number
  codec: 'opus'
  durationMs: 20
  bytes: Uint8Array
}
```

Rules:

- audio frames travel over a listening-room stream channel, not room chat
- room chat may show state changes, but does not carry audio payloads
- listeners discard frames for unknown or stopped sessions
- sequence gaps are handled by the jitter buffer, not by reliable replay in the
  first version

## Transport

The listening room should use a dedicated P2P stream channel under the home.

The home room remains the social entry point:

- show that the host is playing audio
- show listener count
- allow trusted participants to join
- show coarse errors

The audio stream itself should be separate from room chat, treehole, and DM.

## Architecture Boundary

Kepos owns:

- room session state
- source adapter abstraction
- PCM socket input protocol
- file-to-PCM source adapter
- Opus encoding
- P2P audio stream transport
- listener jitter buffer
- playback output

Kepos does not own in V2B:

- macOS system audio capture inside the main app
- virtual audio devices
- multi-source mixing
- synchronized local music library playback
- file distribution for music

## Implementation Order

1. Listening room domain model

   Add session shape, state transitions, and signed host control records.

2. Local file source to local playback

   Decode a selected local file to PCM and play it through the same internal
   pipeline without networking.

3. PCM socket source to local playback

   Accept fixed-format PCM over a local socket and play it through the same
   pipeline.

4. Opus stream transport

   Encode PCM to Opus, send frames over a dedicated P2P stream channel, and
   play them on a listener with a jitter buffer.

5. Home UI

   Show the listening room state, host, source label, listener count, and join
   or leave controls.

6. External macOS helper

   Build or integrate a helper that captures Mac system audio and pushes PCM to
   the local Kepos socket.

## Success Bar

V2B is useful when:

- Neil opens a listening room in his home.
- Neil starts audio from a local file or PCM socket.
- Ada joins as a trusted listener.
- Ada hears the same live stream without owning the file.
- room chat still works.
- stopping the stream closes playback cleanly.

The first version does not need playlists, local file matching, or recording.
