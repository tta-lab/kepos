import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('desktop shares treehole capabilities only after signed home hello', async () => {
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const runtime = await readFile(new URL('../src/desktop-home-runtime.js', import.meta.url), 'utf8')

  assert.match(runtime, /createHomeHello/)
  assert.match(runtime, /verifyHomeHello/)
  assert.match(controller, /onVerifiedHello: \(message, peer\) => sendTreeholeBootstrap\(peer/)
  assert.doesNotMatch(controller, /broadcastControl\(\{\s*key: treehole\.key/s)
  assert.doesNotMatch(controller, /broadcastControl\(\{\s*key: treehole\.localWriterKey/s)
})

test('android backend shares treehole capabilities only after signed home hello', async () => {
  const source = await readFile(new URL('../backend/backend.mjs', import.meta.url), 'utf8')

  assert.match(source, /createHomeHello/)
  assert.match(source, /verifyHomeHello/)
  assert.match(source, /sendTreeholeBootstrap\(peer/)
  assert.doesNotMatch(source, /broadcastControl\(\{\s*type: 'treehole\.bootstrap'/s)
  assert.doesNotMatch(source, /broadcastControl\(\{\s*type: 'treehole\.writer'/s)
})

test('android backend reports whether the local profile can post to treehole', async () => {
  const source = await readFile(new URL('../backend/backend.mjs', import.meta.url), 'utf8')

  assert.match(source, /function canPostToCurrentTreehole\(\)/)
  assert.match(source, /canPost: canPostToCurrentTreehole\(\)/)
  assert.match(source, /homeOwnerProfileId \|\| profileId/)
  assert.match(
    source,
    /return Boolean\(profileId && ownerProfileId && profileId === ownerProfileId\)/
  )
})

test('desktop room actions report whether the local profile can post to treehole', async () => {
  const source = await readFile(new URL('../src/desktop-room-actions.js', import.meta.url), 'utf8')

  assert.match(source, /canPost: getTreeholeRuntime\(\)\.canPost\(\)/)
  assert.doesNotMatch(source, /canPostToCurrentTreehole/)
})

test('android backend reports whether the local profile can interact with treehole', async () => {
  const source = await readFile(new URL('../backend/backend.mjs', import.meta.url), 'utf8')

  assert.match(source, /function canInteractWithCurrentTreehole\(\)/)
  assert.match(source, /canInteract: canInteractWithCurrentTreehole\(\)/)
  assert.match(source, /canGrantTreeholeWriter\(\{/)
  assert.match(source, /writerProfileId: profileId/)
})
