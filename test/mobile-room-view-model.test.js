import assert from 'node:assert/strict'
import test from 'node:test'
import { getMobileTabBadges } from '../src/mobile-room-view-model.js'

test('mobile room view model counts pending tab work', () => {
  assert.deepEqual(
    getMobileTabBadges({
      dmMessages: [
        { direction: 'in', type: 'kepos.message.request.v1' },
        { direction: 'out', type: 'kepos.message.request.v1' },
        { direction: 'in', type: 'kepos.dm.message.v1' },
        { direction: 'in', type: 'kepos.message.request.v1' }
      ],
      pendingRequests: [{ profileId: 'friend-a' }, { profileId: 'friend-b' }]
    }),
    {
      direct: 2,
      people: 2
    }
  )
})

test('mobile room view model treats missing lists as empty badge counts', () => {
  assert.deepEqual(getMobileTabBadges({}), {
    direct: 0,
    people: 0
  })
})
