import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const rootPackage = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const desktopPackage = JSON.parse(
  readFileSync(new URL('../desktop/package.json', import.meta.url), 'utf8')
)

const forbiddenRootPackages = new Set([
  'bare-daemon',
  'pear-bridge',
  'pear-electron',
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

if ('main' in desktopPackage) {
  desktopViolations.push('desktop/package.json must not use top-level "main"')
}

if (desktopPackage.pear?.pre !== 'pear-electron/pre') {
  desktopViolations.push('desktop/package.json must set pear.pre to "pear-electron/pre"')
}

if (desktopPackage.pear?.gui?.main !== 'index.html') {
  desktopViolations.push('desktop/package.json must set pear.gui.main to "index.html"')
}

const desktopEntrypoints = desktopPackage.pear?.stage?.entrypoints

if (
  !Array.isArray(desktopEntrypoints) ||
  desktopEntrypoints.length !== 1 ||
  desktopEntrypoints[0] !== 'index.js'
) {
  desktopViolations.push('desktop/package.json pear.stage.entrypoints must be ["index.js"]')
}

for (const name of [
  'autobase',
  'b4a',
  'corestore',
  'hypercore-crypto',
  'hyperswarm',
  'pear-bridge',
  'pear-electron'
]) {
  if (!desktopPackage.dependencies?.[name]) {
    desktopViolations.push(`desktop/package.json must declare dependencies.${name}`)
  }
}

if (desktopViolations.length > 0) {
  console.error('Pear desktop v2 configuration is incomplete:')
  for (const violation of desktopViolations) console.error(`- ${violation}`)
  process.exit(1)
}

console.log('Platform dependency boundaries OK')
