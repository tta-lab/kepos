import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { readRpcPayload } from '../src/rpc-payload.ts'

test('RPC payload parser returns empty object for empty request data', () => {
  assert.deepEqual(readRpcPayload({}), {})
  assert.deepEqual(readRpcPayload({ data: new Uint8Array() }), {})
})

test('RPC payload parser decodes JSON request bytes', () => {
  const data = new TextEncoder().encode(JSON.stringify({ body: 'hello', count: 2 }))

  assert.deepEqual(readRpcPayload({ data }), {
    body: 'hello',
    count: 2
  })
})

test('mobile app delegates RPC request data parsing to typed module', async () => {
  const source = await readFile(new URL('../mobile/App.tsx', import.meta.url), 'utf8')

  assert.match(source, /import \{ readRpcPayload \} from '\.\.\/src\/rpc-payload\.ts'/)
  assert.doesNotMatch(source, /import b4a from 'b4a'/)
  assert.doesNotMatch(source, /function readRpcPayload\(/)
})
