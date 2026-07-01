import { writeFile } from 'node:fs/promises'
import path from 'node:path'

export const SMOKE_STORAGE_MARKER = '.kepos-smoke-storage'

export async function markSmokeStorage(directory) {
  await writeFile(
    path.join(directory, SMOKE_STORAGE_MARKER),
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        owner: 'kepos-smoke'
      },
      null,
      2
    )
  )
}
