import { DESKTOP_COMMANDS } from './desktop-command-vocabulary.ts'
import { createDesktopCommandRegistry } from './desktop-command-registry.ts'

export function createDesktopCommandHost({ actions }) {
  for (const command of DESKTOP_COMMANDS) {
    if (typeof actions?.[command] !== 'function') {
      throw new Error(`Missing desktop command action: ${command}`)
    }
  }

  return createDesktopCommandRegistry({
    handlers: {
      acceptMessageRequest: (payload) => {
        const { message } = readCommandPayload(payload)
        if (message) return actions.acceptMessageRequest(message)
      },
      commentTreehole: (payload) => actions.commentTreehole(readCommandPayload(payload)),
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
      postTreehole: (payload) => actions.postTreehole(readCommandPayload(payload)),
      revokeContact: (payload) => {
        const { profileId } = readCommandPayload(payload)
        if (profileId) return actions.revokeContact(profileId)
      },
      sendDmMessage: (payload) => actions.sendDmMessage(readCommandPayload(payload)),
      sendHomeMessage: (payload) => actions.sendHomeMessage(readCommandPayload(payload)),
      sendMessageRequest: () => actions.sendMessageRequest(),
      trustProfileUri: (payload) => actions.trustProfileUri(readCommandPayload(payload))
    }
  })
}

function readCommandPayload(payload) {
  return payload && typeof payload === 'object' ? payload : {}
}
