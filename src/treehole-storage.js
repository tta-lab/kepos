export function createTreeholeStoragePath({ basePath, bootstrapKey = null, roomKey }) {
  if (!basePath) {
    throw new Error('Treehole storage base path is required')
  }

  if (!roomKey) {
    throw new Error('Treehole room key is required')
  }

  const suffix = bootstrapKey ? bootstrapKey.slice(0, 16) : 'host'
  return `${normalizeBasePath(basePath)}/kepos-treehole-${roomKey.slice(0, 16)}-${suffix}`
}

function normalizeBasePath(basePath) {
  const path = basePath.startsWith('file://')
    ? decodeURI(basePath.slice('file://'.length))
    : basePath
  return path.replace(/\/+$/, '')
}
