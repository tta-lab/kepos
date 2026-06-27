export function createDesktopCommandDispatcher({
  backendClient,
  blockingCommands = [],
  onError,
  onPendingChanged
}) {
  const blockingCommandSet = new Set(blockingCommands)
  let pendingCommand = null

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
