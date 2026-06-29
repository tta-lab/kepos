import type { DesktopCommand } from './desktop-command-vocabulary.ts'

type DesktopBackendClient = {
  dispatch(command: DesktopCommand, payload?: unknown): unknown | Promise<unknown>
}

type DesktopCommandDispatcher = {
  dispatch(command: DesktopCommand, payload?: unknown): Promise<void>
  getPendingCommand(): DesktopCommand | null
}

export function createDesktopCommandDispatcher({
  backendClient,
  blockingCommands = [],
  onError,
  onPendingChanged
}: {
  backendClient: DesktopBackendClient
  blockingCommands?: Iterable<DesktopCommand>
  onError: (error: unknown) => void
  onPendingChanged: (command: DesktopCommand | null) => void
}): DesktopCommandDispatcher {
  const blockingCommandSet = new Set(blockingCommands)
  let pendingCommand: DesktopCommand | null = null

  return {
    async dispatch(command, payload) {
      const blocking = blockingCommandSet.has(command)
      if (blocking && pendingCommand) return

      if (blocking) {
        pendingCommand = command
        onPendingChanged(pendingCommand)
      }

      try {
        await backendClient.dispatch(command, payload)
      } catch (error) {
        onError(error)
      } finally {
        if (pendingCommand === command) {
          pendingCommand = null
          onPendingChanged(pendingCommand)
        }
      }
    },
    getPendingCommand() {
      return pendingCommand
    }
  }
}
