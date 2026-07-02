import type { SignedHomeAddressPayload } from './signed-qr-payload.ts'
import { verifySignedHomeAddressPayload } from './signed-qr-payload.ts'

export const PROFILE_HOME_DESCRIPTOR = 'kepos.profile.home-descriptor.v1'

export type ProfileHomeDescriptorFrame = {
  descriptor: SignedHomeAddressPayload
  descriptorId: string
  fromProfileId: string
  toProfileId: string
  type: typeof PROFILE_HOME_DESCRIPTOR
}

export function createProfileHomeDescriptorFrame({
  descriptor,
  descriptorId = '',
  toProfileId
}: {
  descriptor: SignedHomeAddressPayload
  descriptorId?: string
  toProfileId: string
}): ProfileHomeDescriptorFrame {
  if (!verifySignedHomeAddressPayload(descriptor)) {
    throw new Error('Signed Home descriptor is required')
  }

  const fromProfileId = cleanHexProfileId(
    descriptor.ownerProfileId,
    'Home owner profile id is required'
  )
  const cleanToProfileId = cleanHexProfileId(toProfileId, 'Target profile id is required')
  const cleanDescriptorId =
    descriptorId.trim() ||
    `${fromProfileId}:${descriptor.createdAt}:${descriptor.address}:${descriptor.roomKey}`

  if (!cleanDescriptorId) {
    throw new Error('Home descriptor id is required')
  }

  return {
    descriptor,
    descriptorId: cleanDescriptorId,
    fromProfileId,
    toProfileId: cleanToProfileId,
    type: PROFILE_HOME_DESCRIPTOR
  }
}

export function verifyProfileHomeDescriptorFrame(
  frame: unknown,
  { now = Date.now() }: { now?: number } = {}
): frame is ProfileHomeDescriptorFrame {
  if (!isRecord(frame)) return false
  if (frame.type !== PROFILE_HOME_DESCRIPTOR) return false
  if (typeof frame.descriptorId !== 'string' || !frame.descriptorId.trim()) return false
  if (typeof frame.fromProfileId !== 'string' || typeof frame.toProfileId !== 'string') {
    return false
  }

  try {
    const fromProfileId = cleanHexProfileId(frame.fromProfileId, 'Sender profile id is required')
    cleanHexProfileId(frame.toProfileId, 'Target profile id is required')

    if (!verifySignedHomeAddressPayload(frame.descriptor, { now })) {
      return false
    }

    return frame.descriptor.ownerProfileId === fromProfileId
  } catch {
    return false
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function cleanProfileId(value: unknown, message: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(message)
  }

  return value.trim()
}

function cleanHexProfileId(value: unknown, message: string): string {
  const profileId = cleanProfileId(value, message).toLowerCase()

  if (!/^[0-9a-f]{64}$/.test(profileId)) {
    throw new Error(message)
  }

  return profileId
}
