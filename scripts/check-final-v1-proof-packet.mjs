#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import {
  FINAL_V1_PASSING_CRITERIA,
  FINAL_V1_PREFLIGHT_STEPS,
  FINAL_V1_PROOF_STEPS
} from './final-v1-proof-packet.mjs'

const DEFAULT_PROOF_PACKET_PATH = 'tmp/final-v1-proof.md'
const EXPECTED_CHECKED_ITEMS =
  FINAL_V1_PREFLIGHT_STEPS.length + FINAL_V1_PROOF_STEPS.length + FINAL_V1_PASSING_CRITERIA.length
const REQUIRED_CHECKED_ITEM_TEXT = [
  ...FINAL_V1_PREFLIGHT_STEPS,
  ...FINAL_V1_PROOF_STEPS.map((step, index) => `${index + 1}. ${step}`),
  ...FINAL_V1_PASSING_CRITERIA
]

export function validateFinalV1ProofPacket(contents) {
  const failures = []
  const lines = contents.split(/\r?\n/)
  const uncheckedItems = lines.filter((line) => /^- \[ \]/.test(line))
  const checkedItems = lines.filter((line) => /^- \[[xX]\]/.test(line))
  const checkedItemText = new Set(
    checkedItems.map((line) => line.replace(/^- \[[xX]\]\s*/, '').trim())
  )
  const placeholders = contents.match(/<[^>\n]+>/g) || []
  const commitSha = contents.match(/^- Commit SHA: (.+)$/m)?.[1]?.trim() || ''
  const branch = contents.match(/^- Branch: (.+)$/m)?.[1]?.trim() || ''
  const worktreeState = contents.match(/^- Worktree state: (.+)$/m)?.[1]?.trim() || ''
  const v1Gate = contents.match(/^- `npm run v1:gate`: (.+)$/m)?.[1]?.trim() || ''
  const desktopMode = contents.match(/^- Desktop mode: (.+)$/m)?.[1]?.trim() || ''
  const androidDevice = contents.match(/^- Android device: (.+)$/m)?.[1]?.trim() || ''
  const androidSerial = contents.match(/^- ANDROID_SERIAL: (.+)$/m)?.[1]?.trim() || ''
  const androidRuntime = contents.match(/^- Android runtime: (.+)$/m)?.[1]?.trim() || ''
  const physicalProfileQr = contents.match(/^- Physical Profile QR scan: (.+)$/m)?.[1]?.trim() || ''
  const requestPeerCountDesktop =
    contents.match(/^- Home peer count at request receipt \(desktop\): (.+)$/m)?.[1]?.trim() || ''
  const requestPeerCountAndroid =
    contents.match(/^- Home peer count at request receipt \(Android\): (.+)$/m)?.[1]?.trim() || ''
  const acceptPeerCountDesktop =
    contents
      .match(/^- Home peer count at accept\/invite return \(desktop\): (.+)$/m)?.[1]
      ?.trim() || ''
  const acceptPeerCountAndroid =
    contents
      .match(/^- Home peer count at accept\/invite return \(Android\): (.+)$/m)?.[1]
      ?.trim() || ''
  const peerCountEvidenceSource =
    contents.match(/^- Home peer count evidence source: (.+)$/m)?.[1]?.trim() || ''
  const evidence = contents.match(/^- Evidence: (.+)$/m)?.[1]?.trim() || ''

  if (!contents.includes('# Final V1 Release Proof Packet')) {
    failures.push('missing final V1 proof packet title')
  }

  if (checkedItems.length < EXPECTED_CHECKED_ITEMS) {
    failures.push(
      `expected at least ${EXPECTED_CHECKED_ITEMS} checked release items, found ${checkedItems.length}`
    )
  }

  const missingRequiredItems = REQUIRED_CHECKED_ITEM_TEXT.filter(
    (item) => !checkedItemText.has(item)
  )
  if (missingRequiredItems.length > 0) {
    failures.push(
      `missing required checked release items: ${missingRequiredItems.slice(0, 3).join('; ')}${
        missingRequiredItems.length > 3 ? '; ...' : ''
      }`
    )
  }

  if (uncheckedItems.length > 0) {
    failures.push(`found ${uncheckedItems.length} unchecked release items`)
  }

  if (placeholders.length > 0) {
    failures.push(`found unresolved placeholders: ${Array.from(new Set(placeholders)).join(', ')}`)
  }

  if (!isCommitShaEvidence(commitSha)) {
    failures.push('Commit SHA must be recorded as a git SHA')
  }

  if (!isMeaningfulMetadata(branch)) {
    failures.push('Branch must be recorded')
  }

  if (worktreeState !== 'clean') {
    failures.push(`worktree state must be clean, found ${worktreeState || 'missing'}`)
  }

  if (!isPassedEvidence(v1Gate)) {
    failures.push('`npm run v1:gate` must be recorded as passed')
  }

  if (!isAllowedDesktopMode(desktopMode)) {
    failures.push('Desktop mode must be recorded as normal Electron or Pear/Bare worker')
  }

  if (!isMeaningfulMetadata(androidDevice)) {
    failures.push('Android device model must be recorded')
  }

  if (!isMeaningfulMetadata(androidSerial)) {
    failures.push('ANDROID_SERIAL must be recorded')
  }

  if (!isAllowedAndroidRuntime(androidRuntime)) {
    failures.push(
      'Android runtime must be recorded as Metro/dev-client, installed debug APK, or installed release APK'
    )
  }

  if (!isPassedEvidence(physicalProfileQr)) {
    failures.push('Physical Profile QR scan must be recorded as passed')
  }

  if (!isZeroPeerCountEvidence(requestPeerCountDesktop)) {
    failures.push('Home peer count at request receipt on desktop must be recorded as numeric zero')
  }

  if (!isZeroPeerCountEvidence(requestPeerCountAndroid)) {
    failures.push('Home peer count at request receipt on Android must be recorded as numeric zero')
  }

  if (!isZeroPeerCountEvidence(acceptPeerCountDesktop)) {
    failures.push(
      'Home peer count at accept/invite return on desktop must be recorded as numeric zero'
    )
  }

  if (!isZeroPeerCountEvidence(acceptPeerCountAndroid)) {
    failures.push(
      'Home peer count at accept/invite return on Android must be recorded as numeric zero'
    )
  }

  if (!hasPeerCountEvidenceSource(peerCountEvidenceSource)) {
    failures.push('Home peer count evidence source must include desktop and Android evidence')
  }

  if (!isMeaningfulMetadata(evidence)) {
    failures.push('Evidence notes or artifact paths must be recorded')
  }

  return {
    checkedItems: checkedItems.length,
    failures,
    ok: failures.length === 0,
    uncheckedItems: uncheckedItems.length
  }
}

function isMeaningfulMetadata(value) {
  if (!value || value.includes('<')) return false
  return value.trim().length > 0
}

function isCommitShaEvidence(value) {
  if (!isMeaningfulMetadata(value)) return false
  return /^[0-9a-f]{7,40}$/i.test(value)
}

function isAllowedDesktopMode(value) {
  if (!isMeaningfulMetadata(value)) return false
  return /^(?:normal Electron|Pear\/Bare worker)$/i.test(value)
}

function isAllowedAndroidRuntime(value) {
  if (!isMeaningfulMetadata(value)) return false
  return /^(?:Metro\/dev-client|installed debug APK|installed release APK)$/i.test(value)
}

function hasPeerCountEvidenceSource(value) {
  if (!isMeaningfulMetadata(value)) return false
  return /desktop/i.test(value) && /android/i.test(value)
}

function isZeroPeerCountEvidence(value) {
  if (!value || value.includes('<')) return false

  const numbers = value.match(/\d+/g) || []
  return numbers.length > 0 && numbers.every((number) => Number(number) === 0)
}

function isPassedEvidence(value) {
  if (!value || value.includes('<')) return false
  if (/\b(?:fail(?:ed)?|not\s+pass(?:ed)?|not\s+run|skip(?:ped)?)\b/i.test(value)) return false
  return /\bpass(?:ed)?\b/i.test(value)
}

export function readFinalV1ProofCheckPath(args) {
  const index = args.indexOf('--file')
  if (index === -1) return DEFAULT_PROOF_PACKET_PATH
  const filePath = args[index + 1]
  if (!filePath) {
    throw new Error('--file requires a path')
  }
  return filePath
}

function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printHelp()
    return
  }

  let filePath = DEFAULT_PROOF_PACKET_PATH
  try {
    filePath = readFinalV1ProofCheckPath(process.argv.slice(2))
    const result = validateFinalV1ProofPacket(readFileSync(filePath, 'utf8'))
    if (!result.ok) {
      console.error(`Final V1 proof packet is incomplete: ${filePath}`)
      for (const failure of result.failures) console.error(`- ${failure}`)
      process.exitCode = 1
      return
    }

    console.log(
      `Final V1 proof packet looks complete: ${filePath} (${result.checkedItems} checked items)`
    )
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}

function printHelp() {
  console.log(`Usage: npm run v1:proof:check -- [--file tmp/final-v1-proof.md]

Checks the recorded Final V1 Release Proof Packet after a manual cross-device run.
This helper is non-invasive: it only reads the packet and fails if required proof
items are missing or still unchecked, placeholders remain, the worktree was not
clean, run metadata is incomplete, \`npm run v1:gate\` was not recorded as
passed, physical Profile QR scan was not recorded as passed, or desktop and Android Home peer counts were not each recorded as numeric zero during request receipt and accept/invite return.`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
