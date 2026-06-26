import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('desktop shares treehole capabilities only after signed home hello', async () => {
  const source = await readFile(new URL('../desktop/app.js', import.meta.url), 'utf8')

  assert.match(source, /createHomeHello/)
  assert.match(source, /verifyHomeHello/)
  assert.match(source, /sendTreeholeBootstrap\(peer/)
  assert.doesNotMatch(source, /broadcastControl\(\{\s*key: treehole\.key/s)
  assert.doesNotMatch(source, /broadcastControl\(\{\s*key: treehole\.localWriterKey/s)
})

test('android backend shares treehole capabilities only after signed home hello', async () => {
  const source = await readFile(new URL('../backend/backend.mjs', import.meta.url), 'utf8')

  assert.match(source, /createHomeHello/)
  assert.match(source, /verifyHomeHello/)
  assert.match(source, /sendTreeholeBootstrap\(peer/)
  assert.doesNotMatch(source, /broadcastControl\(\{\s*type: 'treehole\.bootstrap'/s)
  assert.doesNotMatch(source, /broadcastControl\(\{\s*type: 'treehole\.writer'/s)
})
