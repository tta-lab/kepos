import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { createDirectChatLayoutState } from '../src/direct-chat-layout-state.ts'

test('direct Chat layout state hides thread surfaces for the selected request target', () => {
  assert.deepEqual(
    createDirectChatLayoutState({
      recipientProfileId: ' profile-ada ',
      requestTargetProfileId: 'profile-ada'
    }),
    {
      hasRequestTarget: true,
      hideContactEmpty: true,
      hideThreadList: true
    }
  )
})

test('direct Chat layout state keeps normal thread surfaces outside request-target flow', () => {
  assert.deepEqual(
    createDirectChatLayoutState({
      recipientProfileId: 'profile-ada',
      requestTargetProfileId: 'profile-grace'
    }),
    {
      hasRequestTarget: false,
      hideContactEmpty: false,
      hideThreadList: false
    }
  )
  assert.equal(createDirectChatLayoutState({ recipientProfileId: '' }).hasRequestTarget, false)
  assert.equal(
    createDirectChatLayoutState({ requestTargetProfileId: 'profile-ada' }).hasRequestTarget,
    false
  )
})

test('direct Chat layout state keeps platform components out of request-target layout mapping', async () => {
  const desktop = await readFile(new URL('../desktop/pane-components.tsx', import.meta.url), 'utf8')
  const mobile = await readFile(new URL('../mobile/direct-components.tsx', import.meta.url), 'utf8')

  assert.match(desktop, /createDirectChatLayoutState\(/)
  assert.match(mobile, /createDirectChatLayoutState\(/)
  assert.doesNotMatch(
    desktop,
    /requestTarget\?\.profileId && requestTarget\.profileId === selectedProfileId/
  )
  assert.doesNotMatch(
    mobile,
    /requestTarget\?\.profileId && requestTarget\.profileId === recipient/
  )
})
