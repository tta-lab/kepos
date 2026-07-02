import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  createFinalV1ProofPacket,
  FINAL_V1_PASSING_CRITERIA,
  FINAL_V1_EVIDENCE_BOUNDARIES,
  FINAL_V1_PREFLIGHT_STEPS,
  FINAL_V1_PROOF_STEPS,
  readFinalV1ProofPacketOutputPath,
  writeFinalV1ProofPacket
} from '../scripts/final-v1-proof-packet.mjs'

function createRunCommand(outputs) {
  return ([command, ...args]) => {
    const key = [command, ...args].join(' ')
    const stdout = outputs[key]
    return typeof stdout === 'string' ? { status: 0, stdout } : { status: 1, stdout: '' }
  }
}

test('final V1 proof packet prints the normal product-path checklist', () => {
  const packet = createFinalV1ProofPacket({
    env: { ANDROID_SERIAL: 'usb-1' },
    now: new Date('2026-07-01T00:00:00.000Z'),
    runCommand: createRunCommand({
      'adb shell getprop ro.product.model': 'Pixel 7a\n',
      'git branch --show-current': 'feat/v1\n',
      'git rev-parse HEAD': 'abc123\n',
      'git status --porcelain': ''
    })
  })

  assert.match(packet, /# Final V1 Release Proof Packet/)
  assert.match(packet, /Generated: 2026-07-01T00:00:00\.000Z/)
  assert.match(packet, /Commit SHA: abc123/)
  assert.match(packet, /Branch: feat\/v1/)
  assert.match(packet, /Worktree state: clean/)
  assert.match(packet, /Android device: Pixel 7a/)
  assert.match(packet, /ANDROID_SERIAL: usb-1/)
  assert.match(
    packet,
    /Android runtime: <Metro\/dev-client \| installed debug APK \| installed release APK>/
  )
  assert.match(packet, /`npm run v1:gate`: <pass\/fail, paste summary>/)
  assert.match(packet, /Physical Profile QR scan: <pass\/fail>/)
  assert.match(
    packet,
    /Advanced Debug Home QR scan \(optional transport descriptor, not the trust path\)/
  )
  assert.match(
    packet,
    /Home peer count at request receipt \(desktop\): <number observed on desktop>/
  )
  assert.match(
    packet,
    /Home peer count at request receipt \(Android\): <number observed on Android>/
  )
  assert.match(
    packet,
    /Home peer count at accept\/invite return \(desktop\): <number observed on desktop>/
  )
  assert.match(
    packet,
    /Home peer count at accept\/invite return \(Android\): <number observed on Android>/
  )
  assert.match(
    packet,
    /Home peer count evidence source: <desktop #peerLabel; Android room-transport-debug after Advanced is opened; screenshot\/log path>/
  )
  assert.doesNotMatch(packet, /Physical Home QR scan: <pass\/fail>/)
  assert.match(packet, /## Preflight/)
  assert.match(packet, /`npm run v1:gate` passed on the same commit and worktree state/)
  assert.match(packet, /commit first or explicitly mark the proof as dirty-local evidence/)
  assert.match(packet, /Android screen is unlocked and focused on Kepos/)
  assert.match(packet, /npm run storage:cleanup/)
  assert.match(packet, /Desktop shows My QR from Start or Contacts without entering Home/)
  assert.doesNotMatch(packet, /Desktop opens its Home and shows My QR/)
  assert.match(packet, /Android scans the desktop Profile QR through the camera/)
  assert.match(packet, /Android sends a friend request/)
  assert.match(packet, /Android shows the request as Request pending before acceptance/)
  assert.match(packet, /profile-level delivery while Home peer count stays zero/)
  assert.match(packet, /Android still shows the outgoing request as Request pending after restart/)
  assert.match(packet, /Desktop ignores the friend request/)
  assert.match(packet, /Desktop shows Android in Removed \/ ignored and chooses Allow requests/)
  assert.match(packet, /Android sends the friend request again/)
  assert.match(packet, /Desktop accepts the second friend request/)
  assert.match(packet, /Desktop creates a local Treehole post before restart/)
  assert.match(packet, /Both sides still show the trusted contact and the prior Chat thread/)
  assert.match(packet, /Desktop still shows the local Treehole post/)
  assert.match(packet, /Message as the primary enabled action/)
  assert.match(packet, /same profile detail from the Chat row or current-thread header/)
  assert.match(packet, /same profile detail from the Chat row/)
  assert.match(packet, /explicitly chooses Enter Home/)
  assert.match(packet, /Recent posts/)
  assert.match(packet, /Desktop revokes Android from Contacts/)
  assert.match(packet, /future Home\/Chat access/)
  assert.match(packet, /local Treehole posts survive restart/)
  assert.match(packet, /Treehole posts stay separate/)
  assert.match(packet, /Home\/Treehole path/)
  assert.match(packet, /recorded with desktop and Android Home peer counts zero/)
  assert.match(packet, /ignored requests stay visible/)
  assert.match(packet, /Allow requests permits a new request without restoring trust/)
  assert.match(packet, /Chat rows and Contacts rows open the same trusted profile detail/)
  assert.doesNotMatch(packet, /future Home\/DM access/)
  assert.match(packet, /## Evidence Boundaries/)
  assert.match(packet, /`npm run v1:gate` proves source, bundles, export/)
  assert.match(packet, /Debug two-device smoke proves live transport/)
  assert.match(
    packet,
    /does not replace the normal Profile QR -> request -> ignore -> allow -> request -> accept/
  )
  assert.match(packet, /desktop and Android Home peer counts recorded as zero/)
  assert.match(packet, /request receipt and accept\/invite return/)
  assert.match(packet, /record desktop #peerLabel and Android room-transport-debug separately/)
  assert.match(packet, /desktop #peerLabel/)
  assert.match(packet, /Android room-transport-debug/)
  assert.match(packet, /V1 ready requires one recorded normal cross-device run/)
  assert.match(packet, /Do not mark V1 ready/)
  assert.equal((packet.match(/^- \[ \]/gm) || []).length, 42)
})

test('final V1 proof packet falls back without touching device state', () => {
  const packet = createFinalV1ProofPacket({
    env: {},
    runCommand: () => ({ status: 1, stdout: '' })
  })

  assert.match(packet, /Commit SHA: <commit-sha>/)
  assert.match(packet, /Branch: <branch>/)
  assert.match(packet, /Worktree state: <worktree-state>/)
  assert.match(packet, /Android device: <android-model>/)
  assert.match(packet, /ANDROID_SERIAL: <device-id>/)
})

test('final V1 proof packet records dirty local worktree evidence explicitly', () => {
  const packet = createFinalV1ProofPacket({
    runCommand: createRunCommand({
      'git branch --show-current': 'feat/v1\n',
      'git rev-parse HEAD': 'abc123\n',
      'git status --porcelain': ' M docs/v1.21-cross-device-smoke.md\n'
    })
  })

  assert.match(packet, /Commit SHA: abc123/)
  assert.match(packet, /Branch: feat\/v1/)
  assert.match(packet, /Worktree state: dirty \(uncommitted changes present\)/)
})

test('final V1 proof packet can be written as a markdown artifact', () => {
  const calls = []
  const writtenPath = writeFinalV1ProofPacket('tmp/proof/final-v1.md', '# Packet', {
    mkdir: (path, options) => calls.push(['mkdir', path, options]),
    writeFile: (path, contents, encoding) => calls.push(['writeFile', path, contents, encoding])
  })

  assert.match(writtenPath, /tmp\/proof\/final-v1\.md$/)
  assert.deepEqual(calls[0], [
    'mkdir',
    writtenPath.replace(/\/final-v1\.md$/, ''),
    { recursive: true }
  ])
  assert.deepEqual(calls[1], ['writeFile', writtenPath, '# Packet\n', 'utf8'])
})

test('final V1 proof packet parses output arguments defensively', () => {
  assert.equal(readFinalV1ProofPacketOutputPath([]), '')
  assert.equal(
    readFinalV1ProofPacketOutputPath(['--output', 'tmp/final-v1-proof.md']),
    'tmp/final-v1-proof.md'
  )
  assert.throws(
    () => readFinalV1ProofPacketOutputPath(['--output']),
    /--output requires a file path/
  )
})

test('final V1 proof packet constants cover the documented release proof', () => {
  assert.equal(FINAL_V1_PREFLIGHT_STEPS.length, 6)
  assert.equal(FINAL_V1_PROOF_STEPS.length, 26)
  assert.equal(FINAL_V1_PASSING_CRITERIA.length, 10)
  assert.equal(FINAL_V1_EVIDENCE_BOUNDARIES.length, 6)
  assert.ok(FINAL_V1_PREFLIGHT_STEPS.some((step) => step.includes('v1:gate')))
  assert.ok(FINAL_V1_PREFLIGHT_STEPS.some((step) => step.includes('dirty-local evidence')))
  assert.ok(FINAL_V1_PREFLIGHT_STEPS.some((step) => step.includes('unlocked')))
  assert.ok(FINAL_V1_PROOF_STEPS.some((step) => step.includes('without entering Home')))
  assert.equal(
    FINAL_V1_PROOF_STEPS.some((step) => step.includes('opens its Home and shows My QR')),
    false
  )
  assert.ok(FINAL_V1_PROOF_STEPS.some((step) => step.includes('friend request')))
  assert.ok(FINAL_V1_PROOF_STEPS.some((step) => step.includes('Request pending')))
  assert.ok(FINAL_V1_PROOF_STEPS.some((step) => step.includes('Home peer count')))
  assert.ok(FINAL_V1_PROOF_STEPS.some((step) => step.includes('ignores the friend request')))
  assert.ok(FINAL_V1_PROOF_STEPS.some((step) => step.includes('Allow requests')))
  assert.ok(FINAL_V1_PROOF_STEPS.some((step) => step.includes('Chat thread')))
  assert.ok(FINAL_V1_PROOF_STEPS.some((step) => step.includes('primary enabled action')))
  assert.ok(FINAL_V1_PROOF_STEPS.some((step) => step.includes('same profile detail')))
  assert.ok(FINAL_V1_PROOF_STEPS.some((step) => step.includes('local Treehole post')))
  assert.ok(FINAL_V1_PROOF_STEPS.some((step) => step.includes('Home/Chat access')))
  assert.ok(FINAL_V1_PASSING_CRITERIA.some((criterion) => criterion.includes('not Home QR')))
  assert.ok(
    FINAL_V1_PASSING_CRITERIA.some((criterion) =>
      criterion.includes('desktop and Android Home peer counts zero')
    )
  )
  assert.ok(FINAL_V1_PASSING_CRITERIA.some((criterion) => criterion.includes('ignored requests')))
  assert.ok(FINAL_V1_PASSING_CRITERIA.some((criterion) => criterion.includes('Treehole posts')))
  assert.ok(FINAL_V1_PASSING_CRITERIA.some((criterion) => criterion.includes('survive restart')))
  assert.ok(
    FINAL_V1_PASSING_CRITERIA.some((criterion) => criterion.includes('same trusted profile detail'))
  )
  assert.ok(
    FINAL_V1_EVIDENCE_BOUNDARIES.some((boundary) => boundary.includes('not final release proof'))
  )
  assert.ok(
    FINAL_V1_EVIDENCE_BOUNDARIES.some((boundary) => boundary.includes('normal cross-device run'))
  )
})

test('package and docs expose the final V1 proof packet helper', async () => {
  const packageJson = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8')
  )
  const recipe = await readFile(
    new URL('../docs/v1.21-cross-device-smoke.md', import.meta.url),
    'utf8'
  )

  assert.equal(packageJson.scripts['v1:proof:packet'], 'node scripts/final-v1-proof-packet.mjs')
  assert.match(packageJson.scripts['android:assemble:release'], /assembleRelease/)
  assert.match(packageJson.scripts['android:install:release'], /app-release\.apk/)
  assert.match(recipe, /npm run v1:proof:packet/)
  assert.match(recipe, /--output/)
  assert.match(recipe, /non-invasive/)
  assert.match(recipe, /does not\s+launch apps, run smoke, reset storage, or touch device state/)
  assert.match(recipe, /whether physical Profile QR scan passed/)
  assert.match(recipe, /observed Home peer count on desktop when the desktop receives/)
  assert.match(recipe, /observed Home peer count on Android when the desktop receives/)
  assert.match(recipe, /worktree state: clean, dirty-local, or unknown/)
  assert.match(recipe, /commit, worktree state, and Android metadata/)
  assert.match(recipe, /same commit and worktree state being proved/)
  assert.match(recipe, /Advanced Debug Home QR scan passed as a transport-descriptor check/)
  assert.doesNotMatch(recipe, /Profile QR and Home QR scan both passed/)
  assert.match(recipe, /Evidence boundaries/)
  assert.match(recipe, /not final release proof by itself/)
  assert.match(
    recipe,
    /does not replace the normal Profile QR -> request -> ignore -> allow -> request -> accept release path/
  )
  assert.match(recipe, /one recorded normal cross-device run/)
})
