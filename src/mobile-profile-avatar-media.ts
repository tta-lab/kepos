import {
  avatarMediaBase64,
  createAvatarMediaStringFileSystemAdapter
} from './avatar-media-storage.ts'
import type { AvatarMediaMimeType } from './avatar-media.ts'
import { importProfileAvatarMedia } from './profile-avatar-import.ts'
import { saveMobileProfileDocument } from './mobile-profile.ts'

type MobileAvatarFileSystem = {
  makeDirectoryAsync: (
    path: string,
    options?: {
      intermediates?: boolean
    }
  ) => Promise<unknown> | unknown
  readAsStringAsync(path: string, options?: unknown): Promise<string> | string
  writeAsStringAsync(path: string, value: string, options?: unknown): Promise<unknown> | unknown
}

type Sha256Hex = (bytes: Uint8Array) => Promise<string> | string

export async function importMobileProfileAvatarMedia({
  baseUri,
  fileSystem,
  mimeType,
  sha256Hex,
  sourceUri
}: {
  baseUri?: string | null
  fileSystem: MobileAvatarFileSystem
  mimeType?: AvatarMediaMimeType | string | null
  sha256Hex: Sha256Hex
  sourceUri?: string | null
}) {
  const cleanSourceUri = sourceUri?.trim() || ''
  if (!cleanSourceUri) throw new Error('Avatar image file is required')
  if (!baseUri) throw new Error('App storage directory is unavailable')

  const encodedBytes = await fileSystem.readAsStringAsync(cleanSourceUri, { encoding: 'base64' })
  const bytes = avatarMediaBase64.decode(encodedBytes)
  const digest = await sha256Hex(bytes)
  const storage = createAvatarMediaStringFileSystemAdapter({ fileSystem })
  const avatar = await importProfileAvatarMedia({
    baseUri,
    bytes,
    mimeType: mimeType || '',
    sha256Hex: () => digest,
    writeBytes: storage.writeBytes
  })

  await saveMobileProfileDocument({
    avatarMedia: avatar.avatarMedia,
    avatarUri: avatar.avatarUri,
    baseUri,
    fileSystem
  })

  return avatar
}
