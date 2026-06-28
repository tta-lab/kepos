export function createDirectMessageSession({ localProfileId, nick }) {
  return {
    localProfileId: cleanRequiredString(localProfileId, 'Local profile id is required'),
    nick: nick?.trim() || 'anon',
    messages: [],
    seenMessageIds: new Set()
  }
}

export function restoreDirectMessageSession({ localProfileId, messages = [], nick }) {
  let session = createDirectMessageSession({ localProfileId, nick })

  for (const message of messages) {
    session = appendDirectMessage(session, normalizeStoredDirectMessage(message))
  }

  return session
}

export function appendLocalDirectMessage(session, { id, toProfileId, text, at = Date.now() }) {
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

export function appendRemoteDirectMessage(session, message) {
  if (message?.toProfileId !== session.localProfileId) {
    return session
  }

  return appendDirectMessage(session, {
    ...message,
    direction: 'in'
  })
}

export function appendLocalSignedDirectMessage(session, message, { remoteProfileId }) {
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

export function appendRemoteSignedDirectMessage(session, message) {
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

export function appendLocalMessageRequest(session, request) {
  return appendDirectMessage(session, normalizeMessageRequest(request, 'out'))
}

export function appendRemoteMessageRequest(session, request) {
  if (request?.toProfileId !== session.localProfileId) {
    return session
  }

  return appendDirectMessage(session, normalizeMessageRequest(request, 'in'))
}

export function dismissDirectMessage(session, { id }) {
  const cleanId = cleanRequiredString(id, 'Direct message id is required')

  return {
    ...session,
    messages: session.messages.filter((message) => message.id !== cleanId)
  }
}

function appendDirectMessage(session, message) {
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

function normalizeMessageRequest(request, direction) {
  const id = cleanRequiredString(request?.requestId, 'Request id is required')
  const createdAt = request.createdAt || Date.now()

  return {
    ...request,
    id,
    at: createdAt,
    direction,
    text: cleanText(request.text),
    type: 'kepos.message.request.v1'
  }
}

function normalizeSignedDirectMessage(message, direction, { toProfileId }) {
  const id = cleanRequiredString(message?.messageId, 'Message id is required')
  const createdAt = message.createdAt || Date.now()

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

function normalizeStoredDirectMessage(message) {
  const id = cleanRequiredString(
    message?.id || message?.requestId || message?.messageId,
    'Direct message id is required'
  )
  const at = Number.isFinite(message?.at) ? message.at : message?.createdAt || Date.now()

  return {
    ...message,
    id,
    at,
    direction: cleanDirection(message?.direction),
    text: cleanText(message?.text),
    type: cleanRequiredString(message?.type, 'Direct message type is required')
  }
}

function cleanDirection(direction) {
  if (direction === 'in' || direction === 'out') return direction

  throw new Error('Direct message direction is required')
}

function cleanRequiredString(value, message) {
  const cleaned = value?.trim()

  if (!cleaned) {
    throw new Error(message)
  }

  return cleaned
}

function cleanText(text) {
  return text?.trim() || ''
}
