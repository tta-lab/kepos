import { isHomePolicy } from './home-room.js'

export function createTrustState() {
  return {
    trustedProfilesByOwner: new Map()
  }
}

export function trustProfilesBidirectional(trust, firstProfileId, secondProfileId) {
  const nextTrust = cloneTrustState(trust)

  addTrust(nextTrust, firstProfileId, secondProfileId)
  addTrust(nextTrust, secondProfileId, firstProfileId)

  return nextTrust
}

export function isTrusted(trust, ownerProfileId, viewerProfileId) {
  const owner = cleanProfileId(ownerProfileId)
  const viewer = cleanProfileId(viewerProfileId)

  return trust?.trustedProfilesByOwner?.get(owner)?.has(viewer) || false
}

export function canEnterHome({ ownerProfileId, viewerProfileId, policy = 'trusted_only', trust }) {
  if (!isHomePolicy(policy)) {
    throw new Error('Invalid home policy')
  }

  const owner = cleanProfileId(ownerProfileId)
  const viewer = cleanProfileId(viewerProfileId)

  if (owner === viewer || policy === 'public') {
    return true
  }

  return isTrusted(trust, owner, viewer)
}

function addTrust(trust, ownerProfileId, viewerProfileId) {
  const owner = cleanProfileId(ownerProfileId)
  const viewer = cleanProfileId(viewerProfileId)
  const trusted = trust.trustedProfilesByOwner.get(owner) || new Set()

  trusted.add(viewer)
  trust.trustedProfilesByOwner.set(owner, trusted)
}

function cloneTrustState(trust = createTrustState()) {
  return {
    trustedProfilesByOwner: new Map(
      Array.from(trust.trustedProfilesByOwner || []).map(([owner, trusted]) => [
        owner,
        new Set(trusted)
      ])
    )
  }
}

function cleanProfileId(profileId) {
  const cleaned = profileId?.trim()

  if (!cleaned) {
    throw new Error('Profile id is required')
  }

  return cleaned
}
