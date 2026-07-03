import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  ANDROID_APP_ID,
  CONFIRM_DELETE_FLAG,
  SMOKE_STORAGE_MARKER,
  createCleanupPlan
} from '../scripts/cleanup-dev-storage.mjs'

test('storage cleanup defaults to dry run and only selects marked known smoke temp dirs', () => {
  const plan = createCleanupPlan({
    argv: ['--desktop-smoke-tmp'],
    tmpDir: '/tmp',
    tmpEntries: [
      {
        hasSmokeStorageMarker: true,
        name: 'kepos-desktop-smoke-a',
        path: '/tmp/kepos-desktop-smoke-a'
      },
      {
        hasSmokeStorageMarker: true,
        name: 'kepos-two-device-desktop-b',
        path: '/tmp/kepos-two-device-desktop-b'
      },
      {
        hasSmokeStorageMarker: false,
        name: 'kepos-physical-qr-desktop-c',
        path: '/tmp/kepos-physical-qr-desktop-c'
      },
      {
        hasSmokeStorageMarker: true,
        name: 'kepos-not-a-smoke-dir',
        path: '/tmp/kepos-not-a-smoke-dir'
      }
    ]
  })

  assert.equal(plan.apply, false)
  assert.equal(plan.confirmed, false)
  assert.deepEqual(
    plan.actions.map((action) => action.path),
    ['/tmp/kepos-desktop-smoke-a', '/tmp/kepos-two-device-desktop-b']
  )
})

test('storage cleanup exports the smoke storage marker filename', () => {
  assert.equal(SMOKE_STORAGE_MARKER, '.kepos-smoke-storage')
})

test('storage cleanup rejects destructive mode without explicit confirmation', () => {
  assert.throws(
    () =>
      createCleanupPlan({
        argv: ['--desktop-smoke-tmp', '--apply'],
        tmpDir: '/tmp',
        tmpEntries: [{ name: 'kepos-desktop-smoke-a', path: '/tmp/kepos-desktop-smoke-a' }]
      }),
    new RegExp(CONFIRM_DELETE_FLAG)
  )
})

test('android cleanup plans scoped adb pm clear command with optional serial', () => {
  const plan = createCleanupPlan({
    argv: ['--android-app-data', '--apply', CONFIRM_DELETE_FLAG],
    env: { ANDROID_SERIAL: 'device-1' }
  })

  assert.deepEqual(plan.actions, [
    {
      args: ['-s', 'device-1', 'shell', 'pm', 'clear', ANDROID_APP_ID],
      destructive: true,
      kind: 'adb-pm-clear'
    }
  ])
})

test('desktop user data cleanup only targets Kepos-owned subdirectories', () => {
  const plan = createCleanupPlan({
    argv: [
      '--desktop-user-data-path',
      '/Users/neil/Library/Application Support/Kepos',
      '--apply',
      CONFIRM_DELETE_FLAG
    ]
  })

  assert.deepEqual(
    plan.actions.map((action) => action.path),
    [
      '/Users/neil/Library/Application Support/Kepos/kepos',
      '/Users/neil/Library/Application Support/Kepos/pear-storage',
      '/Users/neil/Library/Application Support/Kepos/pear-runtime'
    ]
  )
})

test('package exposes storage cleanup command', async () => {
  const packageJson = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8')
  )

  assert.equal(packageJson.scripts['storage:cleanup'], 'node scripts/cleanup-dev-storage.mjs')
})
