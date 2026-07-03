import {
  createAvatarMediaReference,
  type AvatarMediaMimeType,
  type AvatarMediaReference
} from './avatar-media.ts'
import { storeVerifiedAvatarMediaBytes } from './avatar-media-storage.ts'

type WriteBytes = (path: string, bytes: Uint8Array) => Promise<unknown> | unknown
type Sha256Hex = (bytes: Uint8Array) => string

export type ProfileAvatarMediaImport = {
  avatarMedia: AvatarMediaReference
  avatarUri: string
  storageUri: string
}

export async function importProfileAvatarMedia({
  baseUri,
  bytes,
  createdAt = Date.now(),
  maxBytes,
  mimeType,
  sha256Hex,
  writeBytes
}: {
  baseUri: string
  bytes: Uint8Array
  createdAt?: number
  maxBytes?: number
  mimeType: AvatarMediaMimeType | string
  sha256Hex: Sha256Hex
  writeBytes: WriteBytes
}): Promise<ProfileAvatarMediaImport> {
  const avatarMedia = createAvatarMediaReference({
    bytes,
    createdAt,
    ...(maxBytes ? { maxBytes } : {}),
    mimeType,
    sha256Hex
  })
  const storageUri = await storeVerifiedAvatarMediaBytes({
    baseUri,
    bytes,
    reference: avatarMedia,
    sha256Hex,
    writeBytes
  })

  return {
    avatarMedia,
    avatarUri: avatarMedia.uri,
    storageUri
  }
}
