import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('Android backend wires optional direct transport into p2p room', async () => {
  const source = await readFile(new URL('../backend/backend.mjs', import.meta.url), 'utf8')

  assert.match(
    source,
    /import \{ createDirectRoomTransport \} from '\.\.\/src\/direct-room-transport\.js'/
  )
  assert.match(source, /createDirectTransport:\s*payload\.directTransport/)
  assert.match(source, /createDirectRoomTransport\(\{[\s\S]*\.\.\.payload\.directTransport/)
})

test('Android backend preserves remote treehole snapshots across local empty refreshes', async () => {
  const source = await readFile(new URL('../backend/backend.mjs', import.meta.url), 'utf8')

  assert.match(
    source,
    /import \{ mergeTreeholeSnapshots \} from '\.\.\/src\/treehole-snapshot-merge\.js'/
  )
  assert.match(
    source,
    /remoteTreeholeSnapshot = mergeTreeholeSnapshots\(remoteTreeholeSnapshot, message\.snapshot\)/
  )
  assert.match(
    source,
    /publish: \(snapshot\) => sendToUI\(RPC_TREEHOLE_STATE, createTreeholeSnapshotForUI\(snapshot\)\)/
  )
  assert.match(
    source,
    /function createTreeholeSnapshotForUI\(localSnapshot = null\) \{[\s\S]*return mergeTreeholeSnapshots\(remoteTreeholeSnapshot, localSnapshot\)/
  )
})

test('Android backend broadcasts and receives signed DM body fallback frames', async () => {
  const source = await readFile(new URL('../backend/backend.mjs', import.meta.url), 'utf8')

  assert.match(source, /type: 'kepos\.dm\.body\.v1'/)
  assert.match(
    source,
    /room\?\.broadcastControl\(\{[\s\S]*message,[\s\S]*type: 'kepos\.dm\.body\.v1'/
  )
  assert.match(
    source,
    /if \(message\.type === 'kepos\.dm\.body\.v1'\) \{[\s\S]*dmRuntime\?\.receiveMessage\(message\.message\)/
  )
})
