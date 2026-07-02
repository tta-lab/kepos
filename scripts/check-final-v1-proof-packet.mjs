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

export function validateFinalV1ProofPacket(contents) {
  const failures = []
  const lines = contents.split(/\r?\n/)
  const uncheckedItems = lines.filter((line) => /^- \[ \]/.test(line))
  const checkedItems = lines.filter((line) => /^- \[[xX]\]/.test(line))
  const placeholders = contents.match(/<[^>\n]+>/g) || []
  const worktreeState = contents.match(/^- Worktree state: (.+)$/m)?.[1]?.trim() || ''
  const v1Gate = contents.match(/^- `npm run v1:gate`: (.+)$/m)?.[1]?.trim() || ''

  if (!contents.includes('# Final V1 Release Proof Packet')) {
    failures.push('missing final V1 proof packet title')
  }

  if (checkedItems.length < EXPECTED_CHECKED_ITEMS) {
    failures.push(
      `expected at least ${EXPECTED_CHECKED_ITEMS} checked release items, found ${checkedItems.length}`
    )
  }

  if (uncheckedItems.length > 0) {
    failures.push(`found ${uncheckedItems.length} unchecked release items`)
  }

  if (placeholders.length > 0) {
    failures.push(`found unresolved placeholders: ${Array.from(new Set(placeholders)).join(', ')}`)
  }

  if (worktreeState !== 'clean') {
    failures.push(`worktree state must be clean, found ${worktreeState || 'missing'}`)
  }

  if (!v1Gate || v1Gate.includes('<') || !/\bpass(?:ed)?\b/i.test(v1Gate)) {
    failures.push('`npm run v1:gate` must be recorded as passed')
  }

  return {
    checkedItems: checkedItems.length,
    failures,
    ok: failures.length === 0,
    uncheckedItems: uncheckedItems.length
  }
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
items are still unchecked, placeholders remain, the worktree was not clean, or
\`npm run v1:gate\` was not recorded as passed.`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
