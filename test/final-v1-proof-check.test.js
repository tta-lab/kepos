import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  readFinalV1ProofCheckPath,
  validateFinalV1ProofPacket
} from '../scripts/check-final-v1-proof-packet.mjs'
import { createFinalV1ProofPacket } from '../scripts/final-v1-proof-packet.mjs'

function completedPacket() {
  return createFinalV1ProofPacket({
    env: { ANDROID_SERIAL: 'usb-1' },
    now: new Date('2026-07-01T00:00:00.000Z'),
    runCommand: ([command, ...args]) => {
      const key = [command, ...args].join(' ')
      const outputs = {
        'adb shell getprop ro.product.model': 'Pixel 7a\n',
        'git branch --show-current': 'feat/v1\n',
        'git rev-parse HEAD': 'abc1234\n',
        'git status --porcelain': ''
      }
      return Object.hasOwn(outputs, key)
        ? { status: 0, stdout: outputs[key] }
        : { status: 1, stdout: '' }
    }
  })
    .replace('- `npm run v1:gate`: <pass/fail, paste summary>', '- `npm run v1:gate`: passed')
    .replace(
      '- Desktop mode: <normal Electron | Pear/Bare worker>',
      '- Desktop mode: normal Electron'
    )
    .replace(
      '- Android runtime: <Metro/dev-client | installed debug APK | installed release APK>',
      '- Android runtime: installed release APK'
    )
    .replace('- Physical Profile QR scan: <pass/fail>', '- Physical Profile QR scan: passed')
    .replace(
      '- Advanced Debug Home QR scan (optional transport descriptor, not the trust path): <pass/fail/not run>',
      '- Advanced Debug Home QR scan (optional transport descriptor, not the trust path): not run'
    )
    .replace(
      '- Home peer count at request receipt (desktop): <number observed on desktop>',
      '- Home peer count at request receipt (desktop): 0'
    )
    .replace(
      '- Home peer count at request receipt (Android): <number observed on Android>',
      '- Home peer count at request receipt (Android): 0'
    )
    .replace(
      '- Home peer count at accept/invite return (desktop): <number observed on desktop>',
      '- Home peer count at accept/invite return (desktop): 0'
    )
    .replace(
      '- Home peer count at accept/invite return (Android): <number observed on Android>',
      '- Home peer count at accept/invite return (Android): 0'
    )
    .replace(
      '- Home peer count evidence source: <desktop #peerLabel; Android room-transport-debug after Advanced is opened; screenshot/log path>',
      '- Home peer count evidence source: desktop #peerLabel and Android room-transport-debug screenshots'
    )
    .replace(
      '- Evidence: <screenshots/log paths or notes>',
      '- Evidence: tmp/final-v1-proof-assets/'
    )
    .replaceAll('- [ ]', '- [x]')
}

test('final V1 proof checker rejects the generated unchecked template', () => {
  const packet = createFinalV1ProofPacket()
  const result = validateFinalV1ProofPacket(packet)

  assert.equal(result.ok, false)
  assert.match(result.failures.join('\n'), /unchecked release items/)
  assert.match(result.failures.join('\n'), /unresolved placeholders/)
  assert.match(result.failures.join('\n'), /worktree state/)
  assert.match(result.failures.join('\n'), /v1:gate/)
})

test('final V1 proof checker accepts a complete recorded packet', () => {
  const result = validateFinalV1ProofPacket(completedPacket())

  assert.equal(result.ok, true)
  assert.equal(result.failures.length, 0)
  assert.equal(result.uncheckedItems, 0)
  assert.equal(result.checkedItems, 42)
})

test('final V1 proof checker rejects dirty worktree proof', () => {
  const packet = completedPacket().replace(
    '- Worktree state: clean',
    '- Worktree state: dirty-local'
  )
  const result = validateFinalV1ProofPacket(packet)

  assert.equal(result.ok, false)
  assert.match(result.failures.join('\n'), /worktree state must be clean/)
})

test('final V1 proof checker rejects incomplete run metadata', () => {
  const packet = completedPacket()
    .replace('- Commit SHA: abc1234', '- Commit SHA: abc')
    .replace('- Branch: feat/v1', '- Branch: ')
    .replace('- Desktop mode: normal Electron', '- Desktop mode: browser')
    .replace('- Android device: Pixel 7a', '- Android device: ')
    .replace('- ANDROID_SERIAL: usb-1', '- ANDROID_SERIAL: ')
    .replace('- Android runtime: installed release APK', '- Android runtime: simulator')
    .replace(
      '- Home peer count evidence source: desktop #peerLabel and Android room-transport-debug screenshots',
      '- Home peer count evidence source: desktop screenshot only'
    )
    .replace('- Evidence: tmp/final-v1-proof-assets/', '- Evidence: ')
  const result = validateFinalV1ProofPacket(packet)
  const failures = result.failures.join('\n')

  assert.equal(result.ok, false)
  assert.match(failures, /Commit SHA must be recorded as a git SHA/)
  assert.match(failures, /Branch must be recorded/)
  assert.match(failures, /Desktop mode must be recorded/)
  assert.match(failures, /Android device model must be recorded/)
  assert.match(failures, /ANDROID_SERIAL must be recorded/)
  assert.match(failures, /Android runtime must be recorded/)
  assert.match(failures, /Home peer count evidence source must include desktop and Android/)
  assert.match(failures, /Evidence notes or artifact paths must be recorded/)
})

test('final V1 proof checker rejects failed physical Profile QR proof', () => {
  const packet = completedPacket().replace(
    '- Physical Profile QR scan: passed',
    '- Physical Profile QR scan: failed'
  )
  const result = validateFinalV1ProofPacket(packet)

  assert.equal(result.ok, false)
  assert.match(result.failures.join('\n'), /Physical Profile QR scan must be recorded as passed/)
})

test('final V1 proof checker rejects negated pass wording', () => {
  const packet = completedPacket()
    .replace('- `npm run v1:gate`: passed', '- `npm run v1:gate`: not passed')
    .replace('- Physical Profile QR scan: passed', '- Physical Profile QR scan: not passed')
  const result = validateFinalV1ProofPacket(packet)

  assert.equal(result.ok, false)
  assert.match(result.failures.join('\n'), /v1:gate/)
  assert.match(result.failures.join('\n'), /Physical Profile QR scan/)
})

test('final V1 proof checker rejects packets missing required checked items', () => {
  const packet = completedPacket()
    .replace(
      '- [x] 3. Android scans the desktop Profile QR through the camera.',
      '- [x] 3. Android scans something else.'
    )
    .replace('- [x] Chat messages are durable across restart', '')
  const result = validateFinalV1ProofPacket(packet)

  assert.equal(result.ok, false)
  assert.match(result.failures.join('\n'), /missing required checked release items/)
  assert.match(result.failures.join('\n'), /Android scans the desktop Profile QR/)
})

test('final V1 proof checker rejects nonzero Home peer count evidence', () => {
  const packet = completedPacket()
    .replace(
      '- Home peer count at request receipt (desktop): 0',
      '- Home peer count at request receipt (desktop): 1'
    )
    .replace(
      '- Home peer count at accept/invite return (Android): 0',
      '- Home peer count at accept/invite return (Android): 1'
    )
  const result = validateFinalV1ProofPacket(packet)

  assert.equal(result.ok, false)
  assert.match(result.failures.join('\n'), /request receipt on desktop must be recorded/)
  assert.match(result.failures.join('\n'), /accept\/invite return on Android must be recorded/)
})

test('final V1 proof checker rejects vague Home peer count wording', () => {
  const packet = completedPacket()
    .replace(
      '- Home peer count at request receipt (Android): 0',
      '- Home peer count at request receipt (Android): zero'
    )
    .replace(
      '- Home peer count at accept/invite return (desktop): 0',
      '- Home peer count at accept/invite return (desktop): zero'
    )
  const result = validateFinalV1ProofPacket(packet)

  assert.equal(result.ok, false)
  assert.match(result.failures.join('\n'), /request receipt on Android must be recorded/)
  assert.match(result.failures.join('\n'), /accept\/invite return on desktop must be recorded/)
})

test('final V1 proof checker parses file argument defensively', () => {
  assert.equal(readFinalV1ProofCheckPath([]), 'tmp/final-v1-proof.md')
  assert.equal(readFinalV1ProofCheckPath(['--file', 'tmp/custom-proof.md']), 'tmp/custom-proof.md')
  assert.throws(() => readFinalV1ProofCheckPath(['--file']), /--file requires a path/)
})

test('package and docs expose the final V1 proof checker', async () => {
  const packageJson = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8')
  )
  const recipe = await readFile(
    new URL('../docs/v1.21-cross-device-smoke.md', import.meta.url),
    'utf8'
  )
  const help = await readFile(
    new URL('../scripts/check-final-v1-proof-packet.mjs', import.meta.url),
    'utf8'
  )

  assert.equal(
    packageJson.scripts['v1:proof:check'],
    'node scripts/check-final-v1-proof-packet.mjs'
  )
  assert.match(recipe, /npm run v1:proof:check/)
  assert.match(recipe, /fails if required checklist items/)
  assert.match(recipe, /items are missing or still unchecked/)
  assert.match(recipe, /run metadata is incomplete/)
  assert.match(recipe, /physical Profile QR scan was not recorded as passing/)
  assert.match(recipe, /desktop and Android Home peer counts are not each recorded as numeric zero/)
  assert.match(
    help,
    /desktop and Android Home peer counts were not\s+each recorded as numeric zero/
  )
  assert.match(recipe, /worktree state is not clean/)
})
