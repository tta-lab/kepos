type DesktopHomeMessage = {
  direction?: string
  nick?: string
  text?: string
}

export type DesktopHomeChatMessageViewModel = {
  className: string
  meta?: string
  text?: string
}

export function createDesktopHomeChatViewModel({
  messages = []
}: {
  messages?: readonly DesktopHomeMessage[]
} = {}): DesktopHomeChatMessageViewModel[] {
  return messages.map((message) => ({
    className: `item ${message.direction === 'out' ? 'outgoing' : 'incoming'}`,
    meta: message.nick,
    text: message.text
  }))
}
