import { mergeDmMessages } from './dm-message-storage.ts'
import { createDmReplicationChannel } from './dm-replication.js'
import { isDmThreadActive } from './dm-thread.ts'

export function createDmThreadRuntime({
  createChannel = createDmReplicationChannel,
  identity,
  loadMessages = () => [],
  localProfileId,
  onMessage = () => {},
  saveMessages = () => {}
}) {
  const threads = new Map()

  async function openThread(thread) {
    if (!isDmThreadActive(thread)) {
      throw new Error('Accepted DM thread is required')
    }

    if (thread.localProfileId !== localProfileId) {
      throw new Error('DM thread does not belong to local profile')
    }

    await closeThread(thread.threadId)

    const record = {
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

  function sendMessage({ createdAt, messageId, text, threadId }) {
    const record = threads.get(threadId)

    if (!record) {
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

  async function closeThread(threadId) {
    const record = threads.get(threadId)

    if (!record) {
      return
    }

    threads.delete(threadId)
    await record.channel.leave()
  }

  async function closeAll() {
    await Promise.all([...threads.keys()].map((threadId) => closeThread(threadId)))
  }

  function handleIncomingMessage(threadId, message) {
    const record = threads.get(threadId)

    if (!record) {
      return
    }

    persistMessage(record, message)
    onMessage(record.thread, message, 'in')
  }

  function persistMessage(record, message) {
    record.messages = mergeDmMessages(record.messages, [message])
    void Promise.resolve(saveMessages(record.thread, record.messages))
  }

  return {
    closeAll,
    closeThread,
    openThread,
    sendMessage
  }
}
