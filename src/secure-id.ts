type RandomBytes = (size: number) => Uint8Array
type RandomUUID = () => string

export function createSecureId({
  byteLength = 16,
  randomBytes,
  randomUUID
}: {
  byteLength?: number
  randomBytes?: RandomBytes
  randomUUID?: RandomUUID
}): string {
  const uuid = randomUUID?.()
  if (uuid) return uuid

  if (!randomBytes) {
    throw new Error('Secure random id source is required')
  }

  return bytesToHex(randomBytes(byteLength))
}

export function createSecureHexId({
  byteLength,
  randomBytes
}: {
  byteLength: number
  randomBytes?: RandomBytes
}): string {
  if (!randomBytes) {
    throw new Error('Secure random id source is required')
  }

  return bytesToHex(randomBytes(byteLength))
}

export function createDefaultSecureId(): string {
  return createSecureId({
    randomBytes: getGlobalRandomBytes(),
    randomUUID: globalThis.crypto?.randomUUID?.bind(globalThis.crypto)
  })
}

export function createDefaultSecureHexId(byteLength: number): string {
  return createSecureHexId({
    byteLength,
    randomBytes: getGlobalRandomBytes()
  })
}

function getGlobalRandomBytes(): RandomBytes | undefined {
  if (!globalThis.crypto?.getRandomValues) return undefined

  return (size) => {
    const bytes = new Uint8Array(size)
    globalThis.crypto.getRandomValues(bytes)
    return bytes
  }
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}
