import { isIdentityKey, isIdentityKeyPair } from './identity.ts'
import type { SigningIdentity } from './signed-record.ts'

const PROFILE_ID_FILE = 'profile-id.txt'
const HOME_ROOM_KEY_FILE = 'home-room-key.txt'
const IDENTITY_PUBLIC_KEY_FILE = 'identity-public-key.txt'
const IDENTITY_SECRET_KEY_FILE = 'identity-secret-key.txt'
const V1_DIR = 'v1'
const V1_IDENTITY_FILE = 'identity.json'
const V1_HOME_FILE = 'home.json'
const DM_ENCRYPTION_PUBLIC_KEY_FILE = 'dm-encryption-public-key.txt'
const DM_ENCRYPTION_SECRET_KEY_FILE = 'dm-encryption-secret-key.txt'
const HEX_32_PATTERN = /^[0-9a-f]{64}$/

type MobileFileSystem = {
  documentDirectory?: string | null
  getInfoAsync?: (path: string) => Promise<{ exists?: boolean }> | { exists?: boolean }
  makeDirectoryAsync: (
    path: string,
    options?: {
      intermediates?: boolean
    }
  ) => Promise<unknown> | unknown
  readAsStringAsync: (path: string) => Promise<string> | string
  writeAsStringAsync: (path: string, value: string) => Promise<unknown> | unknown
}

type MobileStorageDocument<TData> = {
  data: TData
  schemaVersion: 1
  type: string
}

type MobileHomeDocumentData = {
  ownerProfileId: string | null
  roomKey: string
}

export type MobileDmEncryptionKeyPair = {
  publicKey: string
  secretKey: string
}

export function getRequiredMobileDocumentDirectory(fileSystem?: MobileFileSystem | null): string {
  const documentDirectory = fileSystem?.documentDirectory?.trim?.() || null

  if (!documentDirectory) {
    throw new Error('App document directory is unavailable')
  }

  return documentDirectory
}

export async function getOrCreateMobileProfileId({
  baseUri,
  createId,
  fileSystem
}: {
  baseUri?: string | null
  createId: () => string
  fileSystem: MobileFileSystem
}): Promise<string> {
  if (!baseUri) {
    throw new Error('App storage directory is unavailable')
  }

  const profileDir = `${baseUri.replace(/\/+$/, '')}/kepos`
  const identityPath = `${profileDir}/${V1_DIR}/${V1_IDENTITY_FILE}`
  const profilePath = `${profileDir}/${PROFILE_ID_FILE}`

  await fileSystem.makeDirectoryAsync(profileDir, { intermediates: true })

  const identityDocument = await readMobileDocument<SigningIdentity>(
    fileSystem,
    identityPath,
    'kepos.identity'
  )
  if (identityDocument) {
    return identityDocument.data.publicKey
  }

  try {
    const existingId = (await fileSystem.readAsStringAsync(profilePath)).trim()

    if (existingId) {
      return existingId
    }
  } catch {}

  const profileId = createId()
  await fileSystem.writeAsStringAsync(profilePath, profileId)
  return profileId
}

export async function getOrCreateMobileHomeRoomKey({
  baseUri,
  createKey,
  fileSystem
}: {
  baseUri?: string | null
  createKey: () => string
  fileSystem: MobileFileSystem
}): Promise<string> {
  if (!baseUri) {
    throw new Error('App storage directory is unavailable')
  }

  const profileDir = `${baseUri.replace(/\/+$/, '')}/kepos`
  const homePath = `${profileDir}/${V1_DIR}/${V1_HOME_FILE}`
  const homeRoomKeyPath = `${profileDir}/${HOME_ROOM_KEY_FILE}`

  await fileSystem.makeDirectoryAsync(profileDir, { intermediates: true })
  await fileSystem.makeDirectoryAsync(`${profileDir}/${V1_DIR}`, { intermediates: true })

  const homeDocument = await readMobileDocument<MobileHomeDocumentData>(
    fileSystem,
    homePath,
    'kepos.home'
  )
  const existingHomeRoomKey = homeDocument?.data?.roomKey || null

  const existingKey = existingHomeRoomKey || (await readOptionalFile(fileSystem, homeRoomKeyPath))

  if (existingKey) {
    if (!HEX_32_PATTERN.test(existingKey)) {
      throw new Error('Corrupt mobile home room key')
    }

    if (!homeDocument) {
      await writeMobileHomeDocument(fileSystem, homePath, {
        ownerProfileId: await readMobileProfileId(fileSystem, profileDir),
        roomKey: existingKey
      })
    }

    return existingKey
  }

  const homeRoomKey = createKey()
  if (!HEX_32_PATTERN.test(homeRoomKey)) {
    throw new Error('Invalid mobile home room key')
  }

  await writeMobileHomeDocument(fileSystem, homePath, {
    ownerProfileId: await readMobileProfileId(fileSystem, profileDir),
    roomKey: homeRoomKey
  })
  await fileSystem.writeAsStringAsync(homeRoomKeyPath, homeRoomKey)
  return homeRoomKey
}

export async function getOrCreateMobileIdentity({
  baseUri,
  createIdentity,
  fileSystem
}: {
  baseUri?: string | null
  createIdentity: () => SigningIdentity
  fileSystem: MobileFileSystem
}): Promise<SigningIdentity> {
  if (!baseUri) {
    throw new Error('App storage directory is unavailable')
  }

  const profileDir = `${baseUri.replace(/\/+$/, '')}/kepos`
  const identityPath = `${profileDir}/${V1_DIR}/${V1_IDENTITY_FILE}`
  const publicKeyPath = `${profileDir}/${IDENTITY_PUBLIC_KEY_FILE}`
  const secretKeyPath = `${profileDir}/${IDENTITY_SECRET_KEY_FILE}`
  const profilePath = `${profileDir}/${PROFILE_ID_FILE}`

  await fileSystem.makeDirectoryAsync(profileDir, { intermediates: true })
  await fileSystem.makeDirectoryAsync(`${profileDir}/${V1_DIR}`, { intermediates: true })

  const identityDocument = await readMobileDocument<SigningIdentity>(
    fileSystem,
    identityPath,
    'kepos.identity'
  )
  if (identityDocument) {
    const identity = identityDocument.data

    if (!isSigningIdentity(identity)) {
      throw new Error('Corrupt mobile identity')
    }

    return identity
  }

  const publicKey = await readOptionalFile(fileSystem, publicKeyPath)
  const secretKey = await readOptionalFile(fileSystem, secretKeyPath)

  if (publicKey || secretKey) {
    const identity = {
      publicKey,
      secretKey
    }

    if (!isSigningIdentity(identity)) {
      throw new Error('Corrupt mobile identity')
    }

    await writeMobileIdentityDocument(fileSystem, identityPath, identity)
    await fileSystem.writeAsStringAsync(profilePath, identity.publicKey)
    return identity
  }

  const identity = createIdentity()
  if (!isSigningIdentity(identity)) {
    throw new Error('Invalid mobile identity')
  }

  await writeMobileIdentityDocument(fileSystem, identityPath, identity)
  await fileSystem.writeAsStringAsync(publicKeyPath, identity.publicKey)
  await fileSystem.writeAsStringAsync(secretKeyPath, identity.secretKey)
  await fileSystem.writeAsStringAsync(profilePath, identity.publicKey)
  return identity
}

export async function getOrCreateMobileDmEncryptionKeyPair({
  baseUri,
  createKeyPair,
  fileSystem
}: {
  baseUri?: string | null
  createKeyPair: () => MobileDmEncryptionKeyPair
  fileSystem: MobileFileSystem
}): Promise<MobileDmEncryptionKeyPair> {
  if (!baseUri) {
    throw new Error('App storage directory is unavailable')
  }

  const profileDir = `${baseUri.replace(/\/+$/, '')}/kepos`
  const publicKeyPath = `${profileDir}/${DM_ENCRYPTION_PUBLIC_KEY_FILE}`
  const secretKeyPath = `${profileDir}/${DM_ENCRYPTION_SECRET_KEY_FILE}`

  await fileSystem.makeDirectoryAsync(profileDir, { intermediates: true })

  const publicKey = await readOptionalFile(fileSystem, publicKeyPath)
  const secretKey = await readOptionalFile(fileSystem, secretKeyPath)

  if (publicKey || secretKey) {
    const keyPair = {
      publicKey,
      secretKey
    }

    if (!isDmEncryptionKeyPair(keyPair)) {
      throw new Error('Corrupt mobile DM encryption key pair')
    }

    return keyPair
  }

  const keyPair = createKeyPair()
  if (!isDmEncryptionKeyPair(keyPair)) {
    throw new Error('Invalid mobile DM encryption key pair')
  }

  await fileSystem.writeAsStringAsync(publicKeyPath, keyPair.publicKey)
  await fileSystem.writeAsStringAsync(secretKeyPath, keyPair.secretKey)
  return keyPair
}

async function readOptionalFile(
  fileSystem: MobileFileSystem,
  path: string
): Promise<string | null> {
  try {
    return (await fileSystem.readAsStringAsync(path)).trim() || null
  } catch (error) {
    if (await fileExists(fileSystem, path)) {
      throw error
    }

    return null
  }
}

async function readMobileDocument<TData>(
  fileSystem: MobileFileSystem,
  path: string,
  type: string
): Promise<MobileStorageDocument<TData> | null> {
  const raw = await readOptionalFile(fileSystem, path)

  if (!raw) {
    return null
  }

  try {
    const document = JSON.parse(raw) as Partial<MobileStorageDocument<TData>>

    if (document?.type !== type || document?.schemaVersion !== 1 || !document?.data) {
      throw new Error(`Unsupported ${type} storage document`)
    }

    return {
      data: document.data,
      schemaVersion: document.schemaVersion,
      type: document.type
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Corrupt mobile ${type} storage: ${message}`)
  }
}

async function writeMobileIdentityDocument(
  fileSystem: MobileFileSystem,
  path: string,
  identity: SigningIdentity
): Promise<void> {
  await fileSystem.writeAsStringAsync(
    path,
    JSON.stringify({
      data: {
        publicKey: identity.publicKey,
        secretKey: identity.secretKey
      },
      schemaVersion: 1,
      type: 'kepos.identity'
    })
  )
}

async function writeMobileHomeDocument(
  fileSystem: MobileFileSystem,
  path: string,
  home: MobileHomeDocumentData
): Promise<void> {
  await fileSystem.writeAsStringAsync(
    path,
    JSON.stringify({
      data: {
        ownerProfileId: home.ownerProfileId,
        roomKey: home.roomKey
      },
      schemaVersion: 1,
      type: 'kepos.home'
    })
  )
}

function readMobileProfileId(
  fileSystem: MobileFileSystem,
  profileDir: string
): Promise<string | null> {
  return readOptionalFile(fileSystem, `${profileDir}/${PROFILE_ID_FILE}`)
}

async function fileExists(fileSystem: MobileFileSystem, path: string): Promise<boolean> {
  if (!fileSystem.getInfoAsync) {
    return false
  }

  try {
    const info = await fileSystem.getInfoAsync(path)
    return Boolean(info?.exists)
  } catch {
    return false
  }
}

function isSigningIdentity(value: unknown): value is SigningIdentity {
  return isIdentityKeyPair(value)
}

function isDmEncryptionKeyPair(value: unknown): value is MobileDmEncryptionKeyPair {
  const keyPair = value as Partial<MobileDmEncryptionKeyPair> | null | undefined
  return isIdentityKey(keyPair?.publicKey) && isIdentityKey(keyPair?.secretKey)
}
