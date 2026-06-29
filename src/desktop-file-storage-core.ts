const STORAGE_FILE = 'desktop-storage.json'

type SyncFileSystem = {
  existsSync(path: string): boolean
  mkdirSync(path: string, options: { recursive: boolean }): unknown
  readFileSync(path: string, encoding: 'utf8'): string
  writeFileSync(path: string, value: string): unknown
}

type KeyValueFileStorage = {
  clear(): void
  getItem(key: string): string | null
  removeItem(key: string): void
  setItem(key: string, value: string): void
}

export function createKeyValueFileStorage({
  basePath,
  fileSystem,
  joinPath
}: {
  basePath?: string
  fileSystem?: SyncFileSystem
  joinPath?: (basePath: string, fileName: string) => string
} = {}): KeyValueFileStorage {
  if (!basePath) throw new Error('Desktop storage base path is required')
  if (!fileSystem) throw new Error('Desktop storage file system is required')
  if (!joinPath) throw new Error('Desktop storage path joiner is required')

  const checkedBasePath = basePath
  const checkedFileSystem = fileSystem
  const storagePath = joinPath(checkedBasePath, STORAGE_FILE)
  const values = readValues({ fileSystem: checkedFileSystem, storagePath })

  function refresh() {
    values.clear()
    for (const [key, value] of readValues({ fileSystem: checkedFileSystem, storagePath })) {
      values.set(key, value)
    }
  }

  function persist() {
    checkedFileSystem.mkdirSync(checkedBasePath, { recursive: true })
    checkedFileSystem.writeFileSync(storagePath, JSON.stringify(Object.fromEntries(values)))
  }

  return {
    clear() {
      values.clear()
      persist()
    },
    getItem(key) {
      refresh()
      return values.get(key) ?? null
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

function readValues({
  fileSystem,
  storagePath
}: {
  fileSystem: SyncFileSystem
  storagePath: string
}): Map<string, string> {
  if (!fileSystem.existsSync(storagePath)) return new Map()

  const parsed = JSON.parse(fileSystem.readFileSync(storagePath, 'utf8')) as unknown
  if (!parsed || typeof parsed !== 'object') return new Map()

  return new Map(
    Object.entries(parsed).flatMap(([key, value]) =>
      typeof value === 'string' ? [[key, value]] : []
    )
  )
}
