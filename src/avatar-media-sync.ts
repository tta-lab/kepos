import type { AvatarMediaReference } from './avatar-media.ts'
import { isAvatarMediaReference } from './avatar-media.ts'
import { avatarMediaBase64, storeVerifiedAvatarMediaBytes } from './avatar-media-storage.ts'
import type { ContactBook } from './contact-book.ts'

const AVATAR_MEDIA_BYTES_CONTROL_TYPE = 'kepos.avatar.media.bytes.v1'

type WriteBytes = (path: string, bytes: Uint8Array) => Promise<unknown> | unknown
type Sha256Hex = (bytes: Uint8Array) => Promise<string> | string

export type AvatarMediaBytesControl = {
  bytesBase64: string
  profileId: string
  reference: AvatarMediaReference
  type: typeof AVATAR_MEDIA_BYTES_CONTROL_TYPE
}

export type AvatarMediaBytesStoreResult = {
  kind: 'avatar_media_stored'
  profileId: string
  storageUri: string
}

export function createAvatarMediaBytesControl({
  bytes,
  profileId,
  reference
}: {
  bytes: Uint8Array
  profileId: string
  reference: AvatarMediaReference
}): AvatarMediaBytesControl {
  const cleanProfileId = cleanString(profileId)
  if (!cleanProfileId) throw new Error('Avatar media profile id is required')

  return {
    bytesBase64: avatarMediaBase64.encode(bytes),
    profileId: cleanProfileId,
    reference,
    type: AVATAR_MEDIA_BYTES_CONTROL_TYPE
  }
}

export async function storeAvatarMediaBytesControl({
  baseUri,
  book,
  message,
  sha256Hex,
  writeBytes
}: {
  baseUri?: string | null
  book?: ContactBook | null
  message?: unknown
  sha256Hex: Sha256Hex
  writeBytes: WriteBytes
}): Promise<AvatarMediaBytesStoreResult | null> {
  const control = readAvatarMediaBytesControl(message)
  if (!control) return null
  if (!baseUri) throw new Error('Avatar media storage is unavailable')

  const expectedReference = findKnownAvatarMediaReference(book, control.profileId)
  if (!expectedReference || expectedReference.digest !== control.reference.digest) {
    return null
  }

  const bytes = avatarMediaBase64.decode(control.bytesBase64)
  const storageUri = await storeVerifiedAvatarMediaBytes({
    baseUri,
    bytes,
    reference: control.reference,
    sha256Hex,
    writeBytes
  })

  return {
    kind: 'avatar_media_stored',
    profileId: control.profileId,
    storageUri
  }
}

export function readAvatarMediaBytesControl(value: unknown): AvatarMediaBytesControl | null {
  if (!value || typeof value !== 'object') return null

  const record = value as Record<string, unknown>
  if (record.type !== AVATAR_MEDIA_BYTES_CONTROL_TYPE) return null
  if (!isAvatarMediaReference(record.reference)) return null

  const profileId = cleanString(record.profileId)
  const bytesBase64 = cleanString(record.bytesBase64)
  if (!profileId || !bytesBase64) return null

  return {
    bytesBase64,
    profileId,
    reference: record.reference,
    type: AVATAR_MEDIA_BYTES_CONTROL_TYPE
  }
}

function findKnownAvatarMediaReference(
  book: ContactBook | null | undefined,
  profileId: string
): AvatarMediaReference | null {
  return (
    book?.contactsByProfileId?.get(profileId)?.avatarMediaSnapshot ||
    book?.pendingRequestsByProfileId?.get(profileId)?.avatarMediaSnapshot ||
    book?.outgoingRequestsByProfileId?.get(profileId)?.avatarMediaSnapshot ||
    null
  )
}

function cleanString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}
