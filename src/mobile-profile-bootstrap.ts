import {
  createTreeholePolicyFromContactBook,
  loadContactBookFromFileSystem
} from './contact-book-storage.ts'
import type { ContactBook } from './contact-book.ts'
import { loadDmThreadsFromFileSystem } from './dm-thread-storage.ts'
import type { DmThread } from './dm-thread.ts'
import { getOrCreateLocalProfile } from './local-profile.ts'
import {
  getOrCreateMobileHomeRoomKey,
  getOrCreateMobileIdentity,
  getRequiredMobileDocumentDirectory,
  loadMobileProfileDocument
} from './mobile-profile.ts'
import { loadProfileRecentPostCacheFromFileSystem } from './profile-recent-post-cache-storage.ts'
import type { ProfileRecentPostCache } from './profile-recent-posts-view-model.ts'
import type { SigningIdentity } from './signed-record.ts'
import type { AvatarMediaReference } from './avatar-media.ts'

type MobileBootstrapFileSystem = {
  documentDirectory?: string | null
  makeDirectoryAsync: (
    path: string,
    options?: {
      intermediates?: boolean
    }
  ) => Promise<unknown> | unknown
  readAsStringAsync: (path: string) => Promise<string> | string
  writeAsStringAsync: (path: string, value: string) => Promise<unknown> | unknown
}

export type MobileRuntimeProfile = {
  avatarMedia?: AvatarMediaReference
  avatarUri: string
  contactBook: ContactBook
  dmThreads: DmThread[]
  homeRoomKey: string
  identity: SigningIdentity
  profileId: string
  profileRecentPostCache: ProfileRecentPostCache
  treeholePolicy: ReturnType<typeof createTreeholePolicyFromContactBook>
}

export async function getMobileBackendStorageBasePath({
  fileSystem
}: {
  fileSystem: MobileBootstrapFileSystem
}): Promise<string> {
  const baseUri = getRequiredMobileDocumentDirectory(fileSystem)
  const storageUri = `${baseUri.replace(/\/+$/, '')}/kepos`

  await fileSystem.makeDirectoryAsync(storageUri, { intermediates: true })
  return storageUri
}

export async function loadMobileRuntimeProfile({
  createHomeRoomKey,
  createIdentity,
  fileSystem
}: {
  createHomeRoomKey: () => string
  createIdentity: () => SigningIdentity
  fileSystem: MobileBootstrapFileSystem
}): Promise<MobileRuntimeProfile> {
  const baseUri = getRequiredMobileDocumentDirectory(fileSystem)
  const localProfile = await loadMobileProfileDocument({
    baseUri,
    fileSystem
  })
  const identity = await getOrCreateMobileIdentity({
    baseUri,
    createIdentity,
    fileSystem
  })
  const homeRoomKey = await getOrCreateMobileHomeRoomKey({
    baseUri,
    createKey: createHomeRoomKey,
    fileSystem
  })

  const profile = getOrCreateLocalProfile({
    avatarMedia: localProfile.avatarMedia,
    avatarUri: localProfile.avatarUri,
    createIdentity: () => identity,
    displayName: 'Neil',
    homeRoomKey,
    storage: null
  })
  const contactBook = await loadContactBookFromFileSystem({
    baseUri,
    fileSystem,
    ownerProfileId: profile.id
  })
  const dmThreads = await loadDmThreadsFromFileSystem({
    baseUri,
    fileSystem
  })
  const profileRecentPostCache = await loadProfileRecentPostCacheFromFileSystem({
    baseUri,
    fileSystem
  })

  return {
    contactBook,
    dmThreads,
    homeRoomKey: profile.homeRoom.roomKey,
    identity: profile.identity,
    ...(profile.avatarMedia ? { avatarMedia: profile.avatarMedia } : {}),
    avatarUri: profile.avatarUri || '',
    profileId: profile.id,
    profileRecentPostCache,
    treeholePolicy: createTreeholePolicyFromContactBook(contactBook)
  }
}
