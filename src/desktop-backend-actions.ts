import { DESKTOP_COMMANDS } from './desktop-command-vocabulary.ts'
import type { DesktopCommand } from './desktop-command-vocabulary.ts'

type DesktopBackendAction = (payload?: unknown) => unknown | Promise<unknown>
type DesktopBackendActionGroup = Record<string, DesktopBackendAction | undefined>
type DesktopBackendActions = Record<DesktopCommand, DesktopBackendAction>

export function createDesktopBackendActions({
  displayNameActions,
  messageActions,
  messageRequestActions,
  roomActions,
  trustActions
}: {
  displayNameActions?: DesktopBackendActionGroup
  messageActions?: DesktopBackendActionGroup
  messageRequestActions?: DesktopBackendActionGroup
  roomActions?: DesktopBackendActionGroup
  trustActions?: DesktopBackendActionGroup
}): DesktopBackendActions {
  const actions = {
    acceptMessageRequest: messageRequestActions?.acceptMessageRequest,
    allowContactRequests: trustActions?.allowContactRequests,
    commentTreehole: messageActions?.commentTreehole,
    enterContactHome: roomActions?.enterContactHome,
    ignoreMessageRequest: messageRequestActions?.ignoreMessageRequest,
    joinHome: roomActions?.joinHome,
    joinHomeUri: roomActions?.joinHomeUri,
    leaveHome: roomActions?.leaveHome,
    likeTreehole: messageActions?.likeTreehole,
    markDmThreadRead: messageActions?.markDmThreadRead,
    postTreehole: messageActions?.postTreehole,
    retryOutgoingFriendRequest: messageActions?.retryOutgoingFriendRequest,
    revokeContact: trustActions?.revokeContact,
    sendDmMessage: messageActions?.sendDmMessage,
    sendHomeMessage: messageActions?.sendHomeMessage,
    sendMessageRequest: messageActions?.sendDmMessage,
    prepareProfileRequestTarget: trustActions?.prepareProfileRequestTarget,
    updateAvatarMedia: displayNameActions?.updateAvatarMedia,
    updateAvatarUri: displayNameActions?.updateAvatarUri,
    updateDisplayName: displayNameActions?.updateDisplayName
  }

  for (const command of DESKTOP_COMMANDS) {
    if (typeof actions[command] !== 'function') {
      throw new Error(`Missing desktop backend action: ${command}`)
    }
  }

  return actions as DesktopBackendActions
}
