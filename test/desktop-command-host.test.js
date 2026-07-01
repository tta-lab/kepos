import assert from 'node:assert/strict'
import test from 'node:test'
import { DESKTOP_COMMANDS } from '../src/desktop-command-vocabulary.ts'
import { createDesktopCommandHost } from '../src/desktop-command-host.ts'

function createActions(calls) {
  return Object.fromEntries(
    DESKTOP_COMMANDS.map((command) => [
      command,
      (payload) => {
        calls.push([command, payload])
        return `${command}:ok`
      }
    ])
  )
}

test('desktop command host requires an action for every V1 command', () => {
  const calls = []
  const actions = createActions(calls)
  delete actions.acceptMessageRequest

  assert.throws(() => createDesktopCommandHost({ actions }), /Missing desktop command action/)
})

test('desktop command host normalizes command payloads before calling actions', async () => {
  const calls = []
  const host = createDesktopCommandHost({ actions: createActions(calls) })
  const message = { id: 'request-1' }

  await host.dispatch('acceptMessageRequest', { message })
  await host.dispatch('allowContactRequests', { profileId: 'friend' })
  await host.dispatch('commentTreehole', { postId: 'post-1', text: 'hello' })
  await host.dispatch('enterContactHome', { profileId: 'friend' })
  await host.dispatch('ignoreMessageRequest', { message, profileId: 'friend' })
  await host.dispatch('joinHome', { mode: 'host' })
  await host.dispatch('joinHomeUri', { uri: 'kepos://home' })
  await host.dispatch('leaveHome', { ignored: true })
  await host.dispatch('likeTreehole', { postId: 'post-1' })
  await host.dispatch('markDmThreadRead', { profileId: 'friend', readAt: 1234 })
  await host.dispatch('postTreehole', { text: 'post' })
  await host.dispatch('revokeContact', { profileId: 'friend' })
  await host.dispatch('sendDmMessage', { text: 'dm', toProfileId: 'friend' })
  await host.dispatch('sendHomeMessage', { text: 'chat' })
  await host.dispatch('sendMessageRequest', { ignored: true })
  await host.dispatch('prepareProfileRequestTarget', { uri: 'kepos://profile' })
  await host.dispatch('updateAvatarMedia', { bytesBase64: 'aGVsbG8=', mimeType: 'image/png' })
  await host.dispatch('updateDisplayName', { displayName: 'Ada' })

  assert.deepEqual(calls, [
    ['acceptMessageRequest', message],
    ['allowContactRequests', 'friend'],
    ['commentTreehole', { postId: 'post-1', text: 'hello' }],
    ['enterContactHome', { profileId: 'friend' }],
    ['ignoreMessageRequest', { message, profileId: 'friend' }],
    ['joinHome', { mode: 'host' }],
    ['joinHomeUri', { uri: 'kepos://home' }],
    ['leaveHome', undefined],
    ['likeTreehole', 'post-1'],
    ['markDmThreadRead', { profileId: 'friend', readAt: 1234 }],
    ['postTreehole', { text: 'post' }],
    ['revokeContact', 'friend'],
    ['sendDmMessage', { text: 'dm', toProfileId: 'friend' }],
    ['sendHomeMessage', { text: 'chat' }],
    ['sendMessageRequest', undefined],
    ['prepareProfileRequestTarget', { uri: 'kepos://profile' }],
    ['updateAvatarMedia', { bytesBase64: 'aGVsbG8=', mimeType: 'image/png' }],
    ['updateDisplayName', { displayName: 'Ada' }]
  ])
})

test('desktop command host ignores commands missing required entity ids', async () => {
  const calls = []
  const host = createDesktopCommandHost({ actions: createActions(calls) })

  await host.dispatch('acceptMessageRequest', {})
  await host.dispatch('allowContactRequests', {})
  await host.dispatch('enterContactHome', {})
  await host.dispatch('likeTreehole', {})
  await host.dispatch('revokeContact', {})

  assert.deepEqual(calls, [])
})
