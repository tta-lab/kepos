import path from 'node:path'
import fs from 'node:fs'
import { createKeyValueFileStorage } from './desktop-file-storage-core.ts'

export function createDesktopFileStorage({ basePath, fs: fileSystem = fs } = {}) {
  return createKeyValueFileStorage({
    basePath,
    fileSystem,
    joinPath: path.join
  })
}
