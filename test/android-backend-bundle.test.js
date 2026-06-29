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
  const handleControlDmBody = sliceBetween(
    source,
    "if (message.type === 'kepos.dm.body.v1')",
    "if (message.type === 'treehole.bootstrap')"
  )
  const sendDmBody = sliceBetween(source, 'function sendDmBody', 'async function revokeDmByProfile')

  assert.match(source, /let allowHomeDmBodyFallback = false/)
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
  assert.match(acceptMessageRequest, /canAcceptIncomingMessageRequest\(request\)/)
  assert.match(acceptMessageRequest, /verifyMessageRequest\(request\)/)
  assert.match(acceptMessageRequest, /request\.toProfileId !== profileId/)
  assert.match(acceptMessageRequest, /revokedProfileIds\?\.includes\(request\.fromProfileId\)/)
  assert.match(sendDmBody, /const text = cleanRequiredText\(payload\.text\)/)
  assert.match(handleControlDmBody, /if \(!allowHomeDmBodyFallback\)/)
  assert.match(sendDmBody, /if \(allowHomeDmBodyFallback\)/)
  assert.doesNotMatch(postTreehole, /text: payload\.text/)
  assert.doesNotMatch(commentTreehole, /text: payload\.text/)
  assert.doesNotMatch(sendMessageRequest, /text: payload\.text/)
  assert.doesNotMatch(sendDmBody, /text: payload\.text/)
})

function sliceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker)
  const end = source.indexOf(endMarker, start)

  assert.notEqual(start, -1)
  assert.notEqual(end, -1)

  return source.slice(start, end)
}
