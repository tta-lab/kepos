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
- profile-level delivery hints when available

Important distinction:

- The Profile QR is a person card.
- Delivery hints inside it are transport hints, not the product meaning of the QR.

The UI should say "Add friend" or "My QR", not "join this Home to request friendship".

Profile QR should not require a Home descriptor for friend request delivery.

## Profile Delivery Hints

Profile delivery hints describe how to reach a profile over P2P.

They can include:

- profile id
- request inbox topic or feed discovery key
- relay/bootstrap hints if the underlying P2P stack needs them
- expiry, when supported
- proof/signature

They should not include direct host:port as a production path.

The key protocol requirement:

> A friend request is routed to a profile, not to a Home.

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

Home descriptor should not be needed for adding a friend. It is for explicit Home entry after trust or activity/session invites.

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

Historical V1 gap:

- Android previously sent friend requests over the Home control channel.
- The backend cached pending outgoing requests and resent them to new Home peers.
- This improved reliability, but it was still a transport shortcut.
- Smoke showed the failure plainly: if Home peers were `online=0`, the request never reached desktop.

Current V1 direction:

- Normal request and invite delivery now goes through the profile-level request runtime.
- Home-control request and invite handling is debug fallback / legacy compatibility, not the production path.
- The remaining release bar is cross-device proof that Profile QR request and accept work while Home peer count may stay at zero.

Target direction:

- Friend requests must be routed by a dedicated profile/contact bootstrap channel, or by a small durable inbox/feed keyed by the target profile.
- Home should not be a friend request transport in the production path.
- Direct host:port should not be a production path.

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

The DM invite should use the same profile-level P2P delivery model as friend request acceptance. Its validity should be checked by signature and request linkage.

## Home Control Channel

Home control channel is useful for live session messages:

- hello / hello request
- Treehole bootstrap
- avatar media sync
- activity invites

It should not be used to establish trust.

If a control message matters after reconnect, it needs either:

- durable storage
- resend semantics
- an acknowledgement protocol

Best-effort broadcast is not enough for friend requests.

## Direct Host:Port

Direct host:port is not a production path.

It may prove that local code can move bytes, but it violates the product shape:

- users must know IP and port
- LAN and firewall assumptions leak into UX
- it does not solve cross-region P2P
- it competes with the core Kepos bet

The production bar is P2P without requiring a public IP or manual network coordinates.
