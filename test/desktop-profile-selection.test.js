import assert from 'node:assert/strict'
import test from 'node:test'
import { createDesktopProfileSelectionViewModel } from '../src/desktop-profile-selection.ts'

const baseProfile = {
  alias: 'Ada',
  avatar: {
    initials: 'A',
    label: 'Ada avatar',
    tone: 'avatarTone1'
  },
  homeActionEnabled: false,
  homeActionLabel: 'Enter Home',
  messageActionEnabled: true,
  messageActionLabel: 'Message',
  profileId: 'friend',
  recentTitle: 'Recent posts',
  relationshipState: 'trusted',
  revokeActionLabel: 'Remove friend',
  shortProfileId: 'short:friend',
  sourceLabel: 'From Profile QR',
  statusLabel: 'Trusted',
  trustedAtLabel: 'Trusted date'
}

const emptyPeople = {
  blockedContacts: [],
  messageRequests: [],
  outgoingRequests: [],
  profileDetails: [],
  trustedContacts: []
}

test('desktop profile selection adds recent posts to trusted contacts and selected detail', () => {
  const viewModel = createDesktopProfileSelectionViewModel({
    activeHomeOwnerProfileId: 'friend',
    formatTime: (value) => `time:${value}`,
    people: {
      ...emptyPeople,
      profileDetails: [baseProfile],
      trustedContacts: [baseProfile]
    },
    selectedProfileId: 'friend',
    shortenProfileId: (profileId) => `short:${profileId}`,
    treeholePosts: [
      {
        createdAt: 2000,
        id: 'post-1',
        text: 'hello'
      }
    ]
  })

  assert.equal(viewModel.people.trustedContacts[0].recentCopy, '1 recent post from this profile.')
  assert.deepEqual(viewModel.selectedProfile?.recentPosts, [
    {
      id: 'post-1',
      metaLabel: 'time:2000 · 0 comments · 0 likes',
      text: 'hello'
    }
  ])
})

test('desktop profile selection projects scanned request targets without Home entry', () => {
  const viewModel = createDesktopProfileSelectionViewModel({
    formatTime: (value) => `time:${value}`,
    people: emptyPeople,
    profileRequestTarget: {
      displayName: 'Grace',
      profileId: 'target',
      shortProfileId: 'short:target',
      statusLabel: 'Friend request'
    },
    selectedProfileId: 'target',
    shortenProfileId: (profileId) => `short:${profileId}`
  })

  assert.equal(viewModel.selectedProfile?.alias, 'Grace')
  assert.equal(viewModel.selectedProfile?.relationshipState, 'request_target')
  assert.equal(viewModel.selectedProfile?.messageActionEnabled, true)
  assert.equal(viewModel.selectedProfile?.messageActionLabel, 'Write request')
  assert.equal(viewModel.selectedProfile?.homeActionEnabled, false)
  assert.equal(viewModel.selectedProfile?.recentPosts.length, 0)
})

test('desktop profile selection prefers stored profile details over matching request targets', () => {
  const viewModel = createDesktopProfileSelectionViewModel({
    formatTime: (value) => `time:${value}`,
    people: {
      ...emptyPeople,
      profileDetails: [baseProfile],
      trustedContacts: [baseProfile]
    },
    profileRequestTarget: {
      displayName: 'Request Target',
      profileId: 'friend',
      shortProfileId: 'short:friend',
      statusLabel: 'Friend request'
    },
    selectedProfileId: 'friend',
    shortenProfileId: (profileId) => `short:${profileId}`
  })

  assert.equal(viewModel.selectedProfile?.alias, 'Ada')
  assert.equal(viewModel.selectedProfile?.relationshipState, 'trusted')
})
