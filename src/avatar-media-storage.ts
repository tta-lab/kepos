import b4a from 'b4a'
import {
  createAvatarMediaStoragePath,
  verifyAvatarMediaBytes,
  type AvatarMediaReference
} from './avatar-media.ts'

type WriteBytes = (path: string, bytes: Uint8Array) => Promise<unknown> | unknown
type ReadBytes = (
  path: string
) => Promise<Uint8Array | null | undefined> | Uint8Array | null | undefined
type Sha256Hex = (bytes: Uint8Array) => Promise<string> | string
type Base64Codec = {
  decode(value: string): Uint8Array
  encode(bytes: Uint8Array): string
}
type StringFileSystem = {
  makeDirectoryAsync?: (
    path: string,
    options: { intermediates: boolean }
  ) => Promise<unknown> | unknown
  readAsStringAsync(path: string, options?: unknown): Promise<string> | string
  writeAsStringAsync(path: string, value: string, options?: unknown): Promise<unknown> | unknown
}

export type AvatarMediaStore = {
  readVerified({ reference }: { reference: AvatarMediaReference }): Promise<Uint8Array | null>
  writeVerified({
    bytes,
    reference
  }: {
    bytes: Uint8Array
    reference: AvatarMediaReference
  }): Promise<string>
}

export const avatarMediaBase64: Base64Codec = {
  decode(value) {
    return Uint8Array.from(b4a.from(value, 'base64'))
  },
  encode(bytes) {
    return b4a.toString(bytes, 'base64')
  }
}

export async function storeVerifiedAvatarMediaBytes({
  baseUri,
  bytes,
  reference,
  sha256Hex,
  writeBytes
}: {
  baseUri: string
  bytes: Uint8Array
  reference: AvatarMediaReference
  sha256Hex: Sha256Hex
  writeBytes: WriteBytes
}): Promise<string> {
  if (!(await verifyAvatarMediaBytesWithMaybeAsyncHash({ bytes, reference, sha256Hex }))) {
    throw new Error('Avatar media verification failed')
  }

  const path = createAvatarMediaStoragePath({ baseUri, reference })
  await writeBytes(path, bytes)

  return path
}

export function createAvatarMediaStore({
  baseUri,
  readBytes,
  sha256Hex,
  writeBytes
}: {
  baseUri: string
  readBytes: ReadBytes
  sha256Hex: Sha256Hex
  writeBytes: WriteBytes
}): AvatarMediaStore {
  return {
    async readVerified({ reference }) {
      const path = createAvatarMediaStoragePath({ baseUri, reference })
      const bytes = await readBytes(path)

      if (
        !bytes ||
        !(await verifyAvatarMediaBytesWithMaybeAsyncHash({ bytes, reference, sha256Hex }))
      ) {
        return null
      }

      return bytes
    },
    writeVerified({ bytes, reference }) {
      return storeVerifiedAvatarMediaBytes({
        baseUri,
        bytes,
        reference,
        sha256Hex,
        writeBytes
      })
    }
  }
}

async function verifyAvatarMediaBytesWithMaybeAsyncHash({
  bytes,
  reference,
  sha256Hex
}: {
  bytes: Uint8Array
  reference: AvatarMediaReference
  sha256Hex: Sha256Hex
}): Promise<boolean> {
  try {
    if (!(bytes instanceof Uint8Array) || bytes.byteLength !== reference.byteLength) {
      return false
    }

    const digest = await sha256Hex(bytes)
    return typeof digest === 'string' && digest.trim().toLowerCase() === reference.digest
  } catch {
    return false
  }
}

export function createAvatarMediaStringFileSystemAdapter({
  base64 = avatarMediaBase64,
  fileSystem,
  readOptions,
  writeOptions
}: {
  base64?: Base64Codec
  fileSystem: StringFileSystem
  readOptions?: unknown
  writeOptions?: unknown
}): {
  readBytes: ReadBytes
  writeBytes: WriteBytes
} {
  return {
    async readBytes(path) {
      try {
        return base64.decode(await fileSystem.readAsStringAsync(path, readOptions))
      } catch (error) {
        if (isMissingFileError(error)) return null
        throw error
      }
    },
    async writeBytes(path, bytes) {
      await fileSystem.makeDirectoryAsync?.(parentPath(path), { intermediates: true })
      await fileSystem.writeAsStringAsync(path, base64.encode(bytes), writeOptions)
    }
  }
}

function parentPath(path: string): string {
  return path.replace(/\/[^/]*$/, '')
}

function isMissingFileError(error: unknown): boolean {
  return error instanceof Error && /not found|no such file|enoent/i.test(error.message)
}
