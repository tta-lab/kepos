const AVATAR_MEDIA_TYPE = 'kepos.avatar.media.v1'
const DIGEST_ALGORITHM = 'sha256'
const DIGEST_PATTERN = /^[0-9a-f]{64}$/
const DEFAULT_MAX_BYTES = 1024 * 1024

const MIME_EXTENSIONS = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp']
])

export type AvatarMediaMimeType = 'image/jpeg' | 'image/png' | 'image/webp'

export type AvatarMediaReference = {
  byteLength: number
  createdAt: number
  digest: string
  digestAlgorithm: typeof DIGEST_ALGORITHM
  mimeType: AvatarMediaMimeType
  type: typeof AVATAR_MEDIA_TYPE
  uri: string
}

export function createAvatarMediaReference({
  bytes,
  createdAt = Date.now(),
  maxBytes = DEFAULT_MAX_BYTES,
  mimeType,
  sha256Hex
}: {
  bytes: Uint8Array
  createdAt?: number
  maxBytes?: number
  mimeType: string
  sha256Hex: (bytes: Uint8Array) => string
}): AvatarMediaReference {
  const cleanBytes = cleanAvatarBytes(bytes, maxBytes)
  const cleanMimeType = cleanAvatarMimeType(mimeType)
  const digest = cleanDigest(sha256Hex(cleanBytes))

  return {
    byteLength: cleanBytes.byteLength,
    createdAt: cleanTimestamp(createdAt),
    digest,
    digestAlgorithm: DIGEST_ALGORITHM,
    mimeType: cleanMimeType,
    type: AVATAR_MEDIA_TYPE,
    uri: createAvatarMediaUri(digest)
  }
}

export function createAvatarMediaStoragePath({
  baseUri,
  reference
}: {
  baseUri: string
  reference: AvatarMediaReference
}): string {
  const cleanReference = cleanAvatarMediaReference(reference)
  const extension = MIME_EXTENSIONS.get(cleanReference.mimeType)

  if (!extension) {
    throw new Error('Unsupported avatar image type')
  }

  return `${normalizeBaseUri(baseUri)}/kepos/v1/avatar-media/sha256/${cleanReference.digest}.${extension}`
}

export function createAvatarMediaUriResolver({
  baseUri
}: {
  baseUri: string
}): (reference: AvatarMediaReference) => string {
  const cleanBaseUri = normalizeBaseUri(baseUri)

  return (reference: AvatarMediaReference) =>
    createAvatarMediaStoragePath({
      baseUri: cleanBaseUri,
      reference
    })
}

export function verifyAvatarMediaBytes({
  bytes,
  reference,
  sha256Hex
}: {
  bytes: Uint8Array
  reference: AvatarMediaReference
  sha256Hex: (bytes: Uint8Array) => string
}): boolean {
  try {
    const cleanReference = cleanAvatarMediaReference(reference)

    if (!(bytes instanceof Uint8Array) || bytes.byteLength !== cleanReference.byteLength) {
      return false
    }

    return cleanDigest(sha256Hex(bytes)) === cleanReference.digest
  } catch {
    return false
  }
}

export function isAvatarMediaReference(value: unknown): value is AvatarMediaReference {
  try {
    cleanAvatarMediaReference(value)
    return true
  } catch {
    return false
  }
}

function cleanAvatarMediaReference(value: unknown): AvatarMediaReference {
  const record = asRecord(value)
  const digest = cleanDigest(record.digest)

  if (record.type !== AVATAR_MEDIA_TYPE || record.digestAlgorithm !== DIGEST_ALGORITHM) {
    throw new Error('Invalid avatar media reference')
  }

  return {
    byteLength: cleanByteLength(record.byteLength),
    createdAt: cleanTimestamp(record.createdAt),
    digest,
    digestAlgorithm: DIGEST_ALGORITHM,
    mimeType: cleanAvatarMimeType(record.mimeType),
    type: AVATAR_MEDIA_TYPE,
    uri: cleanAvatarMediaUri(record.uri, digest)
  }
}

function cleanAvatarBytes(bytes: Uint8Array, maxBytes: number): Uint8Array {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0) {
    throw new Error('Avatar image bytes are required')
  }

  const cleanMaxBytes = cleanByteLength(maxBytes)
  if (bytes.byteLength > cleanMaxBytes) {
    throw new Error('Avatar image is too large')
  }

  return bytes
}

function cleanAvatarMimeType(value: unknown): AvatarMediaMimeType {
  const mimeType = typeof value === 'string' ? value.trim().toLowerCase() : ''

  if (!MIME_EXTENSIONS.has(mimeType)) {
    throw new Error('Unsupported avatar image type')
  }

  return mimeType as AvatarMediaMimeType
}

function cleanDigest(value: unknown): string {
  const digest = typeof value === 'string' ? value.trim().toLowerCase() : ''

  if (!DIGEST_PATTERN.test(digest)) {
    throw new Error('Invalid avatar media digest')
  }

  return digest
}

function cleanAvatarMediaUri(value: unknown, digest: string): string {
  const expected = createAvatarMediaUri(digest)

  if (value !== expected) {
    throw new Error('Invalid avatar media uri')
  }

  return expected
}

function createAvatarMediaUri(digest: string): string {
  return `kepos://avatar/sha256/${digest}`
}

function cleanByteLength(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new Error('Invalid avatar media byte length')
  }

  return value
}

function cleanTimestamp(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new Error('Invalid avatar media timestamp')
  }

  return value
}

function normalizeBaseUri(value: string): string {
  const baseUri = value?.trim()

  if (!baseUri) {
    throw new Error('Avatar media storage base URI is required')
  }

  return baseUri.replace(/\/+$/, '')
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid avatar media reference')
  }

  return value as Record<string, unknown>
}
