import path from 'node:path'
import fs from 'node:fs'
import { createKeyValueFileStorage } from './desktop-file-storage-core.ts'

type DesktopFileSystem = {
  existsSync(path: string): boolean
  mkdirSync(path: string, options: { recursive: boolean }): unknown
  readFileSync(path: string, encoding: 'utf8'): string
  writeFileSync(path: string, value: string): unknown
}

export function createDesktopFileStorage({
  basePath,
  fs: fileSystem = fs
}: {
  basePath?: string
  fs?: DesktopFileSystem
} = {}) {
  return createKeyValueFileStorage({
    basePath,
    fileSystem,
    joinPath: path.join
  })
}
