import b4a from 'b4a'

const HEX_32_PATTERN = /^[0-9a-f]{64}$/

type BackendDmEncryptionKeyPair = {
  publicKey: string
  secretKey: string
}

type BackendDmKeyFileSystem = {
  mkdir(path: string, options: { recursive: boolean }): Promise<unknown> | unknown
  readFile(path: string): Promise<Uint8Array | string> | Uint8Array | string
  writeFile(path: string, value: Uint8Array): Promise<unknown> | unknown
}

type FileSystemError = Error & {
  code?: string
}

export async function getOrCreateBackendDmEncryptionKeyPair({
  basePath,
  createKeyPair,
  fs
}: {
  basePath?: string | null
  createKeyPair: () => BackendDmEncryptionKeyPair
  fs?: BackendDmKeyFileSystem
}): Promise<BackendDmEncryptionKeyPair> {
  if (!basePath) {
    return createValidKeyPair(createKeyPair)
  }

  if (!fs) {
    throw new Error('Backend DM key storage file system is required')
  }

  const dir = `${normalizeBasePath(basePath)}/kepos`
  const path = `${dir}/dm-encryption-keypair.json`

  try {
    const stored = await fs.readFile(path)
    const keyPair = JSON.parse(typeof stored === 'string' ? stored : b4a.toString(stored))

    if (!isDmEncryptionKeyPair(keyPair)) {
      throw new Error('Corrupt backend DM encryption key pair')
    }

    return keyPair
  } catch (error) {
    if (!isMissingFileError(error)) {
      throw new Error('Corrupt backend DM encryption key pair')
    }
  }

  const keyPair = createValidKeyPair(createKeyPair)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(path, b4a.from(JSON.stringify(keyPair)))
  return keyPair
}

export function isDmEncryptionKeyPair(keyPair: unknown): keyPair is BackendDmEncryptionKeyPair {
  if (!keyPair || typeof keyPair !== 'object') {
    return false
  }

  const value = keyPair as Record<string, unknown>
  return (
    typeof value.publicKey === 'string' &&
    typeof value.secretKey === 'string' &&
    HEX_32_PATTERN.test(value.publicKey) &&
    HEX_32_PATTERN.test(value.secretKey)
  )
}

function createValidKeyPair(
  createKeyPair: () => BackendDmEncryptionKeyPair
): BackendDmEncryptionKeyPair {
  const keyPair = createKeyPair()

  if (!isDmEncryptionKeyPair(keyPair)) {
    throw new Error('Invalid backend DM encryption key pair')
  }

  return keyPair
}

function isMissingFileError(error: unknown): boolean {
  return (error as FileSystemError | undefined)?.code === 'ENOENT'
}

function normalizeBasePath(basePath: string): string {
  return basePath.startsWith('file://') ? decodeURI(basePath.slice('file://'.length)) : basePath
}
