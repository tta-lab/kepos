import assert from 'node:assert/strict'
import test from 'node:test'
import { createContactBook, recordMessageRequest, trustContact } from '../src/contact-book.ts'
import { createDesktopPeopleViewModel } from '../src/desktop-people-view-model.js'

test('desktop people view model formats trusted contacts for rendering', () => {
  const profileId = 'b'.repeat(64)
  const book = trustContact(createContactBook({ ownerProfileId: 'owner-a' }), {
    alias: 'Ada',
    profileId,
    source: 'profile_qr',
    trustedAt: 2000
  })

  const viewModel = createDesktopPeopleViewModel({
    contactBook: book,
    formatDate: () => 'Jan 1, 1970',
    shortenProfileId: (profileId) => `short:${profileId}`
  })

  assert.deepEqual(viewModel.trustedContacts, [
    {
      alias: 'Ada',
      profileId,
      shortProfileId: `short:${profileId}`,
      sourceLabel: 'From Profile QR',
      statusLabel: 'Trusted',
      trustedAtLabel: 'Trusted Jan 1, 1970'
    }
  ])
})

test('desktop people view model formats pending message requests for rendering', () => {
  const profileId = 'b'.repeat(64)
  const book = recordMessageRequest(createContactBook({ ownerProfileId: 'owner-a' }), {
    alias: 'Ada',
    profileId,
    requestedAt: 1000,
    requestId: 'request-1',
    source: 'home_room',
    text: ' hello '
  })

  const viewModel = createDesktopPeopleViewModel({
    contactBook: book,
    shortenProfileId: (profileId) => `short:${profileId}`
  })

  assert.deepEqual(viewModel.messageRequests, [
    {
      acceptMessage: {
        fromProfileId: profileId,
        nick: 'Ada',
        type: 'kepos.message.request.v1'
      },
      profileId,
      profileLabel: 'Ada',
      preview: 'hello',
      title: 'Ada wants to start a DM.'
    }
  ])
})

test('desktop people view model uses stable fallbacks', () => {
  const profileId = 'b'.repeat(64)
  const book = createContactBook({ ownerProfileId: 'owner-a' })

  book.pendingRequestsByProfileId.set(profileId, {
    profileId,
    requestedAt: 1000,
    requestId: 'request-1',
    source: 'home_room',
    text: ''
  })

  const viewModel = createDesktopPeopleViewModel({
    contactBook: book,
    shortenProfileId: (profileId) => `short:${profileId}`
  })

  assert.deepEqual(viewModel.messageRequests, [
    {
      acceptMessage: {
        fromProfileId: profileId,
        nick: '',
        type: 'kepos.message.request.v1'
      },
      profileId,
      profileLabel: `short:${profileId}`,
      preview: 'No message yet',
      title: 'Someone wants to start a DM.'
    }
  ])
})

test('desktop people view model can render before a contact book snapshot arrives', () => {
  const viewModel = createDesktopPeopleViewModel({
    contactBook: null
  })

  assert.deepEqual(viewModel, {
    messageRequests: [],
    trustedContacts: []
  })
})
