import {
  DESKTOP_COMMANDS,
  isDesktopCommand,
  type DesktopCommand
} from './desktop-command-vocabulary.ts'

export type DesktopCommandHandler = (payload?: unknown) => unknown | Promise<unknown>

export type DesktopCommandRegistry = {
  commands: readonly DesktopCommand[]
  dispatch(command: string, payload?: unknown): Promise<unknown>
}

export function createDesktopCommandRegistry({
  handlers
}: {
  handlers: Partial<Record<DesktopCommand, DesktopCommandHandler>>
}): DesktopCommandRegistry {
  for (const command of DESKTOP_COMMANDS) {
    if (typeof handlers[command] !== 'function') {
      throw new Error(`Missing desktop command handler: ${command}`)
    }
  }

  return {
    commands: DESKTOP_COMMANDS,
    async dispatch(command, payload) {
      if (!isDesktopCommand(command)) {
        throw new Error(`Unknown desktop command: ${command}`)
      }

      return await handlers[command]?.(payload)
    }
  }
}
