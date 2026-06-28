const DM_SESSION_MESSAGES_KEY_PREFIX = 'kepos.dmSessionMessages.v1'
const DM_SESSION_MESSAGES_VERSION = 1
const DM_SESSION_MESSAGES_FILE_SUFFIX = '.json'
const MESSAGE_REQUEST_TYPE = 'kepos.message.request.v1'

export function loadDmSessionMessagesFromStorage({ ownerProfileId, storage }) {
  const stored = storage?.getItem?.(dmSessionMessagesKey(ownerProfileId))

  if (!stored) return []

  return deserializeDmSessionMessages(stored)
}

export function saveDmSessionMessagesToStorage({ messages, ownerProfileId, storage }) {
  storage?.setItem?.(
    dmSessionMessagesKey(ownerProfileId),
    JSON.stringify(serializeDmSessionMessages(messages))
  )
}

export async function loadDmSessionMessagesFromFileSystem({ baseUri, fileSystem, ownerProfileId }) {
  try {
    return deserializeDmSessionMessages(
      await fileSystem.readAsStringAsync(dmSessionMessagesPath(baseUri, ownerProfileId))
    )
  } catch (error) {
    if (isMissingFileError(error)) return []

    throw new Error('Corrupt DM session message storage', { cause: error })
  }
}

export async function saveDmSessionMessagesToFileSystem({
  baseUri,
  fileSystem,
  messages,
  ownerProfileId
}) {
  const dir = dmSessionMessagesDir(baseUri)

  await fileSystem.makeDirectoryAsync(dir, { intermediates: true })
  await fileSystem.writeAsStringAsync(
    dmSessionMessagesPath(baseUri, ownerProfileId),
    JSON.stringify(serializeDmSessionMessages(messages))
  )
}

function serializeDmSessionMessages(messages = []) {
  return {
    messages: messages.filter(isPersistableSessionMessage).map(serializeSessionMessage),
    version: DM_SESSION_MESSAGES_VERSION
  }
}

function deserializeDmSessionMessages(stored) {
  const value = typeof stored === 'string' ? JSON.parse(stored) : stored

  if (value?.version !== DM_SESSION_MESSAGES_VERSION) {
    throw new Error('Unsupported DM session messages version')
  }

  if (!Array.isArray(value.messages)) {
    throw new Error('DM session messages collection is required')
  }

  return value.messages.map(serializeSessionMessage)
}

function serializeSessionMessage(message) {
  return {
    at: cleanNumber(message?.at || message?.createdAt, 'Direct message time is required'),
    createdAt: cleanNumber(message?.createdAt || message?.at, 'Message request time is required'),
    direction: cleanDirection(message?.direction),
    fromProfileId: cleanRequiredString(message?.fromProfileId, 'Request sender is required'),
    id: cleanRequiredString(message?.id || message?.requestId, 'Request id is required'),
    proof: message?.proof,
    requestId: cleanRequiredString(message?.requestId || message?.id, 'Request id is required'),
    senderEncryptionPublicKey: message?.senderEncryptionPublicKey,
    text: message?.text?.trim() || '',
    toProfileId: cleanRequiredString(message?.toProfileId, 'Request recipient is required'),
    type: MESSAGE_REQUEST_TYPE
  }
}

function isPersistableSessionMessage(message) {
  return message?.type === MESSAGE_REQUEST_TYPE
}

function dmSessionMessagesKey(ownerProfileId) {
  return `${DM_SESSION_MESSAGES_KEY_PREFIX}.${cleanRequiredString(
    ownerProfileId,
    'Owner profile id is required'
  )}`
}

function dmSessionMessagesPath(baseUri, ownerProfileId) {
  return `${dmSessionMessagesDir(baseUri)}/${encodeURIComponent(
    cleanRequiredString(ownerProfileId, 'Owner profile id is required')
  )}${DM_SESSION_MESSAGES_FILE_SUFFIX}`
}

function dmSessionMessagesDir(baseUri) {
  if (!baseUri) {
    throw new Error('App storage directory is unavailable')
  }

  return `${baseUri.replace(/\/+$/, '')}/kepos/dm/session`
}

function cleanDirection(direction) {
  if (direction === 'in' || direction === 'out') return direction

  throw new Error('Direct message direction is required')
}

function cleanNumber(value, message) {
  if (Number.isFinite(value)) return value

  throw new Error(message)
}

function cleanRequiredString(value, message) {
  const cleaned = value?.trim()

  if (!cleaned) throw new Error(message)

  return cleaned
}

function isMissingFileError(error) {
  return error instanceof Error && /not found|no such file|enoent/i.test(error.message)
}
