import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { createHash } from 'node:crypto'
import { createAvatarMediaStoragePath, type AvatarMediaReference } from './avatar-media.ts'
import { avatarMediaBase64 } from './avatar-media-storage.ts'
import { importProfileAvatarMedia } from './profile-avatar-import.ts'

export async function importDesktopProfileAvatarMedia({
  bytesBase64,
  createdAt = Date.now(),
  maxBytes,
  mimeType,
  storageBasePath,
  writeBytes = writeDesktopAvatarBytes
}: {
  bytesBase64?: string
  createdAt?: number
  maxBytes?: number
  mimeType?: string
  storageBasePath?: string | null
  writeBytes?: (path: string, bytes: Uint8Array) => Promise<unknown> | unknown
}) {
  const baseUri = typeof storageBasePath === 'string' ? storageBasePath.trim() : ''
  if (!baseUri) throw new Error('Desktop avatar media storage is unavailable')

  const bytes = avatarMediaBase64.decode(cleanBase64(bytesBase64))

  return await importProfileAvatarMedia({
    baseUri,
    bytes,
    createdAt,
    ...(maxBytes ? { maxBytes } : {}),
    mimeType: typeof mimeType === 'string' ? mimeType : '',
    sha256Hex: createSha256Hex,
    writeBytes
  })
}

export function createSha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

export async function readDesktopAvatarBytes({
  reference,
  storageBasePath
}: {
  reference: AvatarMediaReference
  storageBasePath?: string | null
}): Promise<Uint8Array | null> {
  const baseUri = typeof storageBasePath === 'string' ? storageBasePath.trim() : ''
  if (!baseUri) return null

  try {
    const path = createAvatarMediaStoragePath({ baseUri, reference })
    return Uint8Array.from(await readFile(path))
  } catch (error) {
    if (isMissingFileError(error)) return null
    throw error
  }
}

export async function writeDesktopAvatarBytes(path: string, bytes: Uint8Array): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, bytes)
}

function cleanBase64(value: unknown): string {
  const clean = typeof value === 'string' ? value.trim() : ''
  if (!clean) throw new Error('Avatar image bytes are required')
  return clean
}

function isMissingFileError(error: unknown): boolean {
  return error instanceof Error && /not found|no such file|enoent/i.test(error.message)
}
