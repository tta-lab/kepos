import fs from 'bare-fs'
import path from 'bare-path'
import { createKeyValueFileStorage } from './desktop-file-storage-core.ts'

type DesktopBareFileSystem = {
  existsSync(path: string): boolean
  mkdirSync(path: string, options: { recursive: boolean }): unknown
  readFileSync(path: string, encoding: 'utf8'): string
  writeFileSync(path: string, value: string): unknown
}

export function createDesktopBareFileStorage({
  basePath,
  fileSystem = fs
}: {
  basePath?: string
  fileSystem?: DesktopBareFileSystem
} = {}) {
  return createKeyValueFileStorage({
    basePath,
    fileSystem,
    joinPath: path.join
  })
}
