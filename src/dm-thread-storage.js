import { deserializeDmThread, serializeDmThread } from './dm-thread.ts'

const DM_THREADS_COLLECTION_VERSION = 1
const DM_THREADS_KEY = 'kepos.dmThreads.v1'
const DM_THREADS_FILE = 'threads.json'

export function loadDmThreadsFromStorage({ ownerProfileId, storage }) {
  void ownerProfileId
  const stored = storage?.getItem?.(DM_THREADS_KEY)

  if (!stored) {
    return []
  }

  return deserializeDmThreadCollection(stored)
}

export function saveDmThreadsToStorage({ ownerProfileId, storage, threads }) {
  void ownerProfileId
  storage?.setItem?.(DM_THREADS_KEY, JSON.stringify(serializeDmThreadCollection(threads)))
}

export async function loadDmThreadsFromFileSystem({ baseUri, fileSystem }) {
  try {
    return deserializeDmThreadCollection(await fileSystem.readAsStringAsync(dmThreadsPath(baseUri)))
  } catch (error) {
    if (isMissingFileError(error)) {
      return []
    }

    throw new Error('Corrupt DM thread storage', { cause: error })
  }
}

export async function saveDmThreadsToFileSystem({ baseUri, fileSystem, threads }) {
  const dir = dmThreadsDir(baseUri)

  await fileSystem.makeDirectoryAsync(dir, { intermediates: true })
  await fileSystem.writeAsStringAsync(
    `${dir}/${DM_THREADS_FILE}`,
    JSON.stringify(serializeDmThreadCollection(threads))
  )
}

function serializeDmThreadCollection(threads) {
  return {
    version: DM_THREADS_COLLECTION_VERSION,
    threads: threads.map((thread) => serializeDmThread(thread))
  }
}

function deserializeDmThreadCollection(stored) {
  const value = typeof stored === 'string' ? JSON.parse(stored) : stored

  if (value?.version !== DM_THREADS_COLLECTION_VERSION) {
    throw new Error('Unsupported DM thread collection version')
  }

  if (!Array.isArray(value.threads)) {
    throw new Error('DM thread collection is required')
  }

  return value.threads.map((thread) => deserializeDmThread(thread))
}

function dmThreadsPath(baseUri) {
  return `${dmThreadsDir(baseUri)}/${DM_THREADS_FILE}`
}

function dmThreadsDir(baseUri) {
  if (!baseUri) {
    throw new Error('App storage directory is unavailable')
  }

  return `${baseUri.replace(/\/+$/, '')}/kepos/dm`
}

function isMissingFileError(error) {
  return error instanceof Error && /not found|no such file|enoent/i.test(error.message)
}
