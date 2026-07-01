import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('android backend bundle transpiles TypeScript before bare-pack', () => {
  const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  const script = packageJson.scripts['backend:bundle:android']

  assert.match(script, /tsc -p tsconfig\.bare-bundle\.json/)
  assert.match(script, /tmp\/bare-bundle-js\/backend\/backend\.mjs/)
  assert.match(script, /check-bare-bundle-no-typescript\.mjs mobile\/app\.bundle\.mjs/)
})

test('bare bundle TypeScript emit rewrites relative ts imports', () => {
  const tsconfig = JSON.parse(
    readFileSync(new URL('../tsconfig.bare-bundle.json', import.meta.url), 'utf8')
  )

  assert.equal(tsconfig.compilerOptions.noEmit, false)
  assert.equal(tsconfig.compilerOptions.allowImportingTsExtensions, false)
  assert.equal(tsconfig.compilerOptions.rewriteRelativeImportExtensions, true)
})

test('Expo Metro resolves local JavaScript specifiers to TypeScript mobile source', () => {
  const metroConfig = readFileSync(new URL('../metro.config.cjs', import.meta.url), 'utf8')
  const mobileApp = readFileSync(new URL('../mobile/App.tsx', import.meta.url), 'utf8')

  assert.match(metroConfig, /mapLocalJavaScriptSpecifierToTypeScriptSource/)
  assert.match(metroConfig, /moduleName\.endsWith\('\.js'\)/)
  assert.equal(metroConfig.includes("['.ts', '.tsx']"), true)
  assert.match(metroConfig, /context\.resolveRequest\(context, mappedModuleName, platform\)/)
  assert.match(mobileApp, /from '\.\/styles\.js'/)
  assert.match(mobileApp, /from '\.\/chrome-components\.js'/)
  assert.match(mobileApp, /from '\.\/room-components\.js'/)
  assert.doesNotMatch(mobileApp, /app\.bundle\.mjs\.js/)
})

test('android backend trims outgoing text at the RPC boundary', () => {
  const source = readFileSync(new URL('../backend/backend.mjs', import.meta.url), 'utf8')
  const rpcSend = sliceBetween(
    source,
    'if (req.command === RPC_SEND)',
    'if (req.command === RPC_LEAVE)'
  )
  const sendHomeMessage = sliceBetween(
    source,
    'function sendHomeMessage',
    'async function postTreehole'
  )
  const postTreehole = sliceBetween(
    source,
    'async function postTreehole',
    'async function commentTreehole'
  )
  const commentTreehole = sliceBetween(
    source,
    'async function commentTreehole',
    'async function likeTreehole'
  )
  const sendMessageRequest = sliceBetween(
    source,
    'function sendMessageRequest',
    'async function acceptMessageRequest'
  )
  const acceptMessageRequest = sliceBetween(
    source,
    'async function acceptMessageRequest',
    'async function acceptDmInvite'
  )
  const acceptDmInvite = sliceBetween(
    source,
    'async function acceptDmInvite',
    'function canAcceptIncomingDmInvite'
  )
  const canAcceptIncomingDmInvite = sliceBetween(
    source,
    'function canAcceptIncomingDmInvite',
    'function sendDmBody'
  )
  const leaveRoom = sliceBetween(source, 'async function leaveRoom', 'function openTreehole')
  const rpcTreeholePolicy = sliceBetween(
    source,
    'if (req.command === RPC_TREEHOLE_POLICY)',
    'if (req.command === RPC_DM_INVITE_SEND)'
  )
  const handleControlDmBody = sliceBetween(
    source,
    "if (message.type === 'kepos.dm.body.v1')",
    "if (message.type === 'treehole.bootstrap')"
  )
  const sendDmBody = sliceBetween(source, 'function sendDmBody', 'async function revokeDmByProfile')

  assert.match(source, /let allowHomeDmBodyFallback = false/)
  assert.match(source, /const outgoingMessageRequestsByProfileId = new Map\(\)/)
  assert.match(leaveRoom, /outgoingMessageRequestsByProfileId\.clear\(\)/)
  assert.match(source, /RPC_TREEHOLE_POLICY/)
  assert.match(rpcTreeholePolicy, /await updateTreeholePolicy\(payload\)/)
  assert.match(source, /async function updateTreeholePolicy\(payload\)/)
  assert.match(source, /treeholePolicy = payload\.treeholePolicy \|\| null/)
  assert.match(source, /treehole\?\.updateTreeholePolicy\?\.\(treeholePolicy\)/)
  assert.match(source, /allowHomeDmBodyFallback = payload\.allowHomeDmBodyFallback === true/)
  assert.match(source, /allowHomeDmBodyFallback = false/)
  assert.match(source, /function cleanRequiredText\(text\)/)
  assert.match(source, /throw new Error\('Text is required'\)/)
  assert.match(rpcSend, /sendHomeMessage\(payload\)/)
  assert.doesNotMatch(rpcSend, /room\?\.send\(payload\)/)
  assert.match(sendHomeMessage, /const text = cleanRequiredText\(payload\.text\)/)
  assert.match(sendHomeMessage, /room\.send\(\{[\s\S]*\.\.\.payload,[\s\S]*text/)
  assert.doesNotMatch(sendHomeMessage, /text: payload\.text/)
  assert.match(postTreehole, /const text = cleanRequiredText\(payload\.text\)/)
  assert.match(commentTreehole, /const text = cleanRequiredText\(payload\.text\)/)
  assert.match(sendMessageRequest, /const text = cleanRequiredText\(payload\.text\)/)
  assert.match(sendMessageRequest, /outgoingMessageRequestsByProfileId\.set\(/)
  assert.match(acceptMessageRequest, /canAcceptIncomingMessageRequest\(request\)/)
  assert.match(acceptMessageRequest, /verifyMessageRequest\(request\)/)
  assert.match(acceptMessageRequest, /request\.toProfileId !== profileId/)
  assert.match(acceptMessageRequest, /revokedProfileIds\?\.includes\(request\.fromProfileId\)/)
  assert.match(
    acceptDmInvite,
    /outgoingMessageRequestsByProfileId\.delete\(invite\.fromProfileId\)/
  )
  assert.match(canAcceptIncomingDmInvite, /trustedProfileIds\?\.includes\(fromProfileId\)/)
  assert.match(
    canAcceptIncomingDmInvite,
    /outgoingMessageRequestsByProfileId\.get\(fromProfileId\) === invite\?\.requestId\?\.trim\(\)/
  )
  assert.match(sendDmBody, /const text = cleanRequiredText\(payload\.text\)/)
  assert.match(handleControlDmBody, /if \(!allowHomeDmBodyFallback\)/)
  assert.match(sendDmBody, /if \(allowHomeDmBodyFallback\)/)
  assert.doesNotMatch(postTreehole, /text: payload\.text/)
  assert.doesNotMatch(commentTreehole, /text: payload\.text/)
  assert.doesNotMatch(sendMessageRequest, /text: payload\.text/)
  assert.doesNotMatch(sendDmBody, /text: payload\.text/)
})

test('android backend forwards avatar media controls between Home peers and UI', () => {
  const source = readFileSync(new URL('../backend/backend.mjs', import.meta.url), 'utf8')
  const joinRoom = sliceBetween(source, 'async function joinRoom', 'async function leaveRoom')
  const handleHomeHello = sliceBetween(
    source,
    "if (message.type === 'kepos.home.hello.v1')",
    "if (message.type === 'kepos.message.request.v1')"
  )
  const handleAvatarControl = sliceBetween(
    source,
    "if (message.type === 'kepos.avatar.media.bytes.v1')",
    "if (message.type === 'kepos.message.request.v1')"
  )

  assert.match(source, /RPC_AVATAR_MEDIA_BYTES/)
  assert.match(source, /let localAvatarMediaControl = null/)
  assert.match(joinRoom, /localAvatarMediaControl = payload\.localAvatarMediaControl \|\| null/)
  assert.match(source, /localAvatarMediaControl = null/)
  assert.match(handleHomeHello, /sendProfileAvatarMedia\(peer\)/)
  assert.match(handleAvatarControl, /sendToUI\(RPC_AVATAR_MEDIA_BYTES, message\)/)
  assert.match(source, /function sendProfileAvatarMedia\(peer\)/)
  assert.match(source, /room\.sendControl\(peer, localAvatarMediaControl\)/)
})

function sliceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker)
  const end = source.indexOf(endMarker, start)

  assert.notEqual(start, -1)
  assert.notEqual(end, -1)

  return source.slice(start, end)
}
