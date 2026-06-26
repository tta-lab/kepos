const KEY_PATTERN = /^[0-9a-f]{64}$/
const SECRET_PATTERN = /^[0-9a-f]{128}$/

export type TreeholeIdentity = {
  publicKey: string
  secretKey: string
}

export type TreeholePolicy = {
  ownerProfileId: string
  revokedProfileIds?: string[]
  trustedProfileIds?: string[]
}

export type TreeholeSessionOptions = {
  bootstrapKey: string | null
  identity?: TreeholeIdentity
  mode: 'prototype' | 'signed'
  nick: string
  profileId: string | null
  storage?: unknown
  treeholeOwnerProfileId?: string
  treeholePolicy?: Required<TreeholePolicy>
}

export function createTreeholeSessionOptions({
  bootstrapKey = null,
  identity = null,
  nick = 'anon',
  ownerProfileId = null,
  profileId = null,
  storage,
  treeholePolicy = null
}: {
  bootstrapKey?: string | null
  identity?: TreeholeIdentity | null
  nick?: string
  ownerProfileId?: string | null
  profileId?: string | null
  storage?: unknown
  treeholePolicy?: Partial<TreeholePolicy> | null
} = {}): TreeholeSessionOptions {
  const baseOptions: TreeholeSessionOptions = {
    bootstrapKey,
    mode: 'prototype',
    nick,
    profileId,
    storage
  }

  if (!isTreeholeIdentity(identity) || !isTreeholeProfileKey(ownerProfileId)) {
    return baseOptions
  }

  return {
    ...baseOptions,
    identity,
    mode: 'signed',
    treeholeOwnerProfileId: ownerProfileId,
    treeholePolicy: createSignedTreeholePolicy({ ownerProfileId, treeholePolicy })
  }
}

export function createSignedTreeholePolicy({
  ownerProfileId,
  treeholePolicy
}: {
  ownerProfileId: string
  treeholePolicy?: Partial<TreeholePolicy> | null
}): Required<TreeholePolicy> {
  return {
    ownerProfileId,
    revokedProfileIds: treeholePolicy?.revokedProfileIds || [],
    trustedProfileIds: treeholePolicy?.trustedProfileIds || []
  }
}

export function canGrantTreeholeWriter({
  ownerProfileId,
  policy,
  writerProfileId
}: {
  ownerProfileId?: string | null
  policy?: Partial<TreeholePolicy> | null
  writerProfileId?: string | null
}): boolean {
  if (!isTreeholeProfileKey(ownerProfileId) || !isTreeholeProfileKey(writerProfileId)) {
    return false
  }

  if (writerProfileId === ownerProfileId) {
    return !new Set(policy?.revokedProfileIds || []).has(writerProfileId)
  }

  const revoked = new Set(policy?.revokedProfileIds || [])
  if (revoked.has(writerProfileId)) {
    return false
  }

  return new Set(policy?.trustedProfileIds || []).has(writerProfileId)
}

export function canShareTreeholeBootstrap({
  localProfileId,
  ownerProfileId,
  policy,
  remoteProfileId
}: {
  localProfileId?: string | null
  ownerProfileId?: string | null
  policy?: Partial<TreeholePolicy> | null
  remoteProfileId?: string | null
}): boolean {
  if (!isTreeholeProfileKey(localProfileId) || localProfileId !== ownerProfileId) {
    return false
  }

  return canGrantTreeholeWriter({
    ownerProfileId,
    policy,
    writerProfileId: remoteProfileId
  })
}

export function isTreeholeIdentity(identity: unknown): identity is TreeholeIdentity {
  if (!identity || typeof identity !== 'object') {
    return false
  }

  const value = identity as Record<string, unknown>

  return (
    isTreeholeProfileKey(value.publicKey) &&
    typeof value.secretKey === 'string' &&
    SECRET_PATTERN.test(value.secretKey)
  )
}

export function isTreeholeProfileKey(value: unknown): value is string {
  return typeof value === 'string' && KEY_PATTERN.test(value)
}
