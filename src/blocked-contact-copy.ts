type BlockedContactLike = {
  requestIgnoredAt?: number | null
  revokedAt?: number | null
}

export type BlockedContactCopy = {
  blockedAt?: number
  copy: string
  isRemoved: boolean
  statusLabel: 'Ignored' | 'Removed'
}

export function getBlockedContactCopy(contact: BlockedContactLike): BlockedContactCopy {
  const isRemoved = contact.revokedAt !== undefined && contact.revokedAt !== null
  const blockedAt = isRemoved ? contact.revokedAt : contact.requestIgnoredAt

  return {
    blockedAt: blockedAt ?? undefined,
    copy: isRemoved
      ? 'Future access is stopped. Data already copied to them is not erased.'
      : 'This request is hidden. Allow requests before a new friend request.',
    isRemoved,
    statusLabel: isRemoved ? 'Removed' : 'Ignored'
  }
}
