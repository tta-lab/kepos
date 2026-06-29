import { createDesktopBackendBridge } from './desktop-backend-bridge.ts'
import { createDesktopBackendRuntime } from './desktop-backend-runtime.js'
import { createDesktopCommandHost } from './desktop-command-host.ts'
import type { DesktopBackendBridge } from './desktop-backend-bridge.ts'
import type { DesktopCommandRegistry } from './desktop-command-registry.ts'

type DesktopRuntimeFacade = {
  closeAll?: () => unknown | Promise<unknown>
  configure?: (context: unknown) => unknown
  dm: unknown
  home: unknown
  treehole: unknown
}

type DesktopRuntimeOptions = Record<string, unknown>

type DesktopBackendRuntimeFactory = (
  options: DesktopRuntimeOptions & {
    emit: (event: string, payload?: unknown) => void
  }
) => DesktopRuntimeFacade

type DesktopBackendBridgeFactory = (options: {
  dispatch: (command: string, payload?: unknown) => unknown | Promise<unknown>
}) => DesktopBackendBridge

type DesktopCommandHostFactory = (options: {
  actions: Record<string, unknown>
}) => DesktopCommandRegistry

export type DesktopLocalBackendHost = {
  bridge: DesktopBackendBridge
  commands: DesktopCommandRegistry
  dmRuntime: unknown
  homeRuntime: unknown
  runtime: DesktopRuntimeFacade
  treeholeRuntime: unknown
}

export function createDesktopLocalBackendHost({
  actions,
  createBackendBridge = createDesktopBackendBridge,
  createBackendRuntime = createDesktopBackendRuntime as DesktopBackendRuntimeFactory,
  createCommandHost = createDesktopCommandHost,
  runtimeOptions = {}
}: {
  actions: Record<string, unknown>
  createBackendBridge?: DesktopBackendBridgeFactory
  createBackendRuntime?: DesktopBackendRuntimeFactory
  createCommandHost?: DesktopCommandHostFactory
  runtimeOptions?: DesktopRuntimeOptions
}): DesktopLocalBackendHost {
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
