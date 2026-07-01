import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DESKTOP_COMMANDS,
  DESKTOP_EVENTS,
  isDesktopCommand,
  isDesktopEvent
} from '../src/desktop-command-vocabulary.ts'

test('desktop command vocabulary covers the V1 MLP product actions', () => {
  assert.deepEqual(DESKTOP_COMMANDS, [
    'acceptMessageRequest',
    'allowContactRequests',
    'commentTreehole',
    'enterContactHome',
    'ignoreMessageRequest',
    'joinHome',
    'joinHomeUri',
    'leaveHome',
    'likeTreehole',
    'markDmThreadRead',
    'postTreehole',
    'revokeContact',
    'sendDmMessage',
    'sendHomeMessage',
    'sendMessageRequest',
    'prepareProfileRequestTarget',
    'updateAvatarMedia',
    'updateAvatarUri',
    'updateDisplayName'
  ])
})

test('desktop event vocabulary covers room, people, DM, and treehole updates', () => {
  assert.deepEqual(DESKTOP_EVENTS, [
    'contactBookChanged',
    'contextFormDraftChanged',
    'desktopStateChanged',
    'directComposerRecipientChanged',
    'dmMessageReceived',
    'dmThreadChanged',
    'errorReceived',
    'homeMessageReceived',
    'peerCountChanged',
    'profileRequestTargetChanged',
    'shareQrOutputsChanged',
    'statusChanged',
    'transportDebugChanged',
    'treeholeStateChanged'
  ])
})

test('desktop command and event guards reject unknown names', () => {
  assert.equal(isDesktopCommand('joinHome'), true)
  assert.equal(isDesktopCommand('shareScreen'), false)
  assert.equal(isDesktopEvent('statusChanged'), true)
  assert.equal(isDesktopEvent('gameSessionStarted'), false)
})
