import { deserializeDmThread, serializeDmThread } from './dm-thread.ts'
import type { DmThread, SerializedDmThread } from './dm-thread.ts'

const DM_THREADS_COLLECTION_VERSION = 1
const DM_THREADS_KEY = 'kepos.dmThreads.v1'
const DM_THREADS_FILE = 'threads.json'

type SyncStorage = {
  getItem?: (key: string) => string | null | undefined
  setItem?: (key: string, value: string) => unknown
}

type AsyncFileSystem = {
  makeDirectoryAsync(path: string, options: { intermediates: boolean }): Promise<unknown> | unknown
  readAsStringAsync(path: string): Promise<string> | string
  writeAsStringAsync(path: string, value: string): Promise<unknown> | unknown
}

type SerializedDmThreadCollection = {
  threads: SerializedDmThread[]
  version: typeof DM_THREADS_COLLECTION_VERSION
}

export function loadDmThreadsFromStorage({
  ownerProfileId,
  storage
}: {
  ownerProfileId: string
  storage?: SyncStorage | null
}): DmThread[] {
  void ownerProfileId
  const stored = storage?.getItem?.(DM_THREADS_KEY)

  if (!stored) {
    return []
  }

  return deserializeDmThreadCollection(stored)
}

export function saveDmThreadsToStorage({
  ownerProfileId,
  storage,
  threads
}: {
  ownerProfileId: string
  storage?: SyncStorage | null
  threads: DmThread[]
}): void {
  void ownerProfileId
  storage?.setItem?.(DM_THREADS_KEY, JSON.stringify(serializeDmThreadCollection(threads)))
}

export async function loadDmThreadsFromFileSystem({
  baseUri,
  fileSystem
}: {
  baseUri: string
  fileSystem: AsyncFileSystem
}): Promise<DmThread[]> {
  try {
    return deserializeDmThreadCollection(await fileSystem.readAsStringAsync(dmThreadsPath(baseUri)))
  } catch (error) {
    if (isMissingFileError(error)) {
      return []
    }

    throw new Error('Corrupt DM thread storage', { cause: error })
  }
}

export async function saveDmThreadsToFileSystem({
  baseUri,
  fileSystem,
  threads
}: {
  baseUri: string
  fileSystem: AsyncFileSystem
  threads: DmThread[]
}): Promise<void> {
  const dir = dmThreadsDir(baseUri)

  await fileSystem.makeDirectoryAsync(dir, { intermediates: true })
  await fileSystem.writeAsStringAsync(
    `${dir}/${DM_THREADS_FILE}`,
    JSON.stringify(serializeDmThreadCollection(threads))
  )
}

function serializeDmThreadCollection(threads: DmThread[]): SerializedDmThreadCollection {
  return {
    version: DM_THREADS_COLLECTION_VERSION,
    threads: threads.map((thread) => serializeDmThread(thread))
  }
}

function deserializeDmThreadCollection(stored: string | SerializedDmThreadCollection): DmThread[] {
  const value = typeof stored === 'string' ? JSON.parse(stored) : stored

  if (value?.version !== DM_THREADS_COLLECTION_VERSION) {
    throw new Error('Unsupported DM thread collection version')
  }

  if (!Array.isArray(value.threads)) {
    throw new Error('DM thread collection is required')
  }

  return (value.threads as SerializedDmThread[]).map((thread) => deserializeDmThread(thread))
}

function dmThreadsPath(baseUri: string): string {
  return `${dmThreadsDir(baseUri)}/${DM_THREADS_FILE}`
}

function dmThreadsDir(baseUri: string): string {
  if (!baseUri) {
    throw new Error('App storage directory is unavailable')
  }

  return `${baseUri.replace(/\/+$/, '')}/kepos/dm`
}

function isMissingFileError(error: unknown): boolean {
  return error instanceof Error && /not found|no such file|enoent/i.test(error.message)
}
