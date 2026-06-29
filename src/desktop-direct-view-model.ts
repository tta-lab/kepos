import { formatDesktopMessageRequestTitle } from './desktop-people-view-model.ts'

type ShortenProfileId = (profileId: string) => string

type DesktopDirectMessage = {
  alias?: string
  direction?: string
  fromProfileId?: string
  nick?: string
  text?: string
  toProfileId?: string
  type?: string
}

export type DesktopDirectMessageViewModel = {
  actions: {
    acceptMessage: DesktopDirectMessage
    ignoreMessage: DesktopDirectMessage
  } | null
  className: string
  meta: string
  text?: string
}

export function createDesktopDirectMessageListViewModel({
  messages = [],
  shortenProfileId = (profileId) => profileId
}: {
  messages?: readonly DesktopDirectMessage[]
  shortenProfileId?: ShortenProfileId
}): DesktopDirectMessageViewModel[] {
  return messages.map((message) => ({
    actions: getDirectMessageActions(message),
    className: `item ${message.direction === 'out' ? 'outgoing' : 'incoming'}`,
    meta: formatDirectMessageMeta(message, { shortenProfileId }),
    text: message.text
  }))
}

function getDirectMessageActions(
  message: DesktopDirectMessage
): DesktopDirectMessageViewModel['actions'] {
  if (message.type !== 'kepos.message.request.v1' || message.direction !== 'in') {
    return null
  }

  return {
    acceptMessage: message,
    ignoreMessage: message
  }
}

function formatDirectMessageMeta(
  message: DesktopDirectMessage,
  { shortenProfileId }: { shortenProfileId: ShortenProfileId }
): string {
  if (message.type === 'kepos.message.request.v1') {
    return message.direction === 'out'
      ? 'You asked someone to start a direct chat'
      : formatDesktopMessageRequestTitle({
          ...message,
          alias: message.alias || message.nick || ''
        })
  }

  return message.direction === 'out'
    ? `You to ${displayDirectPeer(message.toProfileId, { shortenProfileId })}`
    : `${displayDirectPeer(message.fromProfileId, {
        displayName: message.nick,
        shortenProfileId
      })} to you`
}

function displayDirectPeer(
  profileId: string | undefined,
  {
    displayName = '',
    shortenProfileId
  }: { displayName?: string; shortenProfileId: ShortenProfileId }
): string {
  return displayName?.trim() || `Profile ${profileId ? shortenProfileId(profileId) : 'unknown'}`
}
