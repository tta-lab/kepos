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

  return actions as DesktopBackendActions
}
