import type { DmEncryptionKeyPair, LocalProfile } from './profile.ts'
import { createProfile } from './profile.ts'
import type { SigningIdentity } from './signed-record.ts'
import { createIdentityKeyPair, isIdentityKey, isIdentityKeyPair } from './identity.ts'

const PROFILE_ID_KEY = 'kepos.profile.id'
const IDENTITY_PUBLIC_KEY = 'kepos.identity.publicKey'
const IDENTITY_SECRET_KEY = 'kepos.identity.secretKey'
const HOME_ROOM_KEY = 'kepos.home.roomKey'
const V1_IDENTITY_KEY = 'kepos.v1.identity'
const V1_HOME_KEY = 'kepos.v1.home'
const DM_ENCRYPTION_PUBLIC_KEY = 'kepos.dmEncryption.publicKey'
const DM_ENCRYPTION_SECRET_KEY = 'kepos.dmEncryption.secretKey'
const HEX_32_PATTERN = /^[0-9a-f]{64}$/

type LocalStorageLike = {
  getItem?: (key: string) => string | null
  setItem?: (key: string, value: string) => unknown
}

type LocalDocument<TData> = {
  data: TData
  schemaVersion: 1
  type: string
}

type StoredIdentity = {
  publicKey: string | null
  secretKey: string | null
}

type StoredHome = {
  ownerProfileId: string | null
  roomKey: string | null
}

export function getOrCreateLocalProfile({
  createDmEncryptionKeyPair = null,
  createIdentity = createIdentityKeyPair,
  displayName = 'Kepos',
  homeRoomKey = null,
  storage = getDefaultStorage()
}: {
  createDmEncryptionKeyPair?: (() => DmEncryptionKeyPair) | null
  createIdentity?: () => SigningIdentity
  displayName?: string
  homeRoomKey?: string | null
  storage?: LocalStorageLike | null
} = {}): LocalProfile {
  const existingId = storage?.getItem?.(PROFILE_ID_KEY)?.trim()
  const storedIdentity = readLocalIdentity(storage)
  const identity = getLocalIdentity({
    createIdentity,
    storedPublicKey: storedIdentity?.publicKey || null,
    storedSecretKey: storedIdentity?.secretKey || null
  })
  const storedHome = readLocalHome(storage)
  const storedHomeRoomKey = storedHome?.roomKey || null
  if (storedHomeRoomKey && !HEX_32_PATTERN.test(storedHomeRoomKey)) {
    throw new Error('Corrupt local home room key')
  }

  const existingHomeRoomKey = storedHomeRoomKey || homeRoomKey
  const storedDmEncryptionPublicKey = storage?.getItem?.(DM_ENCRYPTION_PUBLIC_KEY)?.trim() || null
  const storedDmEncryptionSecretKey = storage?.getItem?.(DM_ENCRYPTION_SECRET_KEY)?.trim() || null
  const dmEncryptionKeyPair = getLocalDmEncryptionKeyPair({
    createDmEncryptionKeyPair,
    storedPublicKey: storedDmEncryptionPublicKey,
    storedSecretKey: storedDmEncryptionSecretKey
  })

  const profile = createProfile({
    dmEncryptionKeyPair,
    homeRoomKey: existingHomeRoomKey,
    identity,
    displayName
  })

  if (!existingId || existingId !== profile.id) {
    storage?.setItem?.(PROFILE_ID_KEY, profile.id)
  }
  if (!storedIdentity?.publicKey) {
    storage?.setItem?.(IDENTITY_PUBLIC_KEY, profile.identity.publicKey)
  }
  if (!storedIdentity?.secretKey) {
    storage?.setItem?.(IDENTITY_SECRET_KEY, profile.identity.secretKey)
  }
  writeLocalIdentity(storage, profile.identity)
  if (!storedHomeRoomKey) {
    storage?.setItem?.(HOME_ROOM_KEY, profile.homeRoom.roomKey)
  }
  writeLocalHome(storage, {
    ownerProfileId: profile.id,
    roomKey: profile.homeRoom.roomKey
  })
  if (profile.dmEncryptionKeyPair && !storedDmEncryptionPublicKey) {
    storage?.setItem?.(DM_ENCRYPTION_PUBLIC_KEY, profile.dmEncryptionKeyPair.publicKey)
  }
  if (profile.dmEncryptionKeyPair && !storedDmEncryptionSecretKey) {
    storage?.setItem?.(DM_ENCRYPTION_SECRET_KEY, profile.dmEncryptionKeyPair.secretKey)
  }

  return profile
}

function readLocalIdentity(storage: LocalStorageLike | null): StoredIdentity {
  const document = readLocalDocument<SigningIdentity>(storage, V1_IDENTITY_KEY, 'kepos.identity')

  if (document) {
    return document.data
  }

  return {
    publicKey: storage?.getItem?.(IDENTITY_PUBLIC_KEY)?.trim() || null,
    secretKey: storage?.getItem?.(IDENTITY_SECRET_KEY)?.trim() || null
  }
}

function readLocalHome(storage: LocalStorageLike | null): StoredHome {
  const document = readLocalDocument<StoredHome>(storage, V1_HOME_KEY, 'kepos.home')

  if (document) {
    return document.data
  }

  return {
    ownerProfileId: storage?.getItem?.(PROFILE_ID_KEY)?.trim() || null,
    roomKey: storage?.getItem?.(HOME_ROOM_KEY)?.trim() || null
  }
}

function readLocalDocument<TData>(
  storage: LocalStorageLike | null,
  key: string,
  type: string
): LocalDocument<TData> | null {
  const raw = storage?.getItem?.(key)

  if (!raw) {
    return null
  }

  try {
    const document = JSON.parse(raw) as Partial<LocalDocument<TData>>

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
    throw new Error(`Corrupt local ${type} storage: ${message}`)
  }
}

function writeLocalIdentity(storage: LocalStorageLike | null, identity: SigningIdentity): void {
  storage?.setItem?.(
    V1_IDENTITY_KEY,
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

function writeLocalHome(storage: LocalStorageLike | null, home: StoredHome): void {
  storage?.setItem?.(
    V1_HOME_KEY,
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

function getLocalIdentity({
  createIdentity,
  storedPublicKey,
  storedSecretKey
}: {
  createIdentity: () => SigningIdentity
  storedPublicKey: string | null
  storedSecretKey: string | null
}): SigningIdentity {
  if (!storedPublicKey && !storedSecretKey) {
    const identity = createIdentity()
    if (!isIdentityKeyPair(identity)) {
      throw new Error('Invalid local identity')
    }

    return identity
  }

  const identity = {
    publicKey: storedPublicKey,
    secretKey: storedSecretKey
  }

  if (!isIdentityKeyPair(identity)) {
    throw new Error('Corrupt local identity')
  }

  return identity
}

function getLocalDmEncryptionKeyPair({
  createDmEncryptionKeyPair,
  storedPublicKey,
  storedSecretKey
}: {
  createDmEncryptionKeyPair: (() => DmEncryptionKeyPair) | null
  storedPublicKey: string | null
  storedSecretKey: string | null
}): DmEncryptionKeyPair | null {
  if (!storedPublicKey && !storedSecretKey) {
    const keyPair = createDmEncryptionKeyPair?.() || null
    if (keyPair && !isDmEncryptionKeyPair(keyPair)) {
      throw new Error('Invalid local DM encryption key pair')
    }

    return keyPair
  }

  const keyPair = {
    publicKey: storedPublicKey,
    secretKey: storedSecretKey
  }

  if (!isDmEncryptionKeyPair(keyPair)) {
    throw new Error('Corrupt local DM encryption key pair')
  }

  return keyPair
}

function isDmEncryptionKeyPair(keyPair: unknown): keyPair is DmEncryptionKeyPair {
  const value = keyPair as Partial<DmEncryptionKeyPair> | null | undefined
  return isIdentityKey(value?.publicKey) && isIdentityKey(value?.secretKey)
}

function getDefaultStorage(): LocalStorageLike | null {
  try {
    return globalThis.localStorage || null
  } catch {
    return null
  }
}
