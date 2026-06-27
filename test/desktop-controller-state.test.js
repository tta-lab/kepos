import assert from 'node:assert/strict'
import test from 'node:test'
import { createDesktopControllerState } from '../src/desktop-controller-state.js'
import { setDesktopRoom, setDesktopTab } from '../src/desktop-state.js'

test('desktop controller state owns display name with product default', () => {
  const state = createDesktopControllerState()

  assert.equal(state.getCurrentDisplayName(), 'Desktop')
  assert.equal(state.setCurrentDisplayName('  Ada  '), 'Ada')
  assert.equal(state.getCurrentDisplayName(), 'Ada')
  assert.equal(state.setCurrentDisplayName('   '), 'Desktop')
  assert.equal(state.getCurrentDisplayName(), 'Desktop')
})

test('desktop controller state owns active desktop state updates', () => {
  const controllerState = createDesktopControllerState()

  controllerState.updateState((state) => setDesktopTab(state, 'people'))
  controllerState.updateState((state) =>
    setDesktopRoom(state, {
      mode: 'host',
      nick: 'Desktop',
      peers: 1,
      roomKey: 'a'.repeat(64)
    })
  )

  assert.equal(controllerState.getState().activeTab, 'people')
  assert.equal(controllerState.getState().view, 'room')
  assert.equal(controllerState.getState().peers, 1)
})

test('desktop controller state owns runtime snapshots', () => {
  const controllerState = createDesktopControllerState()
  const session = { messages: ['home'] }
  const dmSession = { messages: ['dm'] }
  const homeJoinDetails = { ownerProfileId: 'owner', roomKey: 'room' }

  controllerState.setSession(session)
  controllerState.setDmSession(dmSession)
  controllerState.setHomeJoinDetails(homeJoinDetails)

  assert.equal(controllerState.getSession(), session)
  assert.equal(controllerState.getDmSession(), dmSession)
  assert.equal(controllerState.getHomeJoinDetails(), homeJoinDetails)
})

test('desktop controller state owns direct recipient selection', () => {
  const controllerState = createDesktopControllerState()

  assert.equal(controllerState.setDirectComposerRecipient('  profile-a  '), 'profile-a')
  assert.equal(controllerState.getDirectComposerRecipientProfileId(), 'profile-a')
  assert.equal(controllerState.selectDirectContact(''), false)
  assert.equal(controllerState.getDirectComposerRecipientProfileId(), 'profile-a')
  assert.equal(controllerState.selectDirectContact('profile-b'), true)
  assert.equal(controllerState.getDirectComposerRecipientProfileId(), 'profile-b')
})
