export function createDesktopHomeChatViewModel({ messages = [] } = {}) {
  return messages.map((message) => ({
    className: `item ${message.direction === 'out' ? 'outgoing' : 'incoming'}`,
    meta: message.nick,
    text: message.text
  }))
}
