import fs from 'bare-fs'
import path from 'bare-path'
import { createKeyValueFileStorage } from './desktop-file-storage-core.js'

export function createDesktopBareFileStorage({ basePath, fileSystem = fs } = {}) {
  return createKeyValueFileStorage({
    basePath,
    fileSystem,
    joinPath: path.join
  })
}
