import b4a from 'b4a'

const HEX_32_PATTERN = /^[0-9a-f]{64}$/

export async function getOrCreateBackendDmEncryptionKeyPair({ basePath, createKeyPair, fs } = {}) {
  if (!basePath) {
    return createValidKeyPair(createKeyPair)
  }

  const dir = `${normalizeBasePath(basePath)}/kepos`
  const path = `${dir}/dm-encryption-keypair.json`

  try {
    const keyPair = JSON.parse(b4a.toString(await fs.readFile(path)))

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

export function isDmEncryptionKeyPair(keyPair) {
  return HEX_32_PATTERN.test(keyPair?.publicKey) && HEX_32_PATTERN.test(keyPair?.secretKey)
}

function createValidKeyPair(createKeyPair) {
  const keyPair = createKeyPair()

  if (!isDmEncryptionKeyPair(keyPair)) {
    throw new Error('Invalid backend DM encryption key pair')
  }

  return keyPair
}

function isMissingFileError(error) {
  return error?.code === 'ENOENT'
}

function normalizeBasePath(basePath) {
  return basePath.startsWith('file://') ? decodeURI(basePath.slice('file://'.length)) : basePath
}
