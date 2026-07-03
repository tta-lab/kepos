import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { createAdvancedSocialActionState } from '../src/advanced-social-action-state.ts'

test('advanced social action state gates debug Home entry and Profile QR request paste', () => {
  assert.deepEqual(
    createAdvancedSocialActionState({
      canJoinHome: true,
      canUseHomeQrJoin: true,
      canUseManualHomeJoin: true,
      canUseTrustProfile: true,
      homeQrUri: ' kepos://home/debug ',
      homeReady: true,
      roomKey: 'a'.repeat(64),
      trustQrUri: ' kepos://profile/alice '
    }),
    {
      canJoinHomeQr: true,
      canJoinManualHome: true,
      canScanHomeQr: true,
      canShowHomeQr: true,
      canTrustProfile: true,
      homeQrUri: 'kepos://home/debug',
      roomKey: 'a'.repeat(64),
      trustQrUri: 'kepos://profile/alice'
    }
  )
})

test('advanced social action state keeps Home readiness out of Profile QR request paste', () => {
  const state = createAdvancedSocialActionState({
    canJoinHome: false,
    canUseTrustProfile: true,
    homeQrUri: 'kepos://home/debug',
    homeReady: false,
    roomKey: 'a'.repeat(64),
    trustQrUri: 'kepos://profile/alice'
  })

  assert.equal(state.canJoinHomeQr, false)
  assert.equal(state.canJoinManualHome, true)
  assert.equal(state.canScanHomeQr, false)
  assert.equal(state.canShowHomeQr, false)
  assert.equal(state.canTrustProfile, true)
})

test('advanced social action state keeps platform components out of raw advanced availability checks', async () => {
  const desktop = await readFile(
    new URL('../desktop/context-components.tsx', import.meta.url),
    'utf8'
  )
  const mobile = await readFile(new URL('../mobile/people-components.tsx', import.meta.url), 'utf8')

  assert.match(desktop, /createAdvancedSocialActionState\(/)
  assert.match(mobile, /createAdvancedSocialActionState\(/)
  assert.doesNotMatch(desktop, /ROOM_KEY_PATTERN/)
  assert.doesNotMatch(desktop, /Boolean\(form\.homeQrUri\.trim\(\)\)/)
  assert.doesNotMatch(desktop, /Boolean\(form\.trustQrUri\.trim\(\)\)/)
  assert.doesNotMatch(mobile, /const canUseHomeJoin = homeReady && canJoinHome/)
  assert.doesNotMatch(mobile, /!homeQrUri\.trim\(\)/)
  assert.doesNotMatch(mobile, /!trustQrUri\.trim\(\)/)
})
