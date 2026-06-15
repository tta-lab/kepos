import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { basename, join } from 'node:path'

const apk = process.argv[2] ?? 'android/app/build/outputs/apk/debug/app-debug.apk'
const forbiddenLibs = new Set(['libbare-daemon.1.2.4.so'])
const minLoadAlignment = 0x4000

function run(command, args) {
  return execFileSync(command, args, { encoding: 'utf8' })
}

function findAndroidTool(relativePath) {
  const sdks = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    join(homedir(), 'Library', 'Android', 'sdk'),
    '/opt/android-sdk',
    '/usr/local/share/android-sdk'
  ].filter(Boolean)

  for (const sdk of sdks) {
    try {
      const tool = execFileSync('find', [sdk, '-path', `*${relativePath}*`, '-type', 'f'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore']
      })
        .trim()
        .split('\n')
        .filter(Boolean)
        .sort()
        .at(-1)

      if (tool) return tool
    } catch {
      // Try the next SDK location.
    }
  }

  return null
}

const archiveEntries = run('unzip', ['-Z1', apk]).trim().split('\n').filter(Boolean)
const forbiddenEntries = archiveEntries.filter((entry) => forbiddenLibs.has(basename(entry)))

if (forbiddenEntries.length > 0) {
  console.error('Forbidden desktop native libraries found in Android APK:')
  for (const entry of forbiddenEntries) console.error(`- ${entry}`)
  process.exit(1)
}

const zipalign = findAndroidTool('/zipalign')
if (zipalign) {
  run(zipalign, ['-c', '-P', '16', '-v', '4', apk])
} else {
  console.error('zipalign not found. Set ANDROID_HOME or ANDROID_SDK_ROOT.')
  process.exit(1)
}

const readelf = findAndroidTool('/llvm-readelf')
const objdump = readelf ? null : findAndroidTool('/llvm-objdump')

if (!readelf && !objdump) {
  console.error(
    'llvm-readelf or llvm-objdump not found. Install the Android NDK or set ANDROID_HOME.'
  )
  process.exit(1)
}

const arm64Libs = archiveEntries.filter(
  (entry) => entry.startsWith('lib/arm64-v8a/') && entry.endsWith('.so')
)
const tmp = mkdtempSync(join(tmpdir(), 'kepos-apk-'))

try {
  if (arm64Libs.length > 0) run('unzip', ['-q', apk, ...arm64Libs, '-d', tmp])

  const libDir = join(tmp, 'lib', 'arm64-v8a')
  const violations = []

  if (arm64Libs.length === 0) {
    console.error('No arm64 native libraries found in APK.')
    process.exit(1)
  }

  for (const file of readdirSync(libDir)) {
    if (!file.endsWith('.so')) continue

    const alignments = readelf
      ? run(readelf, ['-l', join(libDir, file)])
          .split('\n')
          .filter((line) => /^\s*LOAD\s/.test(line))
          .map((line) => Number.parseInt(line.trim().split(/\s+/).at(-1), 16))
          .filter(Number.isFinite)
      : run(objdump, ['-p', join(libDir, file)])
          .split('\n')
          .filter((line) => /^\s*LOAD\s/.test(line))
          .map((line) => line.match(/\balign\s+2\*\*(\d+)/))
          .filter(Boolean)
          .map((match) => 2 ** Number.parseInt(match[1], 10))

    for (const alignment of alignments) {
      if (alignment < minLoadAlignment || alignment % minLoadAlignment !== 0) {
        violations.push(`${file}: 0x${alignment.toString(16)}`)
      }
    }
  }

  if (violations.length > 0) {
    console.error('Android arm64 ELF LOAD segments are not 16KB aligned:')
    for (const violation of violations) console.error(`- ${violation}`)
    process.exit(1)
  }
} finally {
  rmSync(tmp, { recursive: true, force: true })
}

console.log('Android APK native library checks OK')
