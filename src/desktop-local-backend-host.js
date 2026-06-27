import { createDesktopBackendBridge } from './desktop-backend-bridge.ts'
import { createDesktopBackendRuntime } from './desktop-backend-runtime.js'
import { createDesktopCommandHost } from './desktop-command-host.js'

export function createDesktopLocalBackendHost({
  actions,
  createBackendBridge = createDesktopBackendBridge,
  createBackendRuntime = createDesktopBackendRuntime,
  createCommandHost = createDesktopCommandHost,
  runtimeOptions = {}
}) {
  const commands = createCommandHost({ actions })
  const bridge = createBackendBridge({
    dispatch: (command, payload) => commands.dispatch(command, payload)
  })
  const runtime = createBackendRuntime({
    ...runtimeOptions,
    emit: (event, payload) => bridge.emit(event, payload)
  })

  return {
    bridge,
    commands,
    dmRuntime: runtime.dm,
    homeRuntime: runtime.home,
    runtime,
    treeholeRuntime: runtime.treehole
  }
}
