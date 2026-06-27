# V2 Roadmap

This document records the V2 product direction after V1.

V2 should make the home feel alive. It should add presence, richer identity, and
live rooms without turning Kepos into a meeting platform or a public streaming
platform.

## Shape

```text
V2A: home/profile/presence/richer chat
V2B: listening room, audio-only live room
V2C: watch room, one-to-one A/V live room
```

V2 is not one large feature. It is a sequence of increasingly rich live-room
experiences.

## V2A: Presence And Richer Home

V2A should polish the social surface:

- profile card
- avatar
- contact detail
- better room presence
- better message UI
- room state that shows who is around
- small multimodal additions only when they support the core loop

The purpose is to make V1 feel like a place, not only protocol plumbing.

## V2B: Listening Room

V2B is an audio-only live room:

```text
one host live audio stream -> trusted listeners
```

All audio sources use the same stream model:

```text
audio source -> PCM frames -> Opus encoder -> Kepos P2P stream -> listener playback
```

Supported first source adapters:

- local file decoded into PCM
- local PCM socket fed by an external producer

The socket source keeps capture helpers outside Kepos core. A future macOS
system-audio helper can push PCM into the socket.

V2B is not a synchronized music-file player. It does not require peers to own
the file or match hashes.

## V2C: Watch Room

V2C is a one-to-one A/V live room:

```text
one host live audio/video stream -> one trusted viewer
```

The first preferred input path is OBS-compatible local ingest:

```text
OBS -> localhost ingest -> Kepos -> P2P media stream -> viewer playback
```

This lets OBS handle capture, scene composition, system audio, mic choice, and
encoding. Kepos handles trust, invite, P2P delivery, and room lifecycle.

V2C is not a meeting product. The first version does not include cameras,
viewer microphones, multi-viewer conferencing, recording, or SFU.

## Why This Order

V2A improves the room surface.

V2B proves live audio:

- source adapter
- host-owned stream
- Opus
- jitter buffer
- trusted join

V2C extends the live-room idea to video while reusing existing local tools such
as OBS instead of making Kepos own all capture and mixing logic.

The user-facing path is:

```text
V1: private home works
V2A: the home feels inhabited
V2B: friends can listen together
V2C: one friend can watch with me
```

## Boundaries

V2 should not:

- expand into public rooms
- add public discovery
- add usernames
- become a video meeting clone
- build a general streaming platform
- add V3 local service tunnel work before V1/V2 live rooms are proven

The rule is:

```text
one trusted home, one host, small live session, clear stop button
```
