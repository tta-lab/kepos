import { canEnterHome, trustProfilesBidirectional } from './trust.ts'
import type { QrPayload } from './qr-payload.ts'

type TrustState = {
  trustedProfilesByOwner: Map<string, Set<string>>
}

export type QrScanResult =
  | {
      kind: 'trust'
      profileId: string
      trust: TrustState
    }
  | {
      address: string
      canEnter: boolean
      kind: 'home'
      ownerProfileId: string
      policy: 'public' | 'trusted_only'
      roomKey: string
      trust: TrustState
    }

export function applyDecodedQrPayload({
  payload,
  scannerProfileId,
  trust
}: {
  payload: QrPayload
  scannerProfileId: string
  trust: TrustState
}): QrScanResult {
  if (payload.type === 'kepos.trust.invite.v1') {
    return {
      kind: 'trust',
      profileId: payload.profileId,
      trust: trustProfilesBidirectional(trust, scannerProfileId, payload.profileId)
    }
  }

  if (payload.type === 'kepos.home.address.v1') {
    const policy = payload.policy || 'trusted_only'

    return {
      kind: 'home',
      ownerProfileId: payload.ownerProfileId,
      address: payload.address,
      roomKey: payload.roomKey || payload.address,
      policy,
      canEnter: canEnterHome({
        ownerProfileId: payload.ownerProfileId,
        viewerProfileId: scannerProfileId,
        policy,
        trust
      }),
      trust
    }
  }

  throw new Error('Unsupported QR payload')
}
