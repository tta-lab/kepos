import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const rootPackage = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const desktopPackage = JSON.parse(
  readFileSync(new URL('../desktop/package.json', import.meta.url), 'utf8')
)

const forbiddenRootPackages = new Set([
  'bare-daemon',
  'electron',
  'pear-bridge',
  'pear-electron',
  'pear-runtime',
  'pear-tryboot'
])

const directSections = ['dependencies', 'devDependencies', 'optionalDependencies']
const directViolations = []

for (const section of directSections) {
  for (const name of Object.keys(rootPackage[section] ?? {})) {
    if (forbiddenRootPackages.has(name)) directViolations.push(`${section}.${name}`)
  }
}

if (directViolations.length > 0) {
  console.error('Desktop-only packages must not be declared in the root package:')
  for (const violation of directViolations) console.error(`- ${violation}`)
  console.error('Put desktop runtime dependencies under desktop/ instead.')
  process.exit(1)
}

const transitiveViolations = []

for (const name of forbiddenRootPackages) {
  try {
    const output = execFileSync('npm', ['ls', name, '--parseable', '--all'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    })
      .trim()
      .split('\n')
      .filter(Boolean)

    if (output.length > 0) transitiveViolations.push(name)
  } catch {
    // npm ls exits non-zero when the package is absent, which is the expected state.
  }
}

if (transitiveViolations.length > 0) {
  console.error('Desktop-only packages are present in the root dependency graph:')
  for (const name of transitiveViolations) console.error(`- ${name}`)
  console.error('This can leak desktop native addons into Android builds.')
  process.exit(1)
}

const desktopViolations = []

if (desktopPackage.main !== 'electron/main.cjs') {
  desktopViolations.push('desktop/package.json must set main to "electron/main.cjs"')
}

if (desktopPackage.scripts?.start !== 'electron .') {
  desktopViolations.push('desktop/package.json must set scripts.start to "electron ."')
}

if (desktopPackage.pear) {
  desktopViolations.push('desktop/package.json must not use legacy pear run configuration')
}

for (const name of ['pear-bridge', 'pear-electron']) {
  if (desktopPackage.dependencies?.[name] || desktopPackage.devDependencies?.[name]) {
    desktopViolations.push(`desktop/package.json must not declare ${name}`)
  }
}

for (const name of [
  'autobase',
  'b4a',
  'corestore',
  'hypercore-crypto',
  'hyperswarm',
  'pear-runtime'
]) {
  if (!desktopPackage.dependencies?.[name]) {
    desktopViolations.push(`desktop/package.json must declare dependencies.${name}`)
  }
}

if (!desktopPackage.devDependencies?.electron) {
  desktopViolations.push('desktop/package.json must declare devDependencies.electron')
}

if (desktopViolations.length > 0) {
  console.error('Electron desktop runtime configuration is incomplete:')
  for (const violation of desktopViolations) console.error(`- ${violation}`)
  process.exit(1)
}

console.log('Platform dependency boundaries OK')
