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

test('Expo Metro keeps TypeScript mobile imports compatible', () => {
  const metroConfig = readFileSync(new URL('../metro.config.cjs', import.meta.url), 'utf8')
  const mobileApp = readFileSync(new URL('../mobile/App.tsx', import.meta.url), 'utf8')

  assert.match(metroConfig, /mapLocalJavaScriptSpecifierToTypeScriptSource/)
  assert.match(metroConfig, /moduleName\.endsWith\('\.js'\)/)
  assert.equal(metroConfig.includes("['.ts', '.tsx']"), true)
  assert.match(metroConfig, /context\.resolveRequest\(context, mappedModuleName, platform\)/)
  assert.match(mobileApp, /from '\.\/styles\.ts'/)
  assert.match(mobileApp, /from '\.\/chrome-components\.tsx'/)
  assert.match(mobileApp, /from '\.\/room-components\.tsx'/)
  assert.doesNotMatch(mobileApp, /from '\.\/[^']+\.js'/)
  assert.doesNotMatch(mobileApp, /app\.bundle\.mjs\.js/)
})

test('android backend trims outgoing text at the RPC boundary', () => {
  const source = readFileSync(new URL('../backend/backend.mjs', import.meta.url), 'utf8')
  const rpcSend = sliceBetween(
    source,
    'if (req.command === RPC_SEND)',
    'if (req.command === RPC_LEAVE)'
  )
  const joinRoom = sliceBetween(source, 'async function joinRoom', 'async function leaveRoom')
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
  const sendProfileMessageRequest = sliceBetween(
    source,
    'async function sendProfileMessageRequest',
    'async function acceptMessageRequest'
  )
  const resendOutgoingMessageRequests = sliceBetween(
    source,
    'function resendOutgoingMessageRequests',
    'function sendTreeholeBootstrap'
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
  const leaveRoom = sliceBetween(
    source,
    'async function leaveRoom',
    'async function startProfileService'
  )
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

  assert.match(source, /let allowDebugHomeDmBodyFallback = false/)
  assert.match(source, /let allowDebugHomeTrustFallback = false/)
  assert.doesNotMatch(source, /allowHomeDmBodyFallback/)
  assert.doesNotMatch(source, /allowHomeTrustFallback/)
  assert.match(source, /const outgoingMessageRequestsByProfileId = new Map\(\)/)
  assert.doesNotMatch(leaveRoom, /profileRequestRuntime\?\.close\(\)/)
  assert.doesNotMatch(leaveRoom, /dmRuntime\?\.closeAll\(\)/)
  assert.doesNotMatch(leaveRoom, /outgoingMessageRequestsByProfileId\.clear\(\)/)
  assert.match(source, /RPC_PROFILE_START/)
  assert.match(source, /RPC_PROFILE_REQUEST_SEND/)
  assert.match(source, /RPC_PROFILE_REQUEST_STATE/)
  assert.match(source, /RPC_PROFILE_HOME_DESCRIPTOR/)
  assert.match(source, /createProfileFriendRequestRuntime\(/)
  assert.match(source, /createProfileHomeDescriptorFrame/)
  assert.match(joinRoom, /resendOutgoingMessageRequests\(peer\)/)
  assert.match(
    resendOutgoingMessageRequests,
    /if \(!allowDebugHomeTrustFallback \|\| !room \|\| !peer\)/
  )
  assert.match(resendOutgoingMessageRequests, /outgoingMessageRequestsByProfileId\.values\(\)/)
  assert.match(resendOutgoingMessageRequests, /room\.sendControl\(peer, request\)/)
  assert.match(source, /RPC_TREEHOLE_POLICY/)
  assert.match(rpcTreeholePolicy, /await updateTreeholePolicy\(payload\)/)
  assert.match(source, /async function updateTreeholePolicy\(payload\)/)
  assert.match(source, /treeholePolicy = payload\.treeholePolicy \|\| null/)
  assert.match(source, /treehole\?\.updateTreeholePolicy\?\.\(treeholePolicy\)/)
  assert.match(
    source,
    /allowDebugHomeDmBodyFallback = payload\.allowDebugHomeDmBodyFallback === true/
  )
  assert.match(
    source,
    /allowDebugHomeTrustFallback = payload\.allowDebugHomeTrustFallback === true/
  )
  assert.match(source, /allowDebugHomeDmBodyFallback = false/)
  assert.match(source, /allowDebugHomeTrustFallback = false/)
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
  assert.match(sendMessageRequest, /if \(!allowDebugHomeTrustFallback\)/)
  assert.match(sendMessageRequest, /Home trust fallback is not enabled/)
  assert.match(sendProfileMessageRequest, /const text = cleanRequiredText\(payload\.text\)/)
  assert.match(sendProfileMessageRequest, /profileRequestRuntime\.send\(request\)/)
  assert.match(sendProfileMessageRequest, /sendToUI\(RPC_PROFILE_REQUEST_STATE/)
  assert.match(
    sendMessageRequest,
    /outgoingMessageRequestsByProfileId\.set\(request\.toProfileId, request\)/
  )
  assert.match(acceptMessageRequest, /canAcceptIncomingMessageRequest\(request\)/)
  assert.match(acceptMessageRequest, /verifyMessageRequest\(request\)/)
  assert.match(acceptMessageRequest, /request\.toProfileId !== profileId/)
  assert.match(acceptMessageRequest, /revokedProfileIds\?\.includes\(request\.fromProfileId\)/)
  assert.match(acceptMessageRequest, /const delivery = await profileRequestRuntime\.send\(invite\)/)
  assert.match(acceptMessageRequest, /sendLocalHomeDescriptor\(request\.fromProfileId\)\.catch/)
  assert.match(acceptMessageRequest, /sendToUI\(RPC_PROFILE_REQUEST_STATE/)
  assert.match(acceptMessageRequest, /phase: 'acceptance'/)
  assert.match(acceptMessageRequest, /requestId: invite\.requestId \|\| invite\.inviteId/)
  assert.match(acceptMessageRequest, /state: delivery\.state/)
  assert.match(acceptMessageRequest, /toProfileId: invite\.toProfileId/)
  assert.doesNotMatch(acceptMessageRequest, /Home is not ready/)
  assert.doesNotMatch(acceptMessageRequest, /room\.broadcastControl\(invite\)/)
  assert.match(
    source,
    /onHomeDescriptor: \(frame\) => sendToUI\(RPC_PROFILE_HOME_DESCRIPTOR, frame\)/
  )
  assert.match(source, /async function sendLocalHomeDescriptor\(toProfileId\)/)
  assert.match(source, /createSignedHomeAddressPayload\(\{/)
  assert.match(source, /const frame = createProfileHomeDescriptorFrame\(\{/)
  assert.match(
    acceptDmInvite,
    /outgoingMessageRequestsByProfileId\.delete\(invite\.fromProfileId\)/
  )
  assert.match(acceptDmInvite, /sendLocalHomeDescriptor\(invite\.fromProfileId\)\.catch/)
  assert.match(canAcceptIncomingDmInvite, /trustedProfileIds\?\.includes\(fromProfileId\)/)
  assert.match(
    canAcceptIncomingDmInvite,
    /outgoingMessageRequestsByProfileId\.get\(fromProfileId\)\?\.requestId === invite\?\.requestId\?\.trim\(\)/
  )
  assert.match(sendDmBody, /const text = cleanRequiredText\(payload\.text\)/)
  assert.match(sendDmBody, /const message = dmRuntime\.sendMessage\(\{/)
  assert.match(sendDmBody, /threadId: payload\.threadId/)
  assert.match(handleControlDmBody, /if \(!allowDebugHomeDmBodyFallback\)/)
  assert.match(sendDmBody, /if \(allowDebugHomeDmBodyFallback\)/)
  assert.doesNotMatch(sendDmBody, /room\.send\(/)
  assert.doesNotMatch(sendDmBody, /room\.broadcastControl\(message\)/)
  assert.doesNotMatch(postTreehole, /text: payload\.text/)
  assert.doesNotMatch(commentTreehole, /text: payload\.text/)
  assert.doesNotMatch(sendMessageRequest, /text: payload\.text/)
  assert.doesNotMatch(sendDmBody, /text: payload\.text/)
})

test('android backend keeps Home-control friend bootstrap debug-only', () => {
  const source = readFileSync(new URL('../backend/backend.mjs', import.meta.url), 'utf8')
  const handleMessageRequest = sliceBetween(
    source,
    "if (message.type === 'kepos.message.request.v1')",
    "if (message.type === 'kepos.dm.invite.v1')"
  )
  const handleDmInvite = sliceBetween(
    source,
    "if (message.type === 'kepos.dm.invite.v1')",
    "if (message.type === 'kepos.dm.body.v1')"
  )
  const sendMessageRequest = sliceBetween(
    source,
    'function sendMessageRequest',
    'async function sendProfileMessageRequest'
  )
  const sendProfileMessageRequest = sliceBetween(
    source,
    'async function sendProfileMessageRequest',
    'async function acceptMessageRequest'
  )

  assert.match(handleMessageRequest, /if \(!allowDebugHomeTrustFallback\)/)
  assert.match(handleMessageRequest, /verifyMessageRequest\(message\)/)
  assert.match(handleDmInvite, /if \(!allowDebugHomeTrustFallback\)/)
  assert.match(handleDmInvite, /await acceptDmInvite\(message\)/)
  assert.match(sendMessageRequest, /if \(!allowDebugHomeTrustFallback\)/)
  assert.match(sendProfileMessageRequest, /profileRequestRuntime\.send\(request\)/)
  assert.doesNotMatch(sendProfileMessageRequest, /allowDebugHomeTrustFallback/)
})

test('android backend starts profile request service without Home join', () => {
  const source = readFileSync(new URL('../backend/backend.mjs', import.meta.url), 'utf8')
  const handleProfileStart = sliceBetween(
    source,
    'if (req.command === RPC_PROFILE_START)',
    'if (req.command === RPC_PROFILE_REQUEST_SEND)'
  )
  const startProfileService = sliceBetween(
    source,
    'async function startProfileService',
    'function openTreehole'
  )
  const sendProfileMessageRequest = sliceBetween(
    source,
    'async function sendProfileMessageRequest',
    'async function acceptMessageRequest'
  )

  assert.match(handleProfileStart, /await startProfileService\(payload\)/)
  assert.doesNotMatch(handleProfileStart, /joinRoom/)
  assert.match(startProfileService, /profileRequestRuntime = createProfileFriendRequestRuntime/)
  assert.match(startProfileService, /profileHomeRoomKey = payload\.homeRoomKey/)
  assert.match(startProfileService, /await profileRequestRuntime\.open\(\)/)
  assert.doesNotMatch(startProfileService, /createP2PRoom/)
  assert.doesNotMatch(startProfileService, /room\.join/)
  assert.match(sendProfileMessageRequest, /profileRequestRuntime\.send\(request\)/)
  assert.doesNotMatch(sendProfileMessageRequest, /room/)
  assert.doesNotMatch(sendProfileMessageRequest, /allowDebugHomeTrustFallback/)
})

test('android backend accepts requests and opens DM threads without Home', () => {
  const source = readFileSync(new URL('../backend/backend.mjs', import.meta.url), 'utf8')
  const acceptMessageRequest = sliceBetween(
    source,
    'async function acceptMessageRequest',
    'async function acceptDmInvite'
  )

  assert.match(
    acceptMessageRequest,
    /if \(!identity \|\| !profileId \|\| !dmEncryptionKeyPair \|\| !profileRequestRuntime\)/
  )
  assert.match(acceptMessageRequest, /canAcceptIncomingMessageRequest\(request\)/)
  assert.match(
    acceptMessageRequest,
    /createDmThread\(\{[\s\S]*remoteProfileId: request\.fromProfileId/
  )
  assert.match(acceptMessageRequest, /acceptDmThread\(/)
  assert.match(acceptMessageRequest, /createDmInvite\(\{/)
  assert.match(acceptMessageRequest, /toProfileId: request\.fromProfileId/)
  assert.match(acceptMessageRequest, /const delivery = await profileRequestRuntime\.send\(invite\)/)
  assert.match(acceptMessageRequest, /sendLocalHomeDescriptor\(request\.fromProfileId\)\.catch/)
  assert.match(acceptMessageRequest, /phase: 'acceptance'/)
  assert.match(acceptMessageRequest, /await saveBackendDmThread\(thread\)/)
  assert.match(acceptMessageRequest, /await dmRuntime\?\.openThread\(thread\)/)
  assert.match(acceptMessageRequest, /sendToUI\(RPC_DM_THREAD, thread\)/)
  assert.doesNotMatch(acceptMessageRequest, /allowDebugHomeTrustFallback/)
  assert.doesNotMatch(acceptMessageRequest, /broadcastControl/)
  assert.doesNotMatch(acceptMessageRequest, /sendControl/)
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
