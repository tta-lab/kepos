export type DirectMessageDirection = 'in' | 'out'

export type DirectMessageEntry = {
  at: number
  direction: DirectMessageDirection
  id: string
  text: string
  type: string
  [key: string]: unknown
}

export type DirectMessageSession = {
  localProfileId: string
  messages: DirectMessageEntry[]
  nick: string
  seenMessageIds: Set<string>
}

type DirectMessageRecord = Record<string, unknown>

export function createDirectMessageSession({
  localProfileId,
  nick
}: {
  localProfileId: string
  nick?: string
}): DirectMessageSession {
  return {
    localProfileId: cleanRequiredString(localProfileId, 'Local profile id is required'),
    nick: nick?.trim() || 'anon',
    messages: [],
    seenMessageIds: new Set()
  }
}

export function restoreDirectMessageSession({
  localProfileId,
  messages = [],
  nick
}: {
  localProfileId: string
  messages?: DirectMessageRecord[]
  nick?: string
}): DirectMessageSession {
  let session = createDirectMessageSession({ localProfileId, nick })

  for (const message of messages) {
    session = appendDirectMessage(session, normalizeStoredDirectMessage(message))
  }

  return session
}

export function appendLocalDirectMessage(
  session: DirectMessageSession,
  {
    id,
    toProfileId,
    text,
    at = Date.now()
  }: {
    at?: number
    id: string
    text?: string
    toProfileId: string
  }
): DirectMessageSession {
  return appendDirectMessage(session, {
    type: 'dm',
    id,
    fromProfileId: session.localProfileId,
    toProfileId: cleanRequiredString(toProfileId, 'Recipient profile id is required'),
    nick: session.nick,
    text: cleanText(text),
    at,
    direction: 'out'
  })
}

export function appendRemoteDirectMessage(
  session: DirectMessageSession,
  message: DirectMessageRecord
): DirectMessageSession {
  if (message?.toProfileId !== session.localProfileId) {
    return session
  }

  return appendDirectMessage(session, {
    ...message,
    at: cleanOptionalNumber(message.at) || Date.now(),
    direction: 'in',
    id: cleanRequiredString(message.id, 'Direct message id is required'),
    text: cleanText(message.text),
    type: cleanRequiredString(message.type, 'Direct message type is required')
  })
}

export function appendLocalSignedDirectMessage(
  session: DirectMessageSession,
  message: DirectMessageRecord,
  { remoteProfileId }: { remoteProfileId: string }
): DirectMessageSession {
  if (message?.fromProfileId !== session.localProfileId) {
    return session
  }

  return appendDirectMessage(
    session,
    normalizeSignedDirectMessage(message, 'out', {
      toProfileId: cleanRequiredString(remoteProfileId, 'Remote profile id is required')
    })
  )
}

export function appendRemoteSignedDirectMessage(
  session: DirectMessageSession,
  message: DirectMessageRecord
): DirectMessageSession {
  if (message?.fromProfileId === session.localProfileId) {
    return session
  }

  return appendDirectMessage(
    session,
    normalizeSignedDirectMessage(message, 'in', {
      toProfileId: session.localProfileId
    })
  )
}

export function appendLocalMessageRequest(
  session: DirectMessageSession,
  request: DirectMessageRecord
): DirectMessageSession {
  return appendDirectMessage(session, normalizeMessageRequest(request, 'out'))
}

export function appendRemoteMessageRequest(
  session: DirectMessageSession,
  request: DirectMessageRecord
): DirectMessageSession {
  if (request?.toProfileId !== session.localProfileId) {
    return session
  }

  return appendDirectMessage(session, normalizeMessageRequest(request, 'in'))
}

export function dismissDirectMessage(
  session: DirectMessageSession,
  { id }: { id: string }
): DirectMessageSession {
  const cleanId = cleanRequiredString(id, 'Direct message id is required')

  return {
    ...session,
    messages: session.messages.filter((message) => message.id !== cleanId)
  }
}

export function hasOutgoingMessageRequest(
  session: DirectMessageSession | null | undefined,
  {
    remoteProfileId,
    requestId
  }: {
    remoteProfileId?: string
    requestId?: string
  }
): boolean {
  const cleanRemoteProfileId = cleanOptionalString(remoteProfileId)
  const cleanRequestId = cleanOptionalString(requestId)

  if (!session || !cleanRemoteProfileId || !cleanRequestId) {
    return false
  }

  return session.messages.some(
    (message) =>
      message.type === 'kepos.message.request.v1' &&
      message.direction === 'out' &&
      message.requestId === cleanRequestId &&
      message.toProfileId === cleanRemoteProfileId
  )
}

function appendDirectMessage(
  session: DirectMessageSession,
  message: DirectMessageEntry
): DirectMessageSession {
  if (!message.id || !message.text || session.seenMessageIds.has(message.id)) {
    return session
  }

  const seenMessageIds = new Set(session.seenMessageIds)
  seenMessageIds.add(message.id)

  return {
    ...session,
    seenMessageIds,
    messages: [...session.messages, message]
  }
}

function normalizeMessageRequest(
  request: DirectMessageRecord,
  direction: DirectMessageDirection
): DirectMessageEntry {
  const id = cleanRequiredString(request?.requestId, 'Request id is required')
  const createdAt = cleanOptionalNumber(request.createdAt) || Date.now()

  return {
    ...request,
    id,
    at: createdAt,
    direction,
    text: cleanText(request.text),
    type: 'kepos.message.request.v1'
  }
}

function normalizeSignedDirectMessage(
  message: DirectMessageRecord,
  direction: DirectMessageDirection,
  { toProfileId }: { toProfileId: string }
): DirectMessageEntry {
  const id = cleanRequiredString(message?.messageId, 'Message id is required')
  const createdAt = cleanOptionalNumber(message.createdAt) || Date.now()

  return {
    ...message,
    at: createdAt,
    direction,
    id,
    text: cleanText(message.text),
    toProfileId,
    type: 'kepos.dm.message.v1'
  }
}

function normalizeStoredDirectMessage(message: DirectMessageRecord): DirectMessageEntry {
  const id = cleanRequiredString(
    message?.id || message?.requestId || message?.messageId,
    'Direct message id is required'
  )
  const at =
    cleanOptionalNumber(message?.at) || cleanOptionalNumber(message?.createdAt) || Date.now()

  return {
    ...message,
    id,
    at,
    direction: cleanDirection(message?.direction),
    text: cleanText(message?.text),
    type: cleanRequiredString(message?.type, 'Direct message type is required')
  }
}

function cleanDirection(direction: unknown): DirectMessageDirection {
  if (direction === 'in' || direction === 'out') return direction

  throw new Error('Direct message direction is required')
}

function cleanRequiredString(value: unknown, message: string): string {
  const cleaned = typeof value === 'string' ? value.trim() : ''

  if (!cleaned) {
    throw new Error(message)
  }

  return cleaned
}

function cleanText(text: unknown): string {
  return typeof text === 'string' ? text.trim() : ''
}

function cleanOptionalString(value: unknown): string | null {
  const cleaned = typeof value === 'string' ? value.trim() : ''
  return cleaned || null
}

function cleanOptionalNumber(value: unknown): number | null {
  return Number.isFinite(value) ? (value as number) : null
}
