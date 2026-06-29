type DesktopStorageEnv = {
  KEPOS_DESKTOP_STORAGE_BASE_PATH?: string
}

type DesktopStorageGlobalScope = {
  keposDesktopConfig?: {
    storageBasePath?: string | null
  }
} & object

export function getDesktopStorageBasePath({
  env = getProcessEnv(),
  globalScope = globalThis as DesktopStorageGlobalScope
}: {
  env?: DesktopStorageEnv
  globalScope?: DesktopStorageGlobalScope
} = {}): string | null {
  return (
    globalScope.keposDesktopConfig?.storageBasePath || env.KEPOS_DESKTOP_STORAGE_BASE_PATH || null
  )
}

function getProcessEnv(): DesktopStorageEnv {
  return (globalThis as { process?: { env?: DesktopStorageEnv } }).process?.env || {}
}
