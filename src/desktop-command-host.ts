import { DESKTOP_COMMANDS } from './desktop-command-vocabulary.ts'
import { createDesktopCommandRegistry } from './desktop-command-registry.ts'
import type { DesktopCommand } from './desktop-command-vocabulary.ts'
import type { DesktopCommandRegistry } from './desktop-command-registry.ts'

type DesktopCommandAction = (payload?: unknown) => unknown | Promise<unknown>
type DesktopCommandActions = Record<DesktopCommand, DesktopCommandAction>
type CommandPayload = Record<string, unknown>

export function createDesktopCommandHost({
  actions: rawActions
}: {
  actions: Partial<DesktopCommandActions>
}): DesktopCommandRegistry {
  for (const command of DESKTOP_COMMANDS) {
    if (typeof rawActions?.[command] !== 'function') {
      throw new Error(`Missing desktop command action: ${command}`)
    }
  }

  const actions = rawActions as DesktopCommandActions

  return createDesktopCommandRegistry({
    handlers: {
      acceptMessageRequest: (payload) => {
        const { message } = readCommandPayload(payload)
        if (message) return actions.acceptMessageRequest(message)
      },
      allowContactRequests: (payload) => {
        const { profileId } = readCommandPayload(payload)
        if (profileId) return actions.allowContactRequests(profileId)
      },
      commentTreehole: (payload) => actions.commentTreehole(readCommandPayload(payload)),
      enterContactHome: (payload) => {
        const { profileId } = readCommandPayload(payload)
        if (profileId) return actions.enterContactHome({ profileId })
      },
      ignoreMessageRequest: (payload) => {
        const { message, profileId } = readCommandPayload(payload)
        return actions.ignoreMessageRequest({ message, profileId })
      },
      joinHome: (payload) => actions.joinHome(readCommandPayload(payload)),
      joinHomeUri: (payload) => actions.joinHomeUri(readCommandPayload(payload)),
      leaveHome: () => actions.leaveHome(),
      likeTreehole: (payload) => {
        const { postId } = readCommandPayload(payload)
        if (postId) return actions.likeTreehole(postId)
      },
      markDmThreadRead: (payload) => actions.markDmThreadRead(readCommandPayload(payload)),
      postTreehole: (payload) => actions.postTreehole(readCommandPayload(payload)),
      revokeContact: (payload) => {
        const { profileId } = readCommandPayload(payload)
        if (profileId) return actions.revokeContact(profileId)
      },
      sendDmMessage: (payload) => actions.sendDmMessage(readCommandPayload(payload)),
      sendHomeMessage: (payload) => actions.sendHomeMessage(readCommandPayload(payload)),
      sendMessageRequest: () => actions.sendMessageRequest(),
      prepareProfileRequestTarget: (payload) =>
        actions.prepareProfileRequestTarget(readCommandPayload(payload)),
      updateAvatarMedia: (payload) => actions.updateAvatarMedia(readCommandPayload(payload)),
      updateAvatarUri: (payload) => actions.updateAvatarUri(readCommandPayload(payload)),
      updateDisplayName: (payload) => actions.updateDisplayName(readCommandPayload(payload))
    }
  })
}

function readCommandPayload(payload: unknown): CommandPayload {
  return payload && typeof payload === 'object' ? (payload as CommandPayload) : {}
}
