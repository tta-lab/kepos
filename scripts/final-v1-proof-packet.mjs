#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export const FINAL_V1_PREFLIGHT_STEPS = [
  '`npm run v1:gate` passed on the same commit and worktree state being proved.',
  'Worktree state is recorded; commit first or explicitly mark the proof as dirty-local evidence.',
  'Desktop runtime choice is recorded before starting the run.',
  'Android runtime choice and device serial are recorded before starting the run.',
  'Android screen is unlocked and focused on Kepos before QR steps.',
  'Old smoke data is either intentionally kept for persistence proof or cleaned with `npm run storage:cleanup`.'
]

export const FINAL_V1_PROOF_STEPS = [
  'Start desktop and Android from clean enough state.',
  'Desktop shows My QR from Start or Contacts without entering Home.',
  'Android scans the desktop Profile QR through the camera.',
  'Android sends a friend request from the scanned profile target.',
  'Android shows the request as Request pending before acceptance.',
  'Desktop receives the incoming request through profile-level delivery while Home peer count stays zero.',
  'Restart Android before desktop handles that request.',
  'Android still shows the outgoing request as Request pending after restart.',
  'Desktop ignores the friend request.',
  'Desktop shows Android in Removed / ignored and chooses Allow requests.',
  'Android sends the friend request again.',
  'Desktop accepts the second friend request.',
  'Both sides show the other side in Contacts.',
  'Both sides open the trusted profile detail and see Message as the primary enabled action.',
  'Android opens Chat, selects the desktop contact, opens the same profile detail from the Chat row or current-thread header, then sends a message.',
  'Desktop replies from the same durable Chat thread and can open the same profile detail from the Chat row.',
  'Desktop creates a local Treehole post before restart.',
  'Restart both apps.',
  'Both sides still show the trusted contact and the prior Chat thread; Desktop still shows the local Treehole post.',
  'Desktop creates or reopens its Home.',
  'Android opens the desktop contact profile and explicitly chooses Enter Home.',
  'Android reaches the desktop Home without typing a raw Home key.',
  'Desktop creates another Treehole post after Home is open.',
  'Android refreshes or opens the desktop profile Recent posts and sees the post.',
  'Desktop revokes Android from Contacts.',
  'Android can no longer use that trust relationship for future Home/Chat access.'
]

export const FINAL_V1_PASSING_CRITERIA = [
  'trust starts from Profile QR plus friend request, not Home QR',
  'request receipt and accept are recorded with Home peer count zero',
  'outgoing friend requests survive restart, ignored requests stay visible, and Allow requests permits a new request without restoring trust',
  'Home entry is explicit from a trusted profile',
  'Chat rows and Contacts rows open the same trusted profile detail, with Message as the primary post-accept action',
  'Chat messages are durable across restart',
  'local Treehole posts survive restart',
  'room chat, Chat, and Treehole posts stay separate',
  "Recent posts load from the trusted profile's Home/Treehole path",
  'revoke removes future access but does not promise to delete already copied data'
]

export const FINAL_V1_EVIDENCE_BOUNDARIES = [
  '`npm run v1:gate` proves source, bundles, export, and non-device model behavior; it is not final release proof by itself.',
  'Desktop self-run smoke and Pear smoke prove desktop app paths; they do not prove Android camera, Android persistence, or cross-device trust UX.',
  'Android self-run smoke proves local Android create/open/post/restart behavior; it does not prove desktop-to-Android friend request and Chat flow.',
  'Debug two-device smoke proves live transport and persistence sub-paths; it does not replace the normal Profile QR -> request -> ignore -> allow -> request -> accept release path.',
  'Profile-level request delivery must be proved with Home peer count recorded as zero through request receipt and accept; record the observed peer counts from desktop #peerLabel and Android room-transport-debug when available; Enter Home is a separate post-trust step.',
  'V1 ready requires one recorded normal cross-device run where every product-path checklist item below is checked.'
]

export function createFinalV1ProofPacket({
  now = new Date(),
  runCommand = runCommandSync,
  env = process.env
} = {}) {
  const branch = readCommand(runCommand, ['git', 'branch', '--show-current']) || '<branch>'
  const commit = readCommand(runCommand, ['git', 'rev-parse', 'HEAD']) || '<commit-sha>'
  const worktreeState = readGitWorktreeState(runCommand)
  const serial =
    env.ANDROID_SERIAL || readCommand(runCommand, ['adb', 'get-serialno']) || '<device-id>'
  const model =
    readCommand(runCommand, ['adb', 'shell', 'getprop', 'ro.product.model']) || '<android-model>'

  return [
    '# Final V1 Release Proof Packet',
    '',
    `Generated: ${now.toISOString()}`,
    '',
    '## Run Metadata',
    '',
    `- Commit SHA: ${commit}`,
    `- Branch: ${branch}`,
    `- Worktree state: ${worktreeState}`,
    '- `npm run v1:gate`: <pass/fail, paste summary>',
    '- Desktop mode: <normal Electron | Pear/Bare worker>',
    `- Android device: ${model}`,
    `- ANDROID_SERIAL: ${serial}`,
    '- Android runtime: <Metro/dev-client | installed debug APK | installed release APK>',
    '- Physical Profile QR scan: <pass/fail>',
    '- Advanced Debug Home QR scan (optional transport descriptor, not the trust path): <pass/fail/not run>',
    '- Home peer count at request receipt: <number observed on desktop>',
    '- Home peer count at accept/invite return: <number observed on desktop and Android>',
    '- Home peer count evidence source: <desktop #peerLabel; Android room-transport-debug after Advanced is opened; screenshot/log path>',
    '- Evidence: <screenshots/log paths or notes>',
    '',
    '## Preflight',
    '',
    ...FINAL_V1_PREFLIGHT_STEPS.map((step) => `- [ ] ${step}`),
    '',
    '## Product Path Checklist',
    '',
    ...FINAL_V1_PROOF_STEPS.map((step, index) => `- [ ] ${index + 1}. ${step}`),
    '',
    '## Passing Criteria',
    '',
    ...FINAL_V1_PASSING_CRITERIA.map((criterion) => `- [ ] ${criterion}`),
    '',
    '## Evidence Boundaries',
    '',
    ...FINAL_V1_EVIDENCE_BOUNDARIES.map((boundary) => `- ${boundary}`),
    '',
    '## Failure Notes',
    '',
    '- Failed step:',
    '- Observed behavior:',
    '- Expected behavior:',
    '- Follow-up fix/test/doc note:',
    '',
    'Do not mark V1 ready unless every checklist item and passing criterion is checked.'
  ].join('\n')
}

export function writeFinalV1ProofPacket(
  outputPath,
  packet,
  { mkdir = mkdirSync, writeFile = writeFileSync } = {}
) {
  const resolvedPath = resolve(outputPath)
  mkdir(dirname(resolvedPath), { recursive: true })
  writeFile(resolvedPath, `${packet}\n`, 'utf8')
  return resolvedPath
}

function readCommand(runCommand, command) {
  const result = runCommand(command)
  if (result.status !== 0) return ''
  return result.stdout.trim()
}

function readGitWorktreeState(runCommand) {
  const result = runCommand(['git', 'status', '--porcelain'])
  if (result.status !== 0) return '<worktree-state>'
  return result.stdout.trim() ? 'dirty (uncommitted changes present)' : 'clean'
}

function runCommandSync([command, ...args]) {
  const result = spawnSync(command, args, {
    encoding: 'utf8'
  })

  return {
    status: result.status ?? 1,
    stdout: result.stdout || ''
  }
}

function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printHelp()
    return
  }

  const packet = createFinalV1ProofPacket()
  let outputPath = ''
  try {
    outputPath = readFinalV1ProofPacketOutputPath(process.argv.slice(2))
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
    return
  }

  if (outputPath) {
    const writtenPath = writeFinalV1ProofPacket(outputPath, packet)
    console.log(`Wrote ${writtenPath}`)
    return
  }

  console.log(packet)
}

function printHelp() {
  console.log(`Usage: npm run v1:proof:packet -- [--output tmp/final-v1-proof.md]

Prints a markdown checklist for the final V1 desktop/Android product-path proof.
This helper is non-invasive: it does not launch apps, run smoke, reset storage, or
touch device state. It only fills branch/SHA and best-effort Android metadata.

Use --output to write the packet to a markdown file instead of printing it.`)
}

export function readFinalV1ProofPacketOutputPath(args) {
  const index = args.indexOf('--output')
  if (index === -1) return ''
  const outputPath = args[index + 1]
  if (!outputPath) {
    throw new Error('--output requires a file path')
  }
  return outputPath
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
