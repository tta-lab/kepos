export const DESKTOP_COMMANDS = [
  'acceptMessageRequest',
  'commentTreehole',
  'ignoreMessageRequest',
  'joinHome',
  'joinHomeUri',
  'leaveHome',
  'likeTreehole',
  'postTreehole',
  'revokeContact',
  'sendDmMessage',
  'sendHomeMessage',
  'sendMessageRequest',
  'trustProfileUri',
  'updateDisplayName'
] as const

export const DESKTOP_EVENTS = [
  'contactBookChanged',
  'contextFormDraftChanged',
  'desktopStateChanged',
  'directComposerRecipientChanged',
  'dmMessageReceived',
  'dmThreadChanged',
  'errorReceived',
  'homeMessageReceived',
  'peerCountChanged',
  'shareQrOutputsChanged',
  'statusChanged',
  'transportDebugChanged',
  'treeholeStateChanged'
] as const

export type DesktopCommand = (typeof DESKTOP_COMMANDS)[number]
export type DesktopEvent = (typeof DESKTOP_EVENTS)[number]

const COMMAND_SET = new Set<string>(DESKTOP_COMMANDS)
const EVENT_SET = new Set<string>(DESKTOP_EVENTS)

export function isDesktopCommand(value: string): value is DesktopCommand {
  return COMMAND_SET.has(value)
}

export function isDesktopEvent(value: string): value is DesktopEvent {
  return EVENT_SET.has(value)
}
