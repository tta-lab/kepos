import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'

const flow = '.maestro/android-smoke.yaml'
const maestro = resolveMaestroCommand()
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
