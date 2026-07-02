import assert from 'node:assert/strict'
import test from 'node:test'
import { createAvatarMediaReference } from '../src/avatar-media.ts'
import {
  createContactBook,
  recordMessageRequest,
  recordOutgoingFriendRequest,
  trustContact
} from '../src/contact-book.ts'
import {
  createDmThreadListView,
  filterDirectMessagesForProfile,
  findSelectedDmThreadView,
  upsertDmThread
} from '../src/dm-thread-list.ts'

test('upsert DM thread replaces by thread id and preserves other threads', () => {
  assert.deepEqual(
    upsertDmThread(
      [
        { remoteProfileId: 'friend-a', threadId: 'thread-a' },
        { remoteProfileId: 'old', threadId: 'thread-b' }
      ],
      { remoteProfileId: 'friend-b', threadId: 'thread-b' }
    ),
    [
      { remoteProfileId: 'friend-a', threadId: 'thread-a' },
      { remoteProfileId: 'friend-b', threadId: 'thread-b' }
    ]
  )
})

test('upsert DM thread ignores empty thread payloads', () => {
  const threads = [{ threadId: 'thread-a' }]

  assert.equal(upsertDmThread(threads, null), threads)
  assert.equal(upsertDmThread(threads, {}), threads)
})

test('creates DM inbox rows from accepted threads and latest messages', () => {
  const friendProfileId = 'b'.repeat(64)
  const revokedProfileId = 'c'.repeat(64)
  const book = trustContact(createContactBook({ ownerProfileId: 'a'.repeat(64) }), {
    alias: 'Mina',
    avatarUriSnapshot: 'kepos://avatar/mina',
    homeAddress: 'home://mina',
    homeRoomKey: 'room-mina',
    profileId: friendProfileId,
    trustedAt: 1000
  })

  assert.deepEqual(
    createDmThreadListView({
      contactBook: book,
      formatTime: (value) => `t:${value}`,
      messages: [
        {
          at: 1100,
          direction: 'in',
          fromProfileId: friendProfileId,
          id: 'older',
          text: 'first',
          type: 'dm'
        },
        {
          at: 1300,
          direction: 'out',
          id: 'latest',
          text: 'see you soon',
          toProfileId: friendProfileId,
          type: 'dm'
        },
        {
          at: 1400,
          direction: 'in',
          fromProfileId: revokedProfileId,
          id: 'revoked-message',
          text: 'ignore revoked',
          type: 'dm'
        }
      ],
      shortenProfileId: (value) => `${value.slice(0, 4)}...`,
      threads: [
        {
          acceptedAt: 1000,
          remoteProfileId: friendProfileId,
          state: 'accepted',
          threadId: 'thread-mina'
        },
        {
          acceptedAt: 900,
          remoteProfileId: revokedProfileId,
          revokedAt: 1200,
          state: 'revoked',
          threadId: 'thread-revoked'
        },
        {
          remoteProfileId: 'd'.repeat(64),
          state: 'pending',
          threadId: 'thread-pending'
        }
      ]
    }),
    [
      {
        avatar: {
          imageUri: 'kepos://avatar/mina',
          initials: 'M',
          label: 'Mina avatar',
          tone: 'avatarTone3'
        },
        label: 'Mina',
        preview: 'You: see you soon',
        profileId: friendProfileId,
        statusLabel: 'Accepted thread',
        threadId: 'thread-mina',
        timeLabel: 't:1300',
        unreadCount: 0,
        unreadLabel: ''
      }
    ]
  )
})

test('creates Chat rows from trusted contacts without saved DM threads', () => {
  const friendProfileId = 'b'.repeat(64)
  const book = trustContact(createContactBook({ ownerProfileId: 'a'.repeat(64) }), {
    alias: 'Mina',
    avatarUriSnapshot: 'kepos://avatar/mina',
    profileId: friendProfileId,
    trustedAt: 1000
  })

  assert.deepEqual(
    createDmThreadListView({
      contactBook: book,
      formatTime: (value) => `t:${value}`,
      shortenProfileId: (value) => `${value.slice(0, 4)}...`,
      threads: []
    }),
    [
      {
        avatar: {
          imageUri: 'kepos://avatar/mina',
          initials: 'M',
          label: 'Mina avatar',
          tone: 'avatarTone3'
        },
        label: 'Mina',
        preview: 'No messages yet',
        profileId: friendProfileId,
        statusLabel: 'Accepted thread',
        threadId: `contact:${friendProfileId}`,
        timeLabel: 't:1000',
        unreadCount: 0,
        unreadLabel: ''
      }
    ]
  )
})

test('creates Chat rows from trusted contact arrays without saved DM threads', () => {
  const friendProfileId = 'b'.repeat(64)

  assert.deepEqual(
    createDmThreadListView({
      contacts: [
        {
          alias: 'Mina',
          avatarUriSnapshot: 'kepos://avatar/mina',
          profileId: friendProfileId
        }
      ],
      formatTime: (value) => `t:${value}`,
      shortenProfileId: (value) => `${value.slice(0, 4)}...`,
      threads: []
    }),
    [
      {
        avatar: {
          imageUri: 'kepos://avatar/mina',
          initials: 'M',
          label: 'Mina avatar',
          tone: 'avatarTone3'
        },
        label: 'Mina',
        preview: 'No messages yet',
        profileId: friendProfileId,
        statusLabel: 'Accepted thread',
        threadId: `contact:${friendProfileId}`,
        timeLabel: 'Accepted thread',
        unreadCount: 0,
        unreadLabel: ''
      }
    ]
  )
})

test('resolves contact avatar media snapshots for DM inbox rows', () => {
  const friendProfileId = 'b'.repeat(64)
  const avatarMediaSnapshot = createAvatarMediaReference({
    bytes: new Uint8Array([1, 2, 3]),
    createdAt: 1000,
    mimeType: 'image/png',
    sha256Hex: () => 'a'.repeat(64)
  })
  const book = trustContact(createContactBook({ ownerProfileId: 'a'.repeat(64) }), {
    alias: 'Mina',
    avatarMediaSnapshot,
    avatarUriSnapshot: 'kepos://avatar/old',
    profileId: friendProfileId,
    trustedAt: 1000
  })

  const [row] = createDmThreadListView({
    contactBook: book,
    formatTime: String,
    resolveAvatarMediaUri: (reference) => `file:///avatars/${reference.digest}.png`,
    shortenProfileId: (value) => value.slice(0, 4),
    threads: [
      {
        acceptedAt: 1000,
        remoteProfileId: friendProfileId,
        state: 'accepted',
        threadId: 'thread-mina'
      }
    ]
  })

  assert.equal(row.avatar.imageUri, `file:///avatars/${'a'.repeat(64)}.png`)
})

test('DM inbox rows can fall back to the latest versioned profile snapshot', () => {
  const profileId = 'b'.repeat(64)
  const view = createDmThreadListView({
    contactBook: null,
    contacts: [
      {
        profileId,
        profileSnapshots: [
          {
            avatarUriSnapshot: 'kepos://avatar/old',
            capturedAt: 1000,
            displayNameSnapshot: 'Old Mina',
            profileId,
            version: 1
          },
          {
            avatarUriSnapshot: 'kepos://avatar/new',
            capturedAt: 2000,
            displayNameSnapshot: 'New Mina',
            profileId,
            version: 1
          }
        ]
      }
    ],
    formatTime: (value) => `t:${value}`,
    messages: [],
    shortenProfileId: (value) => value.slice(0, 4),
    threads: [
      {
        acceptedAt: 3000,
        remoteProfileId: profileId,
        state: 'accepted',
        threadId: 'thread-mina'
      }
    ]
  })

  assert.equal(view[0].label, 'New Mina')
  assert.equal(view[0].avatar.imageUri, 'kepos://avatar/new')
})

test('sorts DM inbox rows by latest activity first', () => {
  const firstProfileId = 'b'.repeat(64)
  const secondProfileId = 'c'.repeat(64)

  assert.deepEqual(
    createDmThreadListView({
      formatTime: String,
      messages: [
        {
          at: 1000,
          direction: 'in',
          fromProfileId: firstProfileId,
          id: 'older',
          text: 'older',
          type: 'dm'
        },
        {
          at: 2000,
          direction: 'in',
          fromProfileId: secondProfileId,
          id: 'newer',
          text: 'newer',
          type: 'dm'
        }
      ],
      shortenProfileId: (value) => value.slice(0, 4),
      threads: [
        {
          acceptedAt: 1000,
          remoteProfileId: firstProfileId,
          state: 'accepted',
          threadId: 'thread-first'
        },
        {
          acceptedAt: 900,
          remoteProfileId: secondProfileId,
          state: 'accepted',
          threadId: 'thread-second'
        }
      ]
    }).map((thread) => ({
      avatar: thread.avatar,
      threadId: thread.threadId
    })),
    [
      {
        avatar: {
          initials: 'CC',
          label: 'Profile cc avatar',
          tone: 'avatarTone1'
        },
        threadId: 'thread-second'
      },
      {
        avatar: {
          initials: 'BB',
          label: 'Profile bb avatar',
          tone: 'avatarTone3'
        },
        threadId: 'thread-first'
      }
    ]
  )
})

test('shows requested DM threads as pending inbox rows', () => {
  const requestedProfileId = 'd'.repeat(64)

  const [row] = createDmThreadListView({
    formatTime: (value) => `t:${value}`,
    shortenProfileId: (value) => `${value.slice(0, 4)}...`,
    threads: [
      {
        remoteProfileId: requestedProfileId,
        requestedAt: 1500,
        state: 'requested',
        threadId: 'thread-requested'
      }
    ]
  })

  assert.equal(row.profileId, requestedProfileId)
  assert.equal(row.preview, 'Waiting for acceptance')
  assert.equal(row.statusLabel, 'Request pending')
  assert.equal(row.threadId, 'thread-requested')
  assert.equal(row.timeLabel, 't:1500')
})

test('adds actions only to incoming requested inbox rows', () => {
  const requestedProfileId = 'e'.repeat(64)
  const incomingRequest = {
    at: 1800,
    direction: 'in',
    fromProfileId: requestedProfileId,
    id: 'request-in',
    text: 'hello',
    type: 'kepos.message.request.v1'
  }

  const [incomingRow, outgoingRow] = createDmThreadListView({
    formatTime: (value) => `t:${value}`,
    messages: [
      incomingRequest,
      {
        at: 1700,
        direction: 'out',
        id: 'request-out',
        text: 'pending',
        toProfileId: 'f'.repeat(64),
        type: 'kepos.message.request.v1'
      }
    ],
    shortenProfileId: (value) => value.slice(0, 4),
    threads: [
      {
        remoteProfileId: requestedProfileId,
        requestedAt: 1800,
        state: 'requested',
        threadId: 'thread-incoming-request'
      },
      {
        remoteProfileId: 'f'.repeat(64),
        requestedAt: 1500,
        state: 'requested',
        threadId: 'thread-outgoing-request'
      }
    ]
  })

  assert.deepEqual(incomingRow.requestActions, {
    acceptMessage: incomingRequest,
    ignoreMessage: incomingRequest
  })
  assert.equal(outgoingRow.requestActions, undefined)
})

test('creates Chat rows from contact book friend requests without DM thread snapshots', () => {
  const localProfileId = 'a'.repeat(64)
  const incomingProfileId = 'e'.repeat(64)
  const outgoingProfileId = 'f'.repeat(64)
  const book = recordOutgoingFriendRequest(
    recordMessageRequest(createContactBook({ ownerProfileId: localProfileId }), {
      alias: 'Incoming Ada',
      profileId: incomingProfileId,
      requestedAt: 1800,
      requestId: 'request-in',
      senderEncryptionPublicKey: 'sender-key',
      text: 'can we talk?'
    }),
    {
      alias: 'Outgoing Grace',
      deliveryState: 'delivered',
      profileId: outgoingProfileId,
      requestedAt: 1700,
      requestId: 'request-out',
      text: 'hello'
    }
  )

  const rows = createDmThreadListView({
    contactBook: book,
    formatTime: (value) => `t:${value}`,
    shortenProfileId: (value) => value.slice(0, 4),
    threads: []
  })

  assert.deepEqual(
    rows.map((row) => ({
      label: row.label,
      preview: row.preview,
      profileId: row.profileId,
      statusLabel: row.statusLabel,
      threadId: row.threadId,
      timeLabel: row.timeLabel
    })),
    [
      {
        label: 'Incoming Ada',
        preview: 'can we talk?',
        profileId: incomingProfileId,
        statusLabel: 'Incoming request',
        threadId: `request:in:${incomingProfileId}:request-in`,
        timeLabel: 't:1800'
      },
      {
        label: 'Outgoing Grace',
        preview: 'You: hello',
        profileId: outgoingProfileId,
        statusLabel: 'Request delivered',
        threadId: `request:out:${outgoingProfileId}:request-out`,
        timeLabel: 't:1700'
      }
    ]
  )
  assert.deepEqual(rows[0].requestActions, {
    acceptMessage: {
      at: 1800,
      direction: 'in',
      fromProfileId: incomingProfileId,
      id: `request:in:${incomingProfileId}:request-in`,
      requestId: 'request-in',
      senderEncryptionPublicKey: 'sender-key',
      text: 'can we talk?',
      toProfileId: localProfileId,
      type: 'kepos.message.request.v1'
    },
    ignoreMessage: {
      at: 1800,
      direction: 'in',
      fromProfileId: incomingProfileId,
      id: `request:in:${incomingProfileId}:request-in`,
      requestId: 'request-in',
      senderEncryptionPublicKey: 'sender-key',
      text: 'can we talk?',
      toProfileId: localProfileId,
      type: 'kepos.message.request.v1'
    }
  })
  assert.equal(rows[1].requestActions, undefined)
})

test('creates Chat rows from explicit mobile friend request arrays', () => {
  const incomingProfileId = 'e'.repeat(64)
  const outgoingProfileId = 'f'.repeat(64)

  const rows = createDmThreadListView({
    formatTime: (value) => `t:${value}`,
    outgoingRequests: [
      {
        alias: 'Outgoing Grace',
        deliveryState: 'searching',
        profileId: outgoingProfileId,
        requestedAt: 1700,
        requestId: 'request-out',
        text: 'hello'
      }
    ],
    ownerProfileId: 'a'.repeat(64),
    pendingRequests: [
      {
        alias: 'Incoming Ada',
        profileId: incomingProfileId,
        requestedAt: 1800,
        requestId: 'request-in',
        senderEncryptionPublicKey: 'sender-key',
        text: 'can we talk?'
      }
    ],
    shortenProfileId: (value) => value.slice(0, 4),
    threads: []
  })

  assert.deepEqual(
    rows.map((row) => [row.label, row.statusLabel, row.preview]),
    [
      ['Incoming Ada', 'Incoming request', 'can we talk?'],
      ['Outgoing Grace', 'Looking for profile', 'You: hello']
    ]
  )
})

test('counts unread incoming direct messages only after an explicit read marker', () => {
  const profileId = 'b'.repeat(64)
  const otherProfileId = 'c'.repeat(64)

  const [row] = createDmThreadListView({
    formatTime: String,
    lastReadAtByProfileId: new Map([[profileId, 1200]]),
    messages: [
      {
        at: 1100,
        direction: 'in',
        fromProfileId: profileId,
        id: 'read-incoming',
        text: 'old',
        type: 'dm'
      },
      {
        at: 1300,
        direction: 'out',
        id: 'outgoing',
        text: 'sent',
        toProfileId: profileId,
        type: 'dm'
      },
      {
        at: 1400,
        direction: 'in',
        fromProfileId: profileId,
        id: 'unread-incoming',
        text: 'new',
        type: 'dm'
      },
      {
        at: 1500,
        direction: 'in',
        fromProfileId: otherProfileId,
        id: 'other-thread',
        text: 'ignore',
        type: 'dm'
      }
    ],
    shortenProfileId: (value) => value.slice(0, 4),
    threads: [
      {
        acceptedAt: 1000,
        remoteProfileId: profileId,
        state: 'accepted',
        threadId: 'thread-b'
      }
    ]
  })

  assert.equal(row.unreadCount, 1)
  assert.equal(row.unreadLabel, '1 new')
})

test('does not invent unread counts without a read marker', () => {
  const profileId = 'b'.repeat(64)

  const [row] = createDmThreadListView({
    formatTime: String,
    messages: [
      {
        at: 1400,
        direction: 'in',
        fromProfileId: profileId,
        id: 'incoming',
        text: 'new',
        type: 'dm'
      }
    ],
    shortenProfileId: (value) => value.slice(0, 4),
    threads: [
      {
        acceptedAt: 1000,
        remoteProfileId: profileId,
        state: 'accepted',
        threadId: 'thread-b'
      }
    ]
  })

  assert.equal(row.unreadCount, 0)
  assert.equal(row.unreadLabel, '')
})

test('counts unread messages from a persisted thread read marker', () => {
  const profileId = 'b'.repeat(64)

  const [row] = createDmThreadListView({
    formatTime: String,
    messages: [
      {
        at: 1300,
        direction: 'in',
        fromProfileId: profileId,
        id: 'incoming',
        text: 'new',
        type: 'dm'
      }
    ],
    shortenProfileId: (value) => value.slice(0, 4),
    threads: [
      {
        acceptedAt: 1000,
        lastReadAt: 1200,
        remoteProfileId: profileId,
        state: 'accepted',
        threadId: 'thread-b'
      }
    ]
  })

  assert.equal(row.unreadCount, 1)
  assert.equal(row.unreadLabel, '1 new')
})

test('filters direct messages to the selected peer profile', () => {
  const selectedProfileId = 'b'.repeat(64)
  const otherProfileId = 'c'.repeat(64)
  const messages = [
    {
      direction: 'in',
      fromProfileId: selectedProfileId,
      id: 'selected-in',
      text: 'from selected',
      type: 'dm'
    },
    {
      direction: 'out',
      id: 'selected-out',
      text: 'to selected',
      toProfileId: selectedProfileId,
      type: 'dm'
    },
    {
      direction: 'in',
      fromProfileId: otherProfileId,
      id: 'other-in',
      text: 'from other',
      type: 'dm'
    }
  ]

  assert.deepEqual(filterDirectMessagesForProfile(messages, selectedProfileId), [
    messages[0],
    messages[1]
  ])
  assert.deepEqual(filterDirectMessagesForProfile(messages, '  '), [])
})

test('finds the selected DM thread view by trimmed profile id', () => {
  const selected = {
    label: 'Mina',
    profileId: 'friend-b',
    threadId: 'thread-b'
  }

  assert.equal(
    findSelectedDmThreadView({
      selectedProfileId: ' friend-b ',
      threads: [{ label: 'Ari', profileId: 'friend-a', threadId: 'thread-a' }, selected]
    }),
    selected
  )
})

test('selected DM thread view ignores blank ids and malformed rows', () => {
  assert.equal(
    findSelectedDmThreadView({
      selectedProfileId: 'friend-b',
      threads: [null, {}, { label: 'Missing profile' }]
    }),
    null
  )
  assert.equal(findSelectedDmThreadView({ selectedProfileId: ' ', threads: [] }), null)
})
