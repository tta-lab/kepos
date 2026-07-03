import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

function readText(path) {
  return readFile(new URL(path, import.meta.url), 'utf8')
}

function sliceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker)
  assert.notEqual(start, -1, `missing start marker: ${startMarker}`)
  const end = source.indexOf(endMarker, start + startMarker.length)
  assert.notEqual(end, -1, `missing end marker: ${endMarker}`)
  return source.slice(start, end)
}

test('V1 normal Profile QR stays independent from Home descriptors', async () => {
  const shareQr = await readText('../src/share-qr-service.ts')
  const createShareQrPayloads = sliceBetween(
    shareQr,
    'export function createShareQrPayloads',
    '  return {'
  )
  const trustInviteCall = sliceBetween(
    createShareQrPayloads,
    'createSignedTrustInvitePayload({',
    '    })'
  )
  const returnBlock = sliceBetween(shareQr, '  return {', '\n  }\n}')

  assert.match(createShareQrPayloads, /createSignedTrustInvitePayload\(\{[\s\S]*identity/)
  assert.doesNotMatch(trustInviteCall, /homeDescriptor|homeRoom|roomKey/)
  assert.match(returnBlock, /primaryUri: profileUri/)
  assert.match(returnBlock, /debugHomeUri: homeUri/)
  assert.doesNotMatch(returnBlock, /primaryUri: homeUri/)
})

test('V1 desktop Chat and request actions keep Home out of normal social delivery', async () => {
  const messageActions = await readText('../src/desktop-message-actions.ts')
  const dmRuntime = await readText('../src/desktop-dm-runtime.ts')
  const requestActions = await readText('../src/desktop-message-request-actions.ts')

  const sendDmMessage = sliceBetween(messageActions, 'async sendDmMessage', '    sendHomeMessage')
  const debugFallback = sliceBetween(
    sendDmMessage,
    'if (allowDebugHomeDmBodyFallback',
    '\n      }\n\n      onChanged()'
  )
  const runtimeSend = sliceBetween(
    dmRuntime,
    'function sendMessageOrRequest',
    'function appendIncomingRequest'
  )
  const acceptIncoming = sliceBetween(
    requestActions,
    'async function acceptIncomingMessageRequest',
    'function ignoreIncomingMessageRequest'
  )

  assert.match(sendDmMessage, /sendDesktopProfileFriendRequest\(/)
  assert.doesNotMatch(sendDmMessage, /broadcastControl: \(\) =>/)
  assert.doesNotMatch(runtimeSend, /broadcastControl/)
  assert.match(debugFallback, /getHomeRuntime\(\)\?\.broadcastControl/)
  assert.doesNotMatch(acceptIncoming, /getHomeRuntime|isJoined|homeRuntime|broadcastControl/)
  assert.match(acceptIncoming, /getFriendRequestTransport\(\)\?\.send/)
})

test('V1 Android normal social delivery uses profile runtime, not Home fallback', async () => {
  const backend = await readText('../backend/backend.mjs')
  const mobile = await readText('../mobile/App.tsx')

  const sendProfileMessageRequest = sliceBetween(
    backend,
    'async function sendProfileMessageRequest',
    'async function acceptMessageRequest'
  )
  const acceptMessageRequest = sliceBetween(
    backend,
    'async function acceptMessageRequest',
    'function canAcceptIncomingMessageRequest'
  )
  const sendDmBody = sliceBetween(
    backend,
    'function sendDmBody',
    'async function revokeDmByProfile'
  )
  const mobileSendMessageRequest = sliceBetween(
    mobile,
    'function sendMessageRequest()',
    'function retryOutgoingMessageRequest'
  )
  const mobileAcceptedThreadBranch = sliceBetween(
    mobileSendMessageRequest,
    'if (thread) {',
    '    if (!requestTargetView.canSendRequest)'
  )

  assert.match(sendProfileMessageRequest, /profileRequestRuntime\.send\(request\)/)
  assert.doesNotMatch(sendProfileMessageRequest, /room|allowDebugHomeTrustFallback|directTransport/)
  assert.match(acceptMessageRequest, /profileRequestRuntime\.send\(invite\)/)
  assert.doesNotMatch(
    acceptMessageRequest,
    /room|broadcastControl|sendControl|allowDebugHomeTrustFallback/
  )
  assert.match(sendDmBody, /dmRuntime\.sendMessage/)
  assert.doesNotMatch(sendDmBody, /room\.send\(|room\.broadcastControl\(message\)/)
  assert.match(mobileSendMessageRequest, /RPC_PROFILE_REQUEST_SEND/)
  assert.doesNotMatch(
    mobileSendMessageRequest,
    /homeRoomKey|homeReady|directRoomEndpoint|RPC_DM_SEND/
  )
  assert.match(mobileAcceptedThreadBranch, /RPC_DM_BODY_SEND/)
  assert.doesNotMatch(mobileAcceptedThreadBranch, /RPC_PROFILE_REQUEST_SEND|RPC_DM_SEND|RPC_SEND/)
})

test('V1 Treehole owner posting does not require Home session on desktop or Android', async () => {
  const desktop = await readText('../src/desktop-message-actions.ts')
  const mobile = await readText('../mobile/App.tsx')
  const backend = await readText('../backend/backend.mjs')

  const desktopPostTreehole = sliceBetween(desktop, 'async postTreehole', '    async retryOutgoing')
  const mobilePostTreehole = sliceBetween(
    mobile,
    'function sendTreeholePost()',
    'function sendTreeholeComment('
  )
  const backendOpenProfileTreehole = sliceBetween(
    backend,
    'async function openProfileTreehole',
    'async function openTreehole'
  )

  assert.match(desktopPostTreehole, /getTreeholeCanPost\(\)/)
  assert.doesNotMatch(desktopPostTreehole, /getHomeRuntime|getSession|isJoined/)
  assert.match(mobilePostTreehole, /RPC_TREEHOLE_POST/)
  assert.doesNotMatch(mobilePostTreehole, /session|homeReady|homeRoomKey/)
  assert.match(backendOpenProfileTreehole, /await openTreehole\(null, 'profile'\)/)
  assert.doesNotMatch(backendOpenProfileTreehole, /room\.join|createP2PRoom/)
})
