import { type DmMessage, verifySignedDmMessage } from './dm-message.ts'

const DM_MESSAGES_COLLECTION_VERSION = 1
const DM_MESSAGES_KEY_PREFIX = 'kepos.dmMessages.v1'
const DM_MESSAGES_FILE_SUFFIX = '.json'

type SyncStorage = {
  getItem(key: string): string | null | undefined
  setItem(key: string, value: string): unknown
}

type AppFileSystem = {
  makeDirectoryAsync(path: string, options: { intermediates: boolean }): unknown | Promise<unknown>
  readAsStringAsync(path: string): string | Promise<string>
  writeAsStringAsync(path: string, value: string): unknown | Promise<unknown>
}

type StoredDmMessages = {
  messages: DmMessage[]
  version: number
}

export function loadDmMessagesFromStorage({
  ownerProfileId,
  storage,
  threadId
}: {
  ownerProfileId: string
  storage: SyncStorage
  threadId: string
}): DmMessage[] {
  const stored = storage?.getItem?.(dmMessagesKey(ownerProfileId, threadId))

  if (!stored) {
    return []
  }

  return deserializeDmMessageCollection(stored, threadId)
}

export function saveDmMessagesToStorage({
  messages,
  ownerProfileId,
  storage,
  threadId
}: {
  messages: DmMessage[]
  ownerProfileId: string
  storage: SyncStorage
  threadId: string
}) {
  storage?.setItem?.(
    dmMessagesKey(ownerProfileId, threadId),
    JSON.stringify(serializeDmMessageCollection(messages, threadId))
  )
}

export async function loadDmMessagesFromFileSystem({
  baseUri,
  fileSystem,
  threadId
}: {
  baseUri: string
  fileSystem: AppFileSystem
  threadId: string
}): Promise<DmMessage[]> {
  try {
    return deserializeDmMessageCollection(
      await fileSystem.readAsStringAsync(dmMessagesPath(baseUri, threadId)),
      threadId
    )
  } catch (error) {
    if (isMissingFileError(error)) {
      return []
    }

    throw new Error('Corrupt DM message storage', { cause: error })
  }
}

export async function saveDmMessagesToFileSystem({
  baseUri,
  fileSystem,
  messages,
  threadId
}: {
  baseUri: string
  fileSystem: AppFileSystem
  messages: DmMessage[]
  threadId: string
}) {
  const dir = dmMessagesDir(baseUri)

  await fileSystem.makeDirectoryAsync(dir, { intermediates: true })
  await fileSystem.writeAsStringAsync(
    dmMessagesPath(baseUri, threadId),
    JSON.stringify(serializeDmMessageCollection(messages, threadId))
  )
}

export function mergeDmMessages(existing: DmMessage[], incoming: DmMessage[]): DmMessage[] {
  const messagesById = new Map<string, DmMessage>()

  for (const message of [...existing, ...incoming]) {
    assertValidMessage(message, message.threadId)
    messagesById.set(message.messageId, message)
  }

  return [...messagesById.values()].sort((left, right) => {
    if (left.createdAt !== right.createdAt) {
      return left.createdAt - right.createdAt
    }

    return left.messageId.localeCompare(right.messageId)
  })
}

function serializeDmMessageCollection(messages: DmMessage[], threadId: string): StoredDmMessages {
  return {
    messages: mergeDmMessages([], messages).map((message) => assertValidMessage(message, threadId)),
    version: DM_MESSAGES_COLLECTION_VERSION
  }
}

function deserializeDmMessageCollection(stored: string | StoredDmMessages, threadId: string) {
  const value = typeof stored === 'string' ? JSON.parse(stored) : stored

  if (value?.version !== DM_MESSAGES_COLLECTION_VERSION) {
    throw new Error('Unsupported DM message collection version')
  }

  if (!Array.isArray(value.messages)) {
    throw new Error('DM message collection is required')
  }

  return mergeDmMessages([], value.messages).map((message) => assertValidMessage(message, threadId))
}

function assertValidMessage(message: DmMessage, threadId: string): DmMessage {
  if (message.threadId !== cleanRequiredString(threadId, 'Thread id is required')) {
    throw new Error('DM message thread mismatch')
  }

  if (!verifySignedDmMessage(message)) {
    throw new Error('Invalid DM message')
  }

  return message
}

function dmMessagesKey(ownerProfileId: string, threadId: string) {
  return `${DM_MESSAGES_KEY_PREFIX}.${cleanRequiredString(
    ownerProfileId,
    'Owner profile id is required'
  )}.${cleanRequiredString(threadId, 'Thread id is required')}`
}

function dmMessagesPath(baseUri: string, threadId: string) {
  return `${dmMessagesDir(baseUri)}/${encodeURIComponent(
    cleanRequiredString(threadId, 'Thread id is required')
  )}${DM_MESSAGES_FILE_SUFFIX}`
}

function dmMessagesDir(baseUri: string) {
  if (!baseUri) {
    throw new Error('App storage directory is unavailable')
  }

  return `${baseUri.replace(/\/+$/, '')}/kepos/dm/messages`
}

function cleanRequiredString(value: string | undefined, message: string): string {
  const cleaned = value?.trim()

  if (!cleaned) {
    throw new Error(message)
  }

  return cleaned
}

function isMissingFileError(error: unknown): boolean {
  return error instanceof Error && /not found|no such file|enoent/i.test(error.message)
}
