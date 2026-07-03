import assert from 'node:assert/strict'
import test from 'node:test'
import { createDesktopFileStorage } from '../src/desktop-file-storage.ts'

test('desktop file storage persists localStorage-shaped values', () => {
  const writes = new Map()
  const fs = createMemoryFs(writes)

  const storage = createDesktopFileStorage({
    basePath: '/user-data/kepos/v1',
    fs
  })

  storage.setItem('kepos.v1.identity', '{"profile":"alice"}')

  assert.equal(storage.getItem('kepos.v1.identity'), '{"profile":"alice"}')
  assert.deepEqual(
    [...writes],
    [
      [
        '/user-data/kepos/v1/desktop-storage.json',
        JSON.stringify({ 'kepos.v1.identity': '{"profile":"alice"}' })
      ]
    ]
  )
})

test('desktop file storage loads existing values and removes keys', () => {
  const writes = new Map([
    [
      '/user-data/kepos/v1/desktop-storage.json',
      JSON.stringify({
        'kepos.contactBook.v1': '{"contacts":[]}',
        'kepos.profile.id': 'alice'
      })
    ]
  ])
  const storage = createDesktopFileStorage({
    basePath: '/user-data/kepos/v1',
    fs: createMemoryFs(writes)
  })

  assert.equal(storage.getItem('kepos.profile.id'), 'alice')

  storage.removeItem('kepos.profile.id')

  assert.equal(storage.getItem('kepos.profile.id'), null)
  assert.equal(
    writes.get('/user-data/kepos/v1/desktop-storage.json'),
    JSON.stringify({ 'kepos.contactBook.v1': '{"contacts":[]}' })
  )
})

test('desktop file storage merges latest file values when separate instances persist', () => {
  const writes = new Map()
  const fs = createMemoryFs(writes)
  const first = createDesktopFileStorage({
    basePath: '/user-data/kepos/v1',
    fs
  })
  const second = createDesktopFileStorage({
    basePath: '/user-data/kepos/v1',
    fs
  })

  first.setItem('kepos.contactBook.v1', '{"revoked":true}')
  second.setItem('kepos.dmThreads.v1', '{"threads":[]}')

  assert.deepEqual(JSON.parse(writes.get('/user-data/kepos/v1/desktop-storage.json')), {
    'kepos.contactBook.v1': '{"revoked":true}',
    'kepos.dmThreads.v1': '{"threads":[]}'
  })
})

test('desktop file storage fails closed without a base path', () => {
  assert.throws(() => createDesktopFileStorage({ basePath: '' }), /Desktop storage base path/)
})

function createMemoryFs(files) {
  return {
    existsSync(path) {
      return files.has(path)
    },
    mkdirSync() {},
    readFileSync(path) {
      return files.get(path)
    },
    writeFileSync(path, value) {
      files.set(path, value)
    }
  }
}
