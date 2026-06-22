const ROOM_KEY_PATTERN = /^[0-9a-f]{64}$/

export function createChatSession({ roomKey, nick, profileId = null }) {
  if (!isRoomKey(roomKey)) {
    throw new Error('Invalid room key')
  }

  return {
    roomKey,
    profileId: profileId?.trim() || null,
    nick: nick?.trim() || 'anon',
    messages: [],
    seenMessageIds: new Set()
  }
}

function isRoomKey(value) {
  return typeof value === 'string' && ROOM_KEY_PATTERN.test(value)
}

export function appendLocalMessage(session, text, options = {}) {
  const message = {
    type: 'chat',
    id: options.id || crypto.randomUUID(),
    nick: session.nick,
    text: text.trim(),
    at: options.at || Date.now(),
    direction: 'out'
  }

  return appendMessage(session, message)
}

export function appendRemoteMessage(session, message) {
  return appendMessage(session, {
    ...message,
    direction: 'in'
  })
}

function appendMessage(session, message) {
  if (!message.text || session.seenMessageIds.has(message.id)) {
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
