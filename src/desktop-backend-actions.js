import { DESKTOP_COMMANDS } from './desktop-command-vocabulary.ts'

export function createDesktopBackendActions({
  displayNameActions,
  messageActions,
  messageRequestActions,
  roomActions,
  trustActions
}) {
  const actions = {
    acceptMessageRequest: messageRequestActions?.acceptMessageRequest,
    commentTreehole: messageActions?.commentTreehole,
    ignoreMessageRequest: messageRequestActions?.ignoreMessageRequest,
    joinHome: roomActions?.joinHome,
    joinHomeUri: roomActions?.joinHomeUri,
    leaveHome: roomActions?.leaveHome,
    likeTreehole: messageActions?.likeTreehole,
    postTreehole: messageActions?.postTreehole,
    revokeContact: trustActions?.revokeContact,
    sendDmMessage: messageActions?.sendDmMessage,
    sendHomeMessage: messageActions?.sendHomeMessage,
    sendMessageRequest: messageActions?.sendDmMessage,
    trustProfileUri: trustActions?.trustProfileUri,
    updateDisplayName: displayNameActions?.updateDisplayName
  }

  for (const command of DESKTOP_COMMANDS) {
    if (typeof actions[command] !== 'function') {
      throw new Error(`Missing desktop backend action: ${command}`)
    }
  }

  return actions
}
