import { isAvatarMediaReference, type AvatarMediaReference } from './avatar-media.ts'

const PROFILE_SNAPSHOT_VERSION = 1
const DEFAULT_MAX_PROFILE_SNAPSHOTS = 8

export type ProfileSnapshot = {
  avatarMediaSnapshot?: AvatarMediaReference
  avatarUriSnapshot?: string
  capturedAt: number
  displayNameSnapshot?: string
  profileId: string
  source?: string
  version: typeof PROFILE_SNAPSHOT_VERSION
}

export function createProfileSnapshot({
  avatarMediaSnapshot = null,
  avatarUriSnapshot = null,
  capturedAt,
  displayNameSnapshot = null,
  profileId,
  source = null
}: {
  avatarMediaSnapshot?: AvatarMediaReference | null
  avatarUriSnapshot?: string | null
  capturedAt: number
  displayNameSnapshot?: string | null
  profileId: string
  source?: string | null
}): ProfileSnapshot {
  const cleanDisplayName = cleanOptionalString(displayNameSnapshot)
  const cleanAvatarUri = cleanOptionalString(avatarUriSnapshot)
  const cleanAvatarMedia = cleanOptionalAvatarMediaSnapshot(avatarMediaSnapshot)

  if (!cleanDisplayName && !cleanAvatarUri && !cleanAvatarMedia) {
    throw new Error('Profile snapshot display data is required')
  }

  return dropEmpty({
    avatarMediaSnapshot: cleanAvatarMedia,
    avatarUriSnapshot: cleanAvatarUri,
    capturedAt: cleanTimestamp(capturedAt),
    displayNameSnapshot: cleanDisplayName,
    profileId: cleanRequiredString(profileId, 'Profile id is required'),
    source: cleanOptionalString(source),
    version: PROFILE_SNAPSHOT_VERSION
  }) as ProfileSnapshot
}

export function mergeProfileSnapshots(
  snapshots: readonly unknown[] = [],
  snapshot: ProfileSnapshot | null | undefined,
  { maxSnapshots = DEFAULT_MAX_PROFILE_SNAPSHOTS }: { maxSnapshots?: number } = {}
): ProfileSnapshot[] {
  const cleanSnapshot = snapshot ? cleanProfileSnapshot(snapshot) : null
  const existing = cleanExistingProfileSnapshots(snapshots)
  const merged = cleanSnapshot
    ? [cleanSnapshot, ...existing.filter((entry) => !sameDisplaySnapshot(entry, cleanSnapshot))]
    : existing

  return merged
    .sort((left, right) => right.capturedAt - left.capturedAt)
    .slice(0, cleanMaxSnapshots(maxSnapshots))
}

export function getLatestProfileSnapshot(
  snapshots: readonly unknown[] = []
): ProfileSnapshot | null {
  return mergeProfileSnapshots(snapshots, null)[0] || null
}

export function cleanProfileSnapshots(
  snapshots: readonly unknown[] | undefined
): ProfileSnapshot[] {
  return mergeProfileSnapshots(snapshots || [], null)
}

function cleanExistingProfileSnapshots(snapshots: readonly unknown[]): ProfileSnapshot[] {
  const cleaned: ProfileSnapshot[] = []

  for (const snapshot of snapshots) {
    try {
      cleaned.push(cleanProfileSnapshot(snapshot))
    } catch {
      // Stored profile snapshots are optional display history; trust fields stay strict elsewhere.
    }
  }

  return cleaned
}

function cleanProfileSnapshot(value: unknown): ProfileSnapshot {
  const record = asRecord(value)

  if (record.version !== PROFILE_SNAPSHOT_VERSION) {
    throw new Error('Unsupported profile snapshot version')
  }

  return createProfileSnapshot({
    avatarMediaSnapshot: cleanOptionalAvatarMediaSnapshot(record.avatarMediaSnapshot),
    avatarUriSnapshot: cleanOptionalString(record.avatarUriSnapshot),
    capturedAt: cleanTimestamp(record.capturedAt),
    displayNameSnapshot: cleanOptionalString(record.displayNameSnapshot),
    profileId: cleanRequiredString(record.profileId, 'Profile id is required'),
    source: cleanOptionalString(record.source)
  })
}

function sameDisplaySnapshot(left: ProfileSnapshot, right: ProfileSnapshot): boolean {
  return (
    left.profileId === right.profileId &&
    (left.displayNameSnapshot || '') === (right.displayNameSnapshot || '') &&
    (left.avatarUriSnapshot || '') === (right.avatarUriSnapshot || '') &&
    (left.avatarMediaSnapshot?.digest || '') === (right.avatarMediaSnapshot?.digest || '')
  )
}

function cleanOptionalAvatarMediaSnapshot(value: unknown): AvatarMediaReference | undefined {
  if (value === undefined || value === null) return undefined
  if (!isAvatarMediaReference(value)) throw new Error('Invalid avatar media reference')
  return value
}

function cleanRequiredString(value: unknown, message: string): string {
  const cleaned = cleanOptionalString(value)
  if (!cleaned) throw new Error(message)
  return cleaned
}

function cleanOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  return value.trim() || undefined
}

function cleanTimestamp(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new Error('Invalid profile snapshot timestamp')
  }

  return value
}

function cleanMaxSnapshots(value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0) return DEFAULT_MAX_PROFILE_SNAPSHOTS
  return value
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') throw new Error('Invalid profile snapshot')
  return value as Record<string, unknown>
}

function dropEmpty<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== null)
  ) as Partial<T>
}
