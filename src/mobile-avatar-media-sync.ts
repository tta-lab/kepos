import type { AvatarMediaReference } from './avatar-media.ts'
import { createAvatarMediaStoragePath } from './avatar-media.ts'
import {
  avatarMediaBase64,
  createAvatarMediaStringFileSystemAdapter
} from './avatar-media-storage.ts'
import type { ContactBook } from './contact-book.ts'
import { createAvatarMediaBytesControl, storeAvatarMediaBytesControl } from './avatar-media-sync.ts'

type MobileAvatarFileSystem = {
  makeDirectoryAsync?: (
    path: string,
    options?: {
      intermediates?: boolean
    }
  ) => Promise<unknown> | unknown
  readAsStringAsync(path: string, options?: unknown): Promise<string> | string
  writeAsStringAsync(path: string, value: string, options?: unknown): Promise<unknown> | unknown
}
type Sha256Hex = (bytes: Uint8Array) => Promise<string> | string

export async function createMobileLocalAvatarMediaControl({
  baseUri,
  fileSystem,
  profileId,
  reference,
  sha256Hex
}: {
  baseUri?: string | null
  fileSystem: MobileAvatarFileSystem
  profileId?: string | null
  reference?: AvatarMediaReference | null
  sha256Hex: Sha256Hex
}) {
  const cleanProfileId = profileId?.trim() || ''
  if (!baseUri || !cleanProfileId || !reference) return null

  const path = createAvatarMediaStoragePath({ baseUri, reference })
  const encodedBytes = await fileSystem.readAsStringAsync(path)
  const bytes = avatarMediaBase64.decode(encodedBytes)
  const digest = await sha256Hex(bytes)

  if (digest.trim().toLowerCase() !== reference.digest) return null

  return createAvatarMediaBytesControl({
    bytes,
    profileId: cleanProfileId,
    reference
  })
}

export function storeMobileAvatarMediaBytesControl({
  baseUri,
  book,
  fileSystem,
  message,
  sha256Hex
}: {
  baseUri?: string | null
  book?: ContactBook | null
  fileSystem: MobileAvatarFileSystem
  message?: unknown
  sha256Hex: Sha256Hex
}) {
  const storage = createAvatarMediaStringFileSystemAdapter({ fileSystem })

  return storeAvatarMediaBytesControl({
    baseUri,
    book,
    message,
    sha256Hex,
    writeBytes: storage.writeBytes
  })
}
