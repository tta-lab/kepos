const ROOM_KEY_PATTERN = /^[0-9a-f]{64}$/

export type ChatDirection = 'in' | 'out'

export type ChatMessage = {
  at: number
  direction?: ChatDirection
  id: string
  nick: string
  text: string
  type: 'chat'
  [key: string]: unknown
}

export type ChatSession = {
  messages: ChatMessage[]
  nick: string
  profileId: string | null
  roomKey: string
  seenMessageIds: Set<string>
}

export function createChatSession({
  roomKey,
  nick,
  profileId = null
}: {
  nick?: string
  profileId?: string | null
  roomKey: string
}): ChatSession {
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

function isRoomKey(value: unknown): value is string {
  return typeof value === 'string' && ROOM_KEY_PATTERN.test(value)
}

export function appendLocalMessage(
  session: ChatSession,
  text: string,
  options: { at?: number; id?: string } = {}
): ChatSession {
  const message: ChatMessage = {
    type: 'chat',
    id: options.id || crypto.randomUUID(),
    nick: session.nick,
    text: text.trim(),
    at: options.at || Date.now(),
    direction: 'out'
  }

  return appendMessage(session, message)
}

export function appendRemoteMessage(session: ChatSession, message: ChatMessage): ChatSession {
  return appendMessage(session, {
    ...message,
    direction: 'in'
  })
}

function appendMessage(session: ChatSession, message: ChatMessage): ChatSession {
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
