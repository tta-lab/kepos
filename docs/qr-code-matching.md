# Kepos QR Code Matching

This document describes how QR code matching should work for Kepos profiles, homes, trust, and message requests.

## Goals

QR should hide raw 32-byte or 64-character technical keys from normal users.

The user-level actions are:

- scan a person to trust them
- scan a home to visit or request access
- scan a message request to start controlled contact

The system-level payloads still carry public keys, home addresses, and capabilities.

## Envelope

V1 QR should use a URI envelope with an encoded JSON payload.

Examples:

```text
kepos://profile?v=1&payload=<encoded-json>
kepos://home?v=1&payload=<encoded-json>
kepos://message-request?v=1&payload=<encoded-json>
```

The URI identifies the route. The payload carries the structured data.

This gives us:

- app-level routing
- paste/share support
- readable debug shape
- versioning
- room to replace JSON with compact encoding later

V1 should not use raw JSON as the normal QR format. Raw JSON can remain useful in tests.

## QR Types

Kepos should support separate QR payload types.

### Trust Invite

Used when two people intentionally exchange trust.

```js
{
  type: 'kepos.trust.invite.v1',
  profileId,
  displayName,
  identityPublicKey,
  devicePublicKey?,
  proof,
  expiresAt?
}
```

Behavior:

- scanner verifies payload shape
- scanner stores or confirms a local alias for the scanned profile
- scanner adds trust toward the scanned profile
- if the flow is mutual scan, both sides trust each other
- trusted users can enter each other's trusted-only home
- trusted users can create a real DM channel

In early versions, `profileId` and `identityPublicKey` can be the same value.

### Home Address

Used to share a home without necessarily creating trust.

```js
{
  type: ('kepos.home.address.v1', ownerProfileId, address, roomKey, policy, createdAt, proof)
}
```

Behavior:

- `public` home can be entered by anyone with the payload
- `trusted_only` home requires trust toward the scanner
- scanning a home address does not create trust
- home payload must be signed by `ownerProfileId`

Current prototype may use `address === roomKey`. Longer term, `address` can become a user-safe encoded capability while `roomKey` stays internal.

### Message Request

Used when sender is not trusted.

```js
{
  type: ('kepos.message.request.v1', fromProfileId, toProfileId, requestId, text, createdAt, proof)
}
```

Behavior:

- only one pending request is allowed from an untrusted sender to a recipient
- request handling should create or confirm a local alias before accepting/replying
- recipient can accept, reply, or ignore
- accept/reply opens a pairwise DM channel
- ignore leaves sender unable to send more requests unless recipient clears state
- pending request grants no home, treehole, DM, or presence access

This is the WeChat-like rule: one request message, not a full DM stream.

## Matching Flows

### Flow 1: Mutual Trust By Scan

1. A opens profile QR.
2. B scans A.
3. B stores A's identity public key.
4. B confirms or edits A's local alias.
5. B creates trust grant for A.
6. A scans B or accepts B's trust response.
7. A stores B's identity public key.
8. A confirms or edits B's local alias.
9. A creates trust grant for B.
10. Both sides can enter each other's trusted-only homes.
11. Both sides can establish pairwise DM channels.

This is the default friend/trust flow.

### Flow 2: Home Visit By QR

1. A opens home QR.
2. B scans A's home QR.
3. Client decodes `ownerProfileId`, `address`, `roomKey`, `policy`.
4. If policy is `public`, B can join.
5. If policy is `trusted_only`, B can join only if A trusts B.
6. No trust is created by scanning this QR.

This is useful for public rooms, demos, and temporary sharing.

### Flow 3: Untrusted Message Request

1. B scans A's profile or home.
2. B is not trusted by A.
3. B can send one message request to A.
4. A sees request inbox item.
5. The request does not reveal A's presence, home, or treehole state.
6. If A replies or accepts, A confirms or edits B's local alias.
7. A and B create a pairwise DM channel.
8. If A ignores, B cannot continue sending normal DMs.

This prevents untrusted DM spam while still allowing discovery.

## Pairwise DM Channel Setup

DM should not be sent over the home room swarm.

Target flow:

1. A and B have trust or accepted request.
2. One side creates a DM channel invite.
3. Invite includes a DM discovery key or encrypted setup payload.
4. Other side accepts and joins the pairwise DM swarm.
5. DM messages travel only on the A-B channel.

The home swarm may carry a channel setup signal, but it should not carry DM message contents.

## QR UX

Normal UI should show:

- My Profile QR
- My Home QR
- Scan QR
- Request Message
- contact alias prompt when trusting or accepting a request

Normal UI should not show:

- raw room key
- treehole Autobase key
- writer key
- DM channel key

Manual key entry can remain in a debug or advanced section.

## Validation Rules

All QR payloads should validate:

- known `type`
- required public keys are present
- keys are correctly encoded
- timestamps and expiries are sane
- signatures verify for signed V1 payloads
- payload is small enough for QR scanning

Invalid QR payloads should fail closed.

## Implementation Plan

1. Keep existing JSON QR payload model for tests. Done for prototype compatibility.
2. Add signed payload support after identity signing lands. Done for profile, home, and message-request URI payloads.
3. Add profile QR screen. First pass done as signed profile URI display on desktop and Android.
4. Add home QR screen. First pass done as signed home URI display on desktop and Android.
5. Add scan screen. Android supports camera scan plus paste/import. Desktop supports paste/import; desktop camera scan is deferred.
6. Add trust creation from profile QR. Done for signed profile URI import into persisted ContactBook.
7. Add home join from home QR. Done for signed home URI import with local public/trusted-only checks.
8. Add signed optional `expiresAt` handling. Done for profile and home QR payloads; stale QR fails before trust or join.
9. Add message request payload and request inbox. Done for signed message request records and `kepos://message-request` QR routing.
10. Add pairwise DM channel setup after trust or accepted request. Done with signed/encrypted DM invites and dedicated DM replication channels.
11. Move manual key input into debug/advanced UI. Done on desktop and Android.

## V1 Decisions

- Identity verification UI: V1 shows local alias plus shortened profile id/fingerprint. There is no SAS phrase, safety-number compare flow, username registry, or device-linking trust ceremony in V1.
- Manual-key migration: V1 keeps manual 64-character home key entry in Advanced/debug UI. Normal product flow is signed profile/home/message-request QR. Existing manual keys remain a debug/support fallback and do not create trust.
