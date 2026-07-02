import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createContactBook,
  recordOutgoingFriendRequest,
  trustContact
} from '../src/contact-book.ts'
import { createDesktopRenderPresenter } from '../src/desktop-render-presenter.ts'
import { createDesktopState, setDesktopRoom, setDesktopTreehole } from '../src/desktop-state.ts'

function createUiRecorder() {
  const calls = []
  const ui = {
    setActiveTab: (payload) => calls.push(['activeTab', payload]),
    setControls: (payload) => calls.push(['controls', payload]),
    setDirectContactPicker: (payload) => calls.push(['directContactPicker', payload]),
    setDirectMessages: (payload) => calls.push(['directMessages', payload]),
    setDirectThreads: (payload) => calls.push(['directThreads', payload]),
    setHomeMessages: (payload) => calls.push(['homeMessages', payload]),
    setHomeOwner: (payload) => calls.push(['homeOwner', payload]),
    setPeople: (payload) => calls.push(['people', payload]),
    setActiveHomeOwnerProfileId: (payload) => calls.push(['activeHomeOwnerProfileId', payload]),
    setShellBusy: (payload) => calls.push(['shellBusy', payload]),
    setStatus: (payload) => calls.push(['status', payload]),
    setTreeholePosts: (payload) => calls.push(['treeholePosts', payload])
  }

  return { calls, ui }
}

test('desktop render presenter pushes the full room snapshot to React UI', () => {
  const localProfileId = 'a'.repeat(64)
  const profileId = 'b'.repeat(64)
  const contactBook = recordOutgoingFriendRequest(
    trustContact(createContactBook({ ownerProfileId: 'owner' }), {
      alias: 'Ada',
      profileId,
      source: 'profile_qr',
      trustedAt: 1000
    }),
    {
      alias: 'Grace',
      profileId: 'e'.repeat(64),
      requestedAt: 1200,
      requestId: 'request-1',
      text: 'hi'
    }
  )
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
      ownerProfileId: profileId,
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
          at: 1300,
          direction: 'out',
          id: 'dm-1',
          text: 'dm',
          toProfileId: profileId,
          type: 'kepos.dm.message.v1'
        }
      ]
    },
    dmThreads: [
      {
        remoteProfileId: profileId,
        state: 'accepted',
        threadId: 'thread-1'
      },
      {
        remoteProfileId: 'c'.repeat(64),
        state: 'requested',
        threadId: 'thread-2'
      },
      {
        remoteProfileId: 'd'.repeat(64),
        revokedAt: 2,
        state: 'accepted',
        threadId: 'thread-3'
      }
    ],
    pendingCommand: 'joinHome',
    session: {
      messages: [{ direction: 'out', nick: 'Desktop', text: 'hi' }],
      profileId: localProfileId
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
  assert.deepEqual(
    calls.find(([name]) => name === 'homeOwner'),
    [
      'homeOwner',
      {
        actionLabel: 'Open profile',
        canOpenProfile: true,
        ownerProfileId: profileId,
        subtitle: 'Ada is hosting',
        title: "Ada's home"
      }
    ]
  )
  assert.deepEqual(
    calls.find(([name]) => name === 'activeHomeOwnerProfileId'),
    ['activeHomeOwnerProfileId', profileId]
  )
  assert.equal(calls.find(([name]) => name === 'directMessages')[1][0].text, 'dm')
  assert.deepEqual(calls.find(([name]) => name === 'directThreads')[1], [
    {
      avatar: {
        initials: 'A',
        label: 'Ada avatar',
        tone: 'avatarTone3'
      },
      label: 'Ada',
      preview: 'You: dm',
      profileId,
      statusLabel: 'Accepted thread',
      threadId: 'thread-1',
      timeLabel: '09:30',
      unreadCount: 0,
      unreadLabel: ''
    },
    {
      avatar: {
        initials: 'G',
        label: 'Grace avatar',
        tone: 'avatarTone1'
      },
      label: 'Grace',
      preview: 'You: hi',
      profileId: 'e'.repeat(64),
      statusLabel: 'Request pending',
      threadId: `request:out:${'e'.repeat(64)}:request-1`,
      timeLabel: '09:30',
      unreadCount: 0,
      unreadLabel: ''
    },
    {
      avatar: {
        initials: 'CC',
        label: 'Profile cc avatar',
        tone: 'avatarTone1'
      },
      label: 'cccccc',
      preview: 'Waiting for acceptance',
      profileId: 'c'.repeat(64),
      statusLabel: 'Request pending',
      threadId: 'thread-2',
      timeLabel: 'Request pending',
      unreadCount: 0,
      unreadLabel: ''
    }
  ])
  assert.equal(
    calls.find(([name]) => name === 'directContactPicker')[1].contacts[0].profileId,
    profileId
  )
  assert.equal(calls.find(([name]) => name === 'people')[1].trustedContacts[0].alias, 'Ada')
  assert.equal(
    calls.find(([name]) => name === 'people')[1].outgoingRequests[0].statusLabel,
    'Request pending'
  )
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

test('desktop render presenter allows direct messages without entering Home', () => {
  const { calls, ui } = createUiRecorder()
  const presenter = createDesktopRenderPresenter({
    ui
  })

  presenter.render({
    contactBook: createContactBook({ ownerProfileId: 'owner' }),
    directComposerRecipientProfileId: 'friend',
    dmSession: { messages: [] },
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
        canUseDirectComposer: true,
        canUseHomeChatComposer: false,
        canUseHomeQrJoin: true,
        canUseManualHomeJoin: true,
        canUseTrustProfile: true
      }
    ]
  )
})

test('desktop render presenter shows restored accepted Chat rows without entering Home', () => {
  const friendProfileId = 'b'.repeat(64)
  const contactBook = trustContact(createContactBook({ ownerProfileId: 'owner' }), {
    alias: 'Ada',
    profileId: friendProfileId,
    trustedAt: 1000
  })
  const { calls, ui } = createUiRecorder()
  const presenter = createDesktopRenderPresenter({
    formatTime: (value) => `t:${value}`,
    shortenProfileId: (value) => value.slice(0, 6),
    ui
  })

  presenter.render({
    contactBook,
    directComposerRecipientProfileId: friendProfileId,
    dmSession: {
      messages: [
        {
          at: 2200,
          direction: 'in',
          fromProfileId: friendProfileId,
          id: 'message-1',
          text: 'still here after restart',
          type: 'kepos.dm.message.v1'
        }
      ]
    },
    dmThreads: [
      {
        acceptedAt: 2000,
        remoteProfileId: friendProfileId,
        state: 'accepted',
        threadId: 'thread-accepted'
      }
    ],
    pendingCommand: null,
    session: null,
    state: createDesktopState()
  })

  assert.equal(calls.find(([name]) => name === 'controls')[1].canUseHomeChatComposer, false)
  assert.equal(calls.find(([name]) => name === 'homeMessages')[1].length, 0)
  assert.deepEqual(calls.find(([name]) => name === 'directThreads')[1], [
    {
      avatar: {
        initials: 'A',
        label: 'Ada avatar',
        tone: 'avatarTone3'
      },
      label: 'Ada',
      preview: 'still here after restart',
      profileId: friendProfileId,
      statusLabel: 'Accepted thread',
      threadId: 'thread-accepted',
      timeLabel: 't:2200',
      unreadCount: 0,
      unreadLabel: ''
    }
  ])
})
