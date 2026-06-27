import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'

const flow = '.maestro/android-smoke.yaml'
const maestro = resolveMaestroCommand()
prepareDeviceUi()
grantCameraPermission()
ensureAdbReverse()
await ensureMetroServer()
const version = spawnSync(maestro, ['--version'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe']
})

if (version.error?.code === 'ENOENT') {
  console.error('Maestro CLI is required for Android smoke.')
  console.error(
    'Install it with: brew tap mobile-dev-inc/tap && brew install --formula mobile-dev-inc/tap/maestro'
  )
  process.exit(127)
}

if (version.status !== 0) {
  process.stderr.write(version.stderr)
  process.exit(version.status ?? 1)
}

const result = spawnSync(maestro, ['test', flow], {
  encoding: 'utf8',
  stdio: 'inherit'
})

if (result.error) {
  console.error(result.error.message)
  process.exit(1)
}

process.exit(result.status ?? 1)

function resolveMaestroCommand() {
  const candidates = [
    'maestro',
    ...homebrewMaestroCandidates('/opt/homebrew/Cellar/maestro'),
    ...homebrewMaestroCandidates('/usr/local/Cellar/maestro')
  ]

  for (const candidate of candidates) {
    const result = spawnSync(candidate, ['--version'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    })

    if (result.status === 0) return candidate
  }

  return 'maestro'
}

function homebrewMaestroCandidates(root) {
  if (!existsSync(root)) return []

  return readdirSync(root)
    .sort()
    .reverse()
    .map((version) => path.join(root, version, 'libexec', 'bin', 'maestro'))
    .filter((candidate) => existsSync(candidate))
}

function grantCameraPermission() {
  const args = ['shell', 'pm', 'grant', 'io.guion.kepos', 'android.permission.CAMERA']
  runAdb(args)
}

function prepareDeviceUi() {
  runAdb(['shell', 'input', 'keyevent', 'KEYCODE_WAKEUP'])
  runAdb(['shell', 'wm', 'dismiss-keyguard'])
  runAdb(['shell', 'cmd', 'statusbar', 'collapse'])
}

function ensureAdbReverse() {
  const result = runAdb(['reverse', 'tcp:8081', 'tcp:8081'])

  if (result.status !== 0) {
    console.error('Android smoke requires one connected device with adb reverse support.')
    if (result.stderr) process.stderr.write(result.stderr)
    process.exit(result.status ?? 1)
  }
}

async function ensureMetroServer() {
  try {
    const response = await fetch('http://127.0.0.1:8081/status', {
      signal: AbortSignal.timeout(2500)
    })
    const body = await response.text()

    if (response.ok && body.includes('packager-status:running')) return
  } catch {
    // Fall through to the actionable error below.
  }

  console.error('Android smoke requires Metro on http://127.0.0.1:8081.')
  console.error('Start it with: adb reverse tcp:8081 tcp:8081 && npm run mobile:start')
  process.exit(1)
}

function runAdb(args) {
  const serial = process.env.ANDROID_SERIAL?.trim()
  const command = serial ? ['-s', serial, ...args] : args

  return spawnSync('adb', command, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  })
}
