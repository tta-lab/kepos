const DM_SESSION_MESSAGES_KEY_PREFIX = 'kepos.dmSessionMessages.v1'
const DM_SESSION_MESSAGES_VERSION = 1
const DM_SESSION_MESSAGES_FILE_SUFFIX = '.json'
const MESSAGE_REQUEST_TYPE = 'kepos.message.request.v1'

type SyncStorage = {
  getItem?: (key: string) => string | null | undefined
  setItem?: (key: string, value: string) => unknown
}

type AsyncFileSystem = {
  makeDirectoryAsync(path: string, options: { intermediates: boolean }): Promise<unknown> | unknown
  readAsStringAsync(path: string): Promise<string> | string
  writeAsStringAsync(path: string, value: string): Promise<unknown> | unknown
}

export type PersistedDmSessionMessage = {
  at: number
  createdAt: number
  direction: 'in' | 'out'
  fromProfileId: string
  id: string
  proof?: unknown
  requestId: string
  senderEncryptionPublicKey?: unknown
  text: string
  toProfileId: string
  type: typeof MESSAGE_REQUEST_TYPE
}

type RawSessionMessage = Record<string, unknown>

type SerializedDmSessionMessages = {
  messages: RawSessionMessage[]
  version: typeof DM_SESSION_MESSAGES_VERSION
}

export function loadDmSessionMessagesFromStorage({
  ownerProfileId,
  storage
}: {
  ownerProfileId: string
  storage?: SyncStorage | null
}): PersistedDmSessionMessage[] {
  const stored = storage?.getItem?.(dmSessionMessagesKey(ownerProfileId))

  if (!stored) return []

  try {
    return deserializeDmSessionMessages(stored)
  } catch {
    return []
  }
}

export function saveDmSessionMessagesToStorage({
  messages,
  ownerProfileId,
  storage
}: {
  messages: RawSessionMessage[]
  ownerProfileId: string
  storage?: SyncStorage | null
}): void {
  storage?.setItem?.(
    dmSessionMessagesKey(ownerProfileId),
    JSON.stringify(serializeDmSessionMessages(messages))
  )
}

export async function loadDmSessionMessagesFromFileSystem({
  baseUri,
  fileSystem,
  ownerProfileId
}: {
  baseUri: string
  fileSystem: AsyncFileSystem
  ownerProfileId: string
}): Promise<PersistedDmSessionMessage[]> {
  let stored: string

  try {
    stored = await fileSystem.readAsStringAsync(dmSessionMessagesPath(baseUri, ownerProfileId))
  } catch (error) {
    if (isMissingFileError(error)) return []

    throw new Error('Corrupt DM session message storage', { cause: error })
  }

  try {
    return deserializeDmSessionMessages(stored)
  } catch {
    return []
  }
}

export async function saveDmSessionMessagesToFileSystem({
  baseUri,
  fileSystem,
  messages,
  ownerProfileId
}: {
  baseUri: string
  fileSystem: AsyncFileSystem
  messages: RawSessionMessage[]
  ownerProfileId: string
}): Promise<void> {
  const dir = dmSessionMessagesDir(baseUri)

  await fileSystem.makeDirectoryAsync(dir, { intermediates: true })
  await fileSystem.writeAsStringAsync(
    dmSessionMessagesPath(baseUri, ownerProfileId),
    JSON.stringify(serializeDmSessionMessages(messages))
  )
}

function serializeDmSessionMessages(
  messages: RawSessionMessage[] = []
): SerializedDmSessionMessages {
  return {
    messages: messages.filter(isPersistableSessionMessage).map(serializeSessionMessage),
    version: DM_SESSION_MESSAGES_VERSION
  }
}

function deserializeDmSessionMessages(
  stored: string | SerializedDmSessionMessages
): PersistedDmSessionMessage[] {
  const value = typeof stored === 'string' ? JSON.parse(stored) : stored

  if (value?.version !== DM_SESSION_MESSAGES_VERSION) {
    throw new Error('Unsupported DM session messages version')
  }

  if (!Array.isArray(value.messages)) {
    throw new Error('DM session messages collection is required')
  }

  return value.messages.map(serializeSessionMessage)
}

function serializeSessionMessage(message: RawSessionMessage): PersistedDmSessionMessage {
  return {
    at: cleanNumber(message?.at || message?.createdAt, 'Direct message time is required'),
    createdAt: cleanNumber(message?.createdAt || message?.at, 'Message request time is required'),
    direction: cleanDirection(message?.direction),
    fromProfileId: cleanRequiredString(message?.fromProfileId, 'Request sender is required'),
    id: cleanRequiredString(message?.id || message?.requestId, 'Request id is required'),
    proof: message?.proof,
    requestId: cleanRequiredString(message?.requestId || message?.id, 'Request id is required'),
    senderEncryptionPublicKey: message?.senderEncryptionPublicKey,
    text: cleanText(message?.text),
    toProfileId: cleanRequiredString(message?.toProfileId, 'Request recipient is required'),
    type: MESSAGE_REQUEST_TYPE
  }
}

function isPersistableSessionMessage(message: RawSessionMessage): boolean {
  return message?.type === MESSAGE_REQUEST_TYPE
}

function dmSessionMessagesKey(ownerProfileId: string): string {
  return `${DM_SESSION_MESSAGES_KEY_PREFIX}.${cleanRequiredString(
    ownerProfileId,
    'Owner profile id is required'
  )}`
}

function dmSessionMessagesPath(baseUri: string, ownerProfileId: string): string {
  return `${dmSessionMessagesDir(baseUri)}/${encodeURIComponent(
    cleanRequiredString(ownerProfileId, 'Owner profile id is required')
  )}${DM_SESSION_MESSAGES_FILE_SUFFIX}`
}

function dmSessionMessagesDir(baseUri: string): string {
  if (!baseUri) {
    throw new Error('App storage directory is unavailable')
  }

  return `${baseUri.replace(/\/+$/, '')}/kepos/dm/session`
}

function cleanDirection(direction: unknown): 'in' | 'out' {
  if (direction === 'in' || direction === 'out') return direction

  throw new Error('Direct message direction is required')
}

function cleanNumber(value: unknown, message: string): number {
  if (Number.isFinite(value)) return value as number

  throw new Error(message)
}

function cleanRequiredString(value: unknown, message: string): string {
  const cleaned = typeof value === 'string' ? value.trim() : ''

  if (!cleaned) throw new Error(message)

  return cleaned
}

function cleanText(text: unknown): string {
  return typeof text === 'string' ? text.trim() : ''
}

function isMissingFileError(error: unknown): boolean {
  return error instanceof Error && /not found|no such file|enoent/i.test(error.message)
}
