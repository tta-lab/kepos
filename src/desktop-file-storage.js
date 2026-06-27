import path from 'node:path'
import fs from 'node:fs'

const STORAGE_FILE = 'desktop-storage.json'

export function createDesktopFileStorage({ basePath, fs: fileSystem = fs } = {}) {
  if (!basePath) throw new Error('Desktop storage base path is required')

  const storagePath = path.join(basePath, STORAGE_FILE)
  const values = readValues({ fileSystem, storagePath })

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
      return values.has(key) ? values.get(key) : null
    },
    removeItem(key) {
      values.delete(key)
      persist()
    },
    setItem(key, value) {
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
