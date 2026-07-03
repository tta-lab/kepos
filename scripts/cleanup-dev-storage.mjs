#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { access, readdir, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { SMOKE_STORAGE_MARKER } from './smoke-storage.mjs'

export const ANDROID_APP_ID = 'io.guion.kepos'
export const CONFIRM_DELETE_FLAG = '--i-understand-this-deletes-kepos-data'
export { SMOKE_STORAGE_MARKER }

const SMOKE_TMP_PREFIXES = [
  'kepos-desktop-smoke-',
  'kepos-desktop-contacts-',
  'kepos-physical-qr-desktop-',
  'kepos-two-device-desktop-',
  'kepos-two-device-'
]

export function createCleanupPlan({
  argv = [],
  env = {},
  tmpDir = os.tmpdir(),
  tmpEntries = []
} = {}) {
  const apply = argv.includes('--apply')
  const confirmed = argv.includes(CONFIRM_DELETE_FLAG)
  if (apply && !confirmed) {
    throw new Error(`Destructive cleanup requires ${CONFIRM_DELETE_FLAG}`)
  }

  const actions = []
  if (argv.includes('--desktop-smoke-tmp')) {
    for (const entry of tmpEntries) {
      if (!isKnownSmokeTmpEntry(entry, tmpDir)) continue
      actions.push({
        destructive: true,
        kind: 'remove-dir',
        path: entry.path
      })
    }
  }

  const desktopUserDataPath = readOptionValue(argv, '--desktop-user-data-path')
  if (desktopUserDataPath) {
    assertSafeDesktopUserDataPath(desktopUserDataPath)
    for (const name of ['kepos', 'pear-storage', 'pear-runtime']) {
      actions.push({
        destructive: true,
        kind: 'remove-dir',
        path: path.join(desktopUserDataPath, name)
      })
    }
  }

  if (argv.includes('--android-app-data')) {
    const args = []
    if (env.ANDROID_SERIAL) args.push('-s', env.ANDROID_SERIAL)
    args.push('shell', 'pm', 'clear', ANDROID_APP_ID)
    actions.push({
      args,
      destructive: true,
      kind: 'adb-pm-clear'
    })
  }

  return {
    actions,
    apply,
    confirmed
  }
}

async function main() {
  const argv = process.argv.slice(2)
  if (argv.includes('--help') || argv.includes('-h')) {
    printHelp()
    return
  }

  const tmpDir = os.tmpdir()
  const tmpEntries = argv.includes('--desktop-smoke-tmp') ? await readTmpEntries(tmpDir) : []
  const plan = createCleanupPlan({
    argv,
    env: process.env,
    tmpDir,
    tmpEntries
  })

  printPlan(plan)
  if (!plan.apply) {
    console.log('\nDry run only. Add --apply and', CONFIRM_DELETE_FLAG, 'to delete data.')
    return
  }

  for (const action of plan.actions) {
    await runAction(action)
  }
}

function isKnownSmokeTmpEntry(entry, tmpDir) {
  if (!entry?.name || !entry?.path) return false
  if (!entry.hasSmokeStorageMarker) return false
  if (!SMOKE_TMP_PREFIXES.some((prefix) => entry.name.startsWith(prefix))) return false
  const relative = path.relative(tmpDir, entry.path)
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative)
}

function readOptionValue(argv, option) {
  const index = argv.indexOf(option)
  if (index === -1) return null
  const value = argv[index + 1]
  if (!value || value.startsWith('--')) throw new Error(`${option} requires a path`)
  return value
}

function assertSafeDesktopUserDataPath(userDataPath) {
  if (!path.isAbsolute(userDataPath)) {
    throw new Error('--desktop-user-data-path must be absolute')
  }
  const normalized = path.resolve(userDataPath)
  if (normalized === path.parse(normalized).root) {
    throw new Error('--desktop-user-data-path cannot be a filesystem root')
  }
}

async function readTmpEntries(tmpDir) {
  const entries = await readdir(tmpDir, { withFileTypes: true })
  const directories = entries.filter((entry) => entry.isDirectory())
  return Promise.all(
    directories.map(async (entry) => ({
      hasSmokeStorageMarker: await hasSmokeStorageMarker(path.join(tmpDir, entry.name)),
      name: entry.name,
      path: path.join(tmpDir, entry.name)
    }))
  )
}

async function hasSmokeStorageMarker(directory) {
  try {
    await access(path.join(directory, SMOKE_STORAGE_MARKER))
    return true
  } catch {
    return false
  }
}

function printPlan(plan) {
  if (plan.actions.length === 0) {
    console.log('No Kepos dev/smoke storage matched the selected cleanup targets.')
    return
  }

  console.log(plan.apply ? 'Cleanup actions:' : 'Cleanup dry run:')
  for (const action of plan.actions) {
    if (action.kind === 'adb-pm-clear') {
      console.log(`- adb ${action.args.join(' ')}`)
    } else {
      console.log(`- rm -rf ${action.path}`)
    }
  }
}

async function runAction(action) {
  if (action.kind === 'remove-dir') {
    await rm(action.path, { force: true, recursive: true })
    return
  }

  if (action.kind === 'adb-pm-clear') {
    const result = spawnSync('adb', action.args, { stdio: 'inherit' })
    if (result.error) throw result.error
    if (result.status !== 0) {
      throw new Error(`adb exited with status ${result.status}`)
    }
    return
  }

  throw new Error(`Unknown cleanup action: ${action.kind}`)
}

function printHelp() {
  console.log(`Usage: npm run storage:cleanup -- [targets] [--apply ${CONFIRM_DELETE_FLAG}]

Targets:
  --desktop-smoke-tmp              Remove leftover Kepos smoke temp dirs under ${os.tmpdir()}
  --desktop-user-data-path <path>  Remove Kepos-owned app data subdirs under an Electron userData path
  --android-app-data               Run adb shell pm clear ${ANDROID_APP_ID}

By default this is a dry run. Destructive cleanup requires both --apply and
${CONFIRM_DELETE_FLAG}. ANDROID_SERIAL is honored when set.`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
