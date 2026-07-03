import { mergeDmMessages } from './dm-message-storage.ts'
import { verifySignedDmMessage } from './dm-message.ts'
import { createDmReplicationChannel } from './dm-replication.ts'
import { isDmThreadActive } from './dm-thread.ts'
import type { DmMessage } from './dm-message.ts'
import type { DmThread } from './dm-thread.ts'
import type { SigningIdentity } from './signed-record.ts'

export function createDmThreadRuntime({
  createChannel = createDmReplicationChannel as unknown as DmReplicationChannelFactory,
  identity,
  loadMessages = () => [],
  localProfileId,
  onMessage = () => {},
  saveMessages = () => {}
}: DmThreadRuntimeOptions): DmThreadRuntime {
  const threads = new Map<string, DmThreadRecord>()

  async function openThread(thread: DmThread) {
    if (!isDmThreadActive(thread)) {
      throw new Error('Accepted DM thread is required')
    }

    if (thread.localProfileId !== localProfileId) {
      throw new Error('DM thread does not belong to local profile')
    }

    await closeThread(thread.threadId)

    const record: DmThreadRecord = {
      channel: null,
      messages: mergeDmMessages([], await loadMessages(thread)),
      thread
    }
    const channel = createChannel({
      identity,
      localProfileId,
      onMessage: (message) => handleIncomingMessage(thread.threadId, message)
    })
    record.channel = channel
    threads.set(thread.threadId, record)

    await channel.joinThread(thread)
    for (const message of record.messages) {
      onMessage(thread, message, message.fromProfileId === localProfileId ? 'out' : 'in')
    }
    channel.broadcastMessages(record.messages)
  }

  function sendMessage({
    createdAt,
    messageId,
    text,
    threadId
  }: {
    createdAt?: number
    messageId: string
    text: string
    threadId: string
  }): DmMessage {
    const record = threads.get(threadId)

    if (!record?.channel) {
      throw new Error('DM thread is not open')
    }

    const message = record.channel.sendMessage({
      createdAt,
      messageId,
      text,
      threadId
    })
    persistMessage(record, message)
    onMessage(record.thread, message, 'out')
    return message
  }

  function receiveMessage(message: unknown): boolean {
    const threadId = readMessageThreadId(message)
    const record = threadId ? threads.get(threadId) : undefined

    if (
      !record ||
      !shouldAcceptRemoteMessage(record, message) ||
      hasMessage(record, message.messageId)
    ) {
      return false
    }

    persistMessage(record, message)
    onMessage(record.thread, message, 'in')
    return true
  }

  async function closeThread(threadId: string): Promise<void> {
    const record = threads.get(threadId)

    if (!record) {
      return
    }

    threads.delete(threadId)
    await record.channel?.leave()
  }

  async function closeAll(): Promise<void> {
    await Promise.all([...threads.keys()].map((threadId) => closeThread(threadId)))
  }

  function handleIncomingMessage(threadId: string, message: unknown): void {
    const record = threads.get(threadId)

    if (
      !record ||
      !shouldAcceptRemoteMessage(record, message) ||
      hasMessage(record, message.messageId)
    ) {
      return
    }

    persistMessage(record, message)
    onMessage(record.thread, message, 'in')
  }

  function shouldAcceptRemoteMessage(
    record: DmThreadRecord,
    message: unknown
  ): message is DmMessage {
    if (!isRecord(message)) return false

    return (
      message.threadId === record.thread.threadId &&
      message.fromProfileId === record.thread.remoteProfileId &&
      message.fromProfileId !== localProfileId &&
      verifySignedDmMessage(message as DmMessage)
    )
  }

  function hasMessage(record: DmThreadRecord, messageId: unknown): boolean {
    return Boolean(messageId && record.messages.some((message) => message.messageId === messageId))
  }

  function persistMessage(record: DmThreadRecord, message: DmMessage): void {
    record.messages = mergeDmMessages(record.messages, [message])
    void Promise.resolve(saveMessages(record.thread, record.messages))
  }

  return {
    closeAll,
    closeThread,
    openThread,
    receiveMessage,
    sendMessage
  }
}

type DmMessageDirection = 'in' | 'out'

type DmReplicationChannel = {
  broadcastMessages(messages: DmMessage[]): unknown
  joinThread(thread: DmThread): unknown | Promise<unknown>
  leave(): unknown | Promise<unknown>
  sendMessage(payload: {
    createdAt?: number
    messageId: string
    text: string
    threadId: string
  }): DmMessage
}

type DmReplicationChannelFactory = (options: {
  identity: SigningIdentity
  localProfileId: string
  onMessage(message: unknown): void
}) => DmReplicationChannel

type DmThreadRecord = {
  channel: DmReplicationChannel | null
  messages: DmMessage[]
  thread: DmThread
}

export type DmThreadRuntimeOptions = {
  createChannel?: DmReplicationChannelFactory
  identity: SigningIdentity
  loadMessages?: (thread: DmThread) => DmMessage[] | Promise<DmMessage[]>
  localProfileId: string
  onMessage?: (thread: DmThread, message: DmMessage, direction: DmMessageDirection) => void
  saveMessages?: (thread: DmThread, messages: DmMessage[]) => unknown | Promise<unknown>
}

export type DmThreadRuntime = {
  closeAll(): Promise<void>
  closeThread(threadId: string): Promise<void>
  openThread(thread: DmThread): Promise<void>
  receiveMessage(message: unknown): boolean
  sendMessage(payload: {
    createdAt?: number
    messageId: string
    text: string
    threadId: string
  }): DmMessage
}

function readMessageThreadId(message: unknown): string | null {
  if (!isRecord(message)) return null

  return typeof message.threadId === 'string' ? message.threadId : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object')
}
