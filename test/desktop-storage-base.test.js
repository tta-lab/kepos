import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { getDesktopStorageBasePath } from '../src/desktop-storage-base.js'

test('desktop storage base prefers preload config over environment', () => {
  const storageBasePath = getDesktopStorageBasePath({
    env: { KEPOS_DESKTOP_STORAGE_BASE_PATH: '/env/kepos/v1' },
    globalScope: {
      keposDesktopConfig: {
        storageBasePath: '/preload/kepos/v1'
      }
    }
  })

  assert.equal(storageBasePath, '/preload/kepos/v1')
})

test('desktop storage base falls back to electron environment', () => {
  const storageBasePath = getDesktopStorageBasePath({
    env: { KEPOS_DESKTOP_STORAGE_BASE_PATH: '/env/kepos/v1' },
    globalScope: {}
  })

  assert.equal(storageBasePath, '/env/kepos/v1')
})

test('desktop electron main and preload expose app-private storage base path', async () => {
  const main = await readFile(new URL('../desktop/electron/main.cjs', import.meta.url), 'utf8')
  const preload = await readFile(
    new URL('../desktop/electron/preload.cjs', import.meta.url),
    'utf8'
  )
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const localProfile = await readFile(
    new URL('../desktop/local-profile.js', import.meta.url),
    'utf8'
  )

  assert.match(main, /KEPOS_DESKTOP_STORAGE_BASE_PATH/)
  assert.match(main, /path\.join\(app\.getPath\('userData'\), 'kepos', 'v1'\)/)
  assert.match(preload, /exposeDesktopApi\('keposDesktopConfig'/)
  assert.match(preload, /storageBasePath: process\.env\.KEPOS_DESKTOP_STORAGE_BASE_PATH/)
  assert.match(controller, /getLocalProfileApi/)
  assert.match(localProfile, /getDesktopStorageBasePath/)
  assert.match(localProfile, /return getDesktopStorageBasePath\(\)/)
})
