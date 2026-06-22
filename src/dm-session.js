export function createDirectMessageSession({ localProfileId, nick }) {
  return {
    localProfileId: cleanRequiredString(localProfileId, 'Local profile id is required'),
    nick: nick?.trim() || 'anon',
    messages: [],
    seenMessageIds: new Set()
  }
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
