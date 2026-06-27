export function getDesktopStorageBasePath({
  env = globalThis.process?.env || {},
  globalScope = globalThis
} = {}) {
  return (
    globalScope.keposDesktopConfig?.storageBasePath || env.KEPOS_DESKTOP_STORAGE_BASE_PATH || null
  )
}
