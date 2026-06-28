import assert from 'node:assert/strict'
import test from 'node:test'
import {
  displayDirectPeer,
  displayPostAuthor,
  formatMessageRequestTitle,
  formatMobileTrustSource,
  formatMobileTrustTime,
  formatPendingBadgeCount,
  formatRequestPreview,
  getMobileTabButtonLabel,
  getMobileBackendNotice,
  getMobileHomeStatus,
  getMobileRoomSurface,
  getMobileTreeholeStatus,
  shortenProfileId
} from '../src/mobile-product-copy.js'

test('mobile product copy formats home and treehole status', () => {
  assert.equal(getMobileHomeStatus({ online: 0, session: null }), 'Offline')
  assert.equal(getMobileHomeStatus({ online: 1, session: { roomKey: 'room' } }), 'Connected')
  assert.equal(
    getMobileHomeStatus({ online: 0, session: { roomKey: 'room' } }),
    'Waiting for friends'
  )

  assert.equal(getMobileTreeholeStatus('ready'), 'Treehole ready')
  assert.equal(getMobileTreeholeStatus('starting'), 'Treehole starting')
  assert.equal(getMobileTreeholeStatus('waiting'), 'Waiting treehole')
  assert.equal(getMobileTreeholeStatus('waiting-for-bootstrap'), 'Waiting treehole')
  assert.equal(getMobileTreeholeStatus('idle'), 'Treehole offline')
})

test('mobile product copy maps backend and room state to user copy', () => {
  assert.equal(getMobileBackendNotice('joining'), 'Starting home...')
  assert.equal(getMobileBackendNotice('opening-dm'), 'Starting home...')
  assert.equal(getMobileBackendNotice('opening-treehole-state'), 'Syncing treehole...')
  assert.equal(getMobileBackendNotice('joined'), 'Connected.')
  assert.equal(getMobileBackendNotice('left'), 'Left home.')
  assert.equal(getMobileBackendNotice('unknown'), 'Home status updated.')

  assert.equal(getMobileRoomSurface('chat'), 'Home chat')
  assert.equal(getMobileRoomSurface('dm'), 'Direct messages')
  assert.equal(getMobileRoomSurface('treehole'), 'Treehole')
  assert.equal(getMobileRoomSurface('people'), 'People')
})

test('mobile product copy formats people and request labels', () => {
  assert.equal(formatMobileTrustSource('profile_qr'), 'Profile QR')
  assert.equal(formatMobileTrustSource('person_qr'), 'Profile QR')
  assert.equal(formatMobileTrustSource('home_room'), 'Home')
  assert.equal(formatMobileTrustSource('message_request'), 'Message request')
  assert.equal(formatMobileTrustSource('manual'), 'local trust')
  assert.equal(formatMobileTrustTime(Number.NaN), 'recently')
  assert.equal(
    formatMobileTrustTime(0, (value) => `date:${value}`),
    'date:0'
  )

  assert.equal(formatRequestPreview(' hello '), 'hello')
  assert.equal(formatRequestPreview('  '), 'No message yet')
  assert.equal(formatMessageRequestTitle({ alias: 'Ada' }), 'Ada wants to start a direct chat.')
  assert.equal(formatMessageRequestTitle({}), 'Someone wants to start a direct chat.')
})

test('mobile product copy formats pending tab badges', () => {
  assert.equal(getMobileTabButtonLabel('Direct', 0), 'Direct')
  assert.equal(getMobileTabButtonLabel('Direct', 2), 'Direct, 2 pending')
  assert.equal(formatPendingBadgeCount(0), '0')
  assert.equal(formatPendingBadgeCount(12), '12')
  assert.equal(formatPendingBadgeCount(100), '99+')
})

test('mobile product copy formats profile and author labels', () => {
  const profileId = '1234567890abcdef1234567890abcdef'

  assert.equal(shortenProfileId(profileId), '12345678...90abcdef')
  assert.equal(shortenProfileId(''), '')
  assert.equal(displayDirectPeer(profileId), 'Profile 12345678...90abcdef')
  assert.equal(displayDirectPeer(profileId, ' Ada '), 'Ada')
  assert.equal(displayPostAuthor({ authorDisplayName: 'Ada' }), 'Ada')
  assert.equal(displayPostAuthor({ author: 'anon-name' }), 'anon-name')
  assert.equal(displayPostAuthor({ authorProfileId: profileId }), '12345678...90abcdef')
  assert.equal(displayPostAuthor({}), 'anon')
})
