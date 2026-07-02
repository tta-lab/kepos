import assert from 'node:assert/strict'
import test from 'node:test'
import {
  displayDirectPeer,
  displayPostAuthor,
  formatMobileDirectMessageMeta,
  formatMobileHomeMessageMeta,
  formatMobilePostTime,
  formatMobileTrustedContactName,
  formatMessageRequestSubtitle,
  formatMessageRequestTitle,
  formatMobileTrustSource,
  formatMobileTrustTime,
  formatOutgoingRequestTitle,
  formatPendingBadgeCount,
  formatRequestPreview,
  getMobileTreeholeEmptyCopy,
  getMobileTabButtonLabel,
  getMobileBackendNotice,
  getMobileHomeStatus,
  getMobileRoomSurface,
  getMobileTreeholeStatus,
  shortenProfileId
} from '../src/mobile-product-copy.ts'

test('mobile product copy formats home and treehole status', () => {
  assert.equal(getMobileHomeStatus({ online: 0, session: null }), 'Offline')
  assert.equal(getMobileHomeStatus({ online: 1, session: { roomKey: 'room' } }), 'Connected')
  assert.equal(
    getMobileHomeStatus({ online: 0, session: { roomKey: 'room' } }),
    'Waiting for friends'
  )

  assert.equal(getMobileTreeholeStatus('ready'), 'Treehole ready')
  assert.equal(getMobileTreeholeStatus('starting'), 'Starting Treehole')
  assert.equal(getMobileTreeholeStatus('waiting'), 'Waiting for posts')
  assert.equal(getMobileTreeholeStatus('waiting-for-bootstrap'), 'Waiting for posts')
  assert.equal(getMobileTreeholeStatus('idle'), 'Treehole offline')
})

test('mobile product copy maps backend and room state to user copy', () => {
  assert.equal(getMobileBackendNotice('joining'), 'Starting home...')
  assert.equal(getMobileBackendNotice('opening-dm'), 'Starting home...')
  assert.equal(getMobileBackendNotice('opening-treehole-state'), 'Syncing posts...')
  assert.equal(getMobileBackendNotice('joined'), 'Connected.')
  assert.equal(getMobileBackendNotice('left'), 'Left home.')
  assert.equal(getMobileBackendNotice('unknown'), 'Home status updated.')

  assert.equal(getMobileRoomSurface('chat'), 'Home chat')
  assert.equal(getMobileRoomSurface('dm'), 'Chat')
  assert.equal(getMobileRoomSurface('treehole'), 'Treehole')
  assert.equal(getMobileRoomSurface('people'), 'Contacts')
})

test('mobile product copy formats people and request labels', () => {
  assert.equal(formatMobileTrustSource('profile_qr'), 'Profile QR')
  assert.equal(formatMobileTrustSource('person_qr'), 'Profile QR')
  assert.equal(formatMobileTrustSource('home_room'), 'Home')
  assert.equal(formatMobileTrustSource('message_request'), 'Friend request')
  assert.equal(formatMobileTrustSource('manual'), 'This device')
  assert.equal(formatMobileTrustTime(Number.NaN), 'recently')
  assert.equal(
    formatMobileTrustTime(0, (value) => `date:${value}`),
    'date:0'
  )

  assert.equal(formatRequestPreview(' hello '), 'hello')
  assert.equal(formatRequestPreview('  '), 'No message yet')
  assert.equal(formatMessageRequestTitle({ alias: 'Ada' }), 'Ada sent a friend request.')
  assert.equal(formatMessageRequestTitle({}), 'Someone sent a friend request.')
  assert.equal(
    formatMessageRequestTitle({ profileId: '1234567890abcdef1234567890abcdef' }),
    'Profile 12345678...90abcdef sent a friend request.'
  )
  assert.equal(formatMessageRequestSubtitle({ alias: ' Ada ' }), 'Ada')
  assert.equal(
    formatMessageRequestSubtitle({ profileId: '1234567890abcdef1234567890abcdef' }),
    'Profile 12345678...90abcdef'
  )
  assert.equal(formatMobileTrustedContactName({ alias: ' Grace ' }), 'Grace')
  assert.equal(
    formatMobileTrustedContactName({ profileId: '1234567890abcdef1234567890abcdef' }),
    'Profile 12345678...90abcdef'
  )
  assert.equal(formatOutgoingRequestTitle({ alias: ' Ada ' }), 'Ada has not accepted yet.')
  assert.equal(
    formatOutgoingRequestTitle({ profileId: '1234567890abcdef1234567890abcdef' }),
    'Profile 12345678...90abcdef has not accepted yet.'
  )
})

test('mobile product copy formats pending tab badges', () => {
  assert.equal(getMobileTabButtonLabel('Chat', 0), 'Chat')
  assert.equal(getMobileTabButtonLabel('Chat', 2), 'Chat, 2 pending')
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
  assert.equal(displayDirectPeer(''), 'Someone')
  assert.equal(displayPostAuthor({ authorDisplayName: 'Ada' }), 'Ada')
  assert.equal(displayPostAuthor({ author: 'anon-name' }), 'anon-name')
  assert.equal(displayPostAuthor({ authorProfileId: profileId }), 'Profile 12345678...90abcdef')
  assert.equal(displayPostAuthor({}), 'Someone')
})

test('mobile product copy formats direct message meta labels', () => {
  const profileId = '1234567890abcdef1234567890abcdef'

  assert.equal(
    formatMobileDirectMessageMeta({
      direction: 'out',
      toProfileId: profileId,
      type: 'kepos.dm.message.v1'
    }),
    'You to Profile 12345678...90abcdef'
  )
  assert.equal(
    formatMobileDirectMessageMeta({
      direction: 'in',
      fromProfileId: profileId,
      nick: ' Ada ',
      type: 'kepos.dm.message.v1'
    }),
    'Ada to you'
  )
  assert.equal(
    formatMobileDirectMessageMeta({
      direction: 'out',
      type: 'kepos.message.request.v1'
    }),
    'You sent a friend request'
  )
  assert.equal(
    formatMobileDirectMessageMeta({
      alias: 'Grace',
      direction: 'in',
      type: 'kepos.message.request.v1'
    }),
    'Grace sent a friend request.'
  )
  assert.equal(
    formatMobileDirectMessageMeta(
      {
        direction: 'in',
        fromProfileId: profileId,
        nick: 'Old Ada',
        type: 'kepos.dm.message.v1'
      },
      [{ alias: 'Local Ada', profileId }]
    ),
    'Local Ada to you'
  )
})

test('mobile product copy formats home message sender labels', () => {
  assert.equal(formatMobileHomeMessageMeta({ nick: ' Ada ' }), 'Ada')
  assert.equal(formatMobileHomeMessageMeta({ nick: '' }), 'Someone')
  assert.equal(formatMobileHomeMessageMeta({}), 'Someone')
})

test('mobile product copy formats treehole empty copy and post time', () => {
  assert.equal(getMobileTreeholeEmptyCopy('waiting'), 'Waiting for the home owner to share posts.')
  assert.equal(
    getMobileTreeholeEmptyCopy('waiting-for-bootstrap'),
    'Waiting for the home owner to share posts.'
  )
  assert.equal(getMobileTreeholeEmptyCopy('starting'), 'Starting Treehole.')
  assert.equal(getMobileTreeholeEmptyCopy('ready'), 'Write the first post from this phone.')
  assert.equal(
    getMobileTreeholeEmptyCopy('ready', { canPost: false }),
    'Posts from this home will appear here.'
  )
  assert.equal(
    getMobileTreeholeEmptyCopy(undefined, { canPost: false }),
    'Posts from this home will appear here.'
  )
  assert.equal(
    formatMobilePostTime(0, (value, options) => {
      assert.equal(value, 0)
      assert.deepEqual(options, { hour: '2-digit', minute: '2-digit' })
      return 'time:0'
    }),
    'time:0'
  )
})
