import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { parseArgs } from '../src/cli.js'

describe('CLI args', () => {
  test('create accepts --nick without a room key placeholder', () => {
    const args = parseArgs(['create', '--nick', 'Neil'])

    assert.equal(args.command, 'create')
    assert.equal(args.nick, 'Neil')
    assert.match(args.roomKey, /^[0-9a-f]{64}$/)
  })

  test('join accepts a room key and nick', () => {
    const roomKey = 'a'.repeat(64)
    const args = parseArgs(['join', roomKey, '--nick', 'Ada'])

    assert.deepEqual(args, {
      command: 'join',
      roomKey,
      nick: 'Ada'
    })
  })
})
