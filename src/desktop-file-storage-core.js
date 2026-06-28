const STORAGE_FILE = 'desktop-storage.json'

export function createKeyValueFileStorage({ basePath, fileSystem, joinPath } = {}) {
  if (!basePath) throw new Error('Desktop storage base path is required')
  if (!fileSystem) throw new Error('Desktop storage file system is required')
  if (!joinPath) throw new Error('Desktop storage path joiner is required')

  const storagePath = joinPath(basePath, STORAGE_FILE)
  const values = readValues({ fileSystem, storagePath })

  function refresh() {
    values.clear()
    for (const [key, value] of readValues({ fileSystem, storagePath })) {
      values.set(key, value)
    }
  }

  function persist() {
    fileSystem.mkdirSync(basePath, { recursive: true })
    fileSystem.writeFileSync(storagePath, JSON.stringify(Object.fromEntries(values)))
  }

  return {
    clear() {
      values.clear()
      persist()
    },
    getItem(key) {
      refresh()
      return values.has(key) ? values.get(key) : null
    },
    removeItem(key) {
      refresh()
      values.delete(key)
      persist()
    },
    setItem(key, value) {
      refresh()
      values.set(String(key), String(value))
      persist()
    }
  }
}

function readValues({ fileSystem, storagePath }) {
  if (!fileSystem.existsSync(storagePath)) return new Map()

  const parsed = JSON.parse(fileSystem.readFileSync(storagePath, 'utf8'))
  return new Map(Object.entries(parsed))
}
