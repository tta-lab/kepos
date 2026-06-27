import { formatDesktopMessageRequestTitle } from './desktop-people-view-model.js'

export function createDesktopDirectMessageListViewModel({
  messages = [],
  shortenProfileId = (profileId) => profileId
}) {
  return messages.map((message) => ({
    actions: getDirectMessageActions(message),
    className: `item ${message.direction === 'out' ? 'outgoing' : 'incoming'}`,
    meta: formatDirectMessageMeta(message, { shortenProfileId }),
    text: message.text
  }))
}

function getDirectMessageActions(message) {
  if (message.type !== 'kepos.message.request.v1' || message.direction !== 'in') {
    return null
  }

  return {
    acceptMessage: message,
    ignoreMessage: message
  }
}

function formatDirectMessageMeta(message, { shortenProfileId }) {
  if (message.type === 'kepos.message.request.v1') {
    return message.direction === 'out'
      ? 'You asked someone to start a DM'
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

function displayDirectPeer(profileId, { displayName = '', shortenProfileId }) {
  return displayName?.trim() || `Profile ${shortenProfileId(profileId)}`
}
