# Protocol Model

This document separates product facts from transport mechanics.

## Identity

Each profile has a signing identity.

Signed records should include:

- type
- version
- createdAt
- signerProfileId
- payload
- signature

Any record that changes trust, starts a DM, grants Treehole write access, or advertises a Home descriptor should be signed.

## Profile QR

Profile QR is the normal user path for starting friendship.

It should carry:

- profile id
- display name snapshot
- avatar snapshot or avatar media reference when available
- signed Home descriptor when available

Important distinction:

- The Profile QR is a person card.
- The Home descriptor inside it is a transport hint, not the product meaning of the QR.

The UI should say "Add friend" or "My QR", not "join this Home to request friendship".

## Home Descriptor

A Home descriptor describes how to reach a profile's Home.

It can include:

- ownerProfileId
- address
- roomKey
- policy
- expiry, when supported
- proof/signature

Home descriptor is a capability hint plus signed ownership proof. It is not the trust relation itself.

Knowing a Home descriptor should not imply durable authorization. Authorization still comes from trust policy and signed grants.

## Friend Request

Friend request is a signed social request from one profile to another.

It should include:

- requestId
- fromProfileId
- toProfileId
- text
- sender DM encryption public key
- createdAt
- signature

The request should be durable enough that "sent" does not mean "best-effort control packet was broadcast once".

Current V1 gap:

- Android currently sends friend requests over the Home control channel.
- The backend now caches pending outgoing requests and resends them to new peers.
- This improves reliability, but it is still a transport shortcut.

Target direction:

- Friend requests should be routed by a dedicated person/contact bootstrap channel, or by a small durable inbox/feed keyed by the target profile.
- Home can remain one transport path, but not the semantic owner of friend requests.

## Trust Grant

Accepting a friend request creates trust.

V1 product rule:

- trust should be mutual after accept
- either side can revoke locally

Protocol shape:

- B accepts A's signed friend request.
- B signs an acceptance / DM invite / trust grant.
- A verifies B's acceptance.
- Both sides store each other as trusted contacts.

Trust is the authorization SSOT. Home keys, room keys, and descriptors are not the authorization SSOT.

## DM Invite

DM invite turns an accepted request into a durable pairwise thread.

It should include:

- inviteId
- requestId
- fromProfileId
- toProfileId
- channel/discovery material
- recipient encryption public key reference or encrypted payload
- signature

The DM invite can be delivered over any available transport, but its validity should be checked by signature and request linkage.

## Home Control Channel

Home control channel is useful for live session messages:

- hello / hello request
- Treehole bootstrap
- avatar media sync
- activity invites
- current V1 friend request delivery

But it should not be treated as the only way to establish trust.

If a control message matters after reconnect, it needs either:

- durable storage
- resend semantics
- an acknowledgement protocol

Best-effort broadcast is not enough for friend requests.
