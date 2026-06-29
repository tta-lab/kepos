import assert from 'node:assert/strict'
import test from 'node:test'
import { createContactBook, trustContact } from '../src/contact-book.ts'
import { createDesktopRenderPresenter } from '../src/desktop-render-presenter.ts'
import { createDesktopState, setDesktopRoom, setDesktopTreehole } from '../src/desktop-state.ts'

function createUiRecorder() {
  const calls = []
  const ui = {
    setActiveTab: (payload) => calls.push(['activeTab', payload]),
    setControls: (payload) => calls.push(['controls', payload]),
    setDirectContactPicker: (payload) => calls.push(['directContactPicker', payload]),
    setDirectMessages: (payload) => calls.push(['directMessages', payload]),
    setHomeMessages: (payload) => calls.push(['homeMessages', payload]),
    setPeople: (payload) => calls.push(['people', payload]),
    setShellBusy: (payload) => calls.push(['shellBusy', payload]),
    setStatus: (payload) => calls.push(['status', payload]),
    setTreeholePosts: (payload) => calls.push(['treeholePosts', payload])
  }

  return { calls, ui }
}

test('desktop render presenter pushes the full room snapshot to React UI', () => {
  const profileId = 'b'.repeat(64)
  const contactBook = trustContact(createContactBook({ ownerProfileId: 'owner' }), {
    alias: 'Ada',
    profileId,
    source: 'profile_qr',
    trustedAt: 1000
  })
  const { calls, ui } = createUiRecorder()
  const presenter = createDesktopRenderPresenter({
    formatTime: () => '09:30',
    shortenProfileId: (value) => value.slice(0, 6),
    ui
  })
  const state = setDesktopTreehole(
    setDesktopRoom(createDesktopState(), {
      mode: 'host',
      nick: 'Desktop',
      peers: 1,
      roomKey: 'a'.repeat(64)
    }),
    {
      canPost: true,
      posts: [
        {
          authorProfileId: profileId,
          comments: [],
          createdAt: 123,
          id: 'post-1',
          likes: new Set([profileId]),
          text: 'hello tree'
        }
      ],
      status: 'ready'
    }
  )

  presenter.render({
    contactBook,
    directComposerRecipientProfileId: profileId,
    dmSession: {
      messages: [
        {
          direction: 'out',
          text: 'dm',
          toProfileId: profileId,
          type: 'kepos.dm.message.v1'
        }
      ]
    },
    pendingCommand: 'joinHome',
    session: {
      messages: [{ direction: 'out', nick: 'Desktop', text: 'hi' }],
      profileId
    },
    state
  })

  assert.equal(calls[0][0], 'shellBusy')
  assert.equal(calls[0][1], true)
  assert.deepEqual(
    calls.find(([name]) => name === 'activeTab'),
    ['activeTab', 'chat']
  )
  assert.equal(calls.find(([name]) => name === 'controls')[1].canLeaveHome, false)
  assert.equal(calls.find(([name]) => name === 'status')[1].homeStatusLabel, 'Connected')
  assert.equal(calls.find(([name]) => name === 'homeMessages')[1][0].text, 'hi')
  assert.equal(calls.find(([name]) => name === 'directMessages')[1][0].text, 'dm')
  assert.equal(
    calls.find(([name]) => name === 'directContactPicker')[1].contacts[0].profileId,
    profileId
  )
  assert.equal(calls.find(([name]) => name === 'people')[1].trustedContacts[0].alias, 'Ada')
  assert.equal(calls.find(([name]) => name === 'treeholePosts')[1][0].text, 'hello tree')
})

test('desktop render presenter keeps lobby controls available when no action is pending', () => {
  const { calls, ui } = createUiRecorder()
  const presenter = createDesktopRenderPresenter({
    ui
  })

  presenter.render({
    contactBook: createContactBook({ ownerProfileId: 'owner' }),
    directComposerRecipientProfileId: '',
    dmSession: null,
    pendingCommand: null,
    session: null,
    state: createDesktopState()
  })

  assert.deepEqual(
    calls.find(([name]) => name === 'controls'),
    [
      'controls',
      {
        canCreateHome: true,
        canLeaveHome: false,
        canPostTreehole: true,
        canUseDirectComposer: false,
        canUseHomeChatComposer: false,
        canUseHomeQrJoin: true,
        canUseManualHomeJoin: true,
        canUseTrustProfile: true
      }
    ]
  )
})
