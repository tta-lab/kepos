import assert from 'node:assert/strict'
import test from 'node:test'
import { createHomeOwnerViewModel } from '../src/home-owner-view-model.ts'

test('home owner view model labels the local profile home', () => {
  assert.deepEqual(
    createHomeOwnerViewModel({
      localProfileId: 'a'.repeat(64),
      ownerProfileId: 'a'.repeat(64),
      shortenProfileId: (value) => `short:${value.slice(0, 4)}`
    }),
    {
      canOpenProfile: false,
      ownerProfileId: 'a'.repeat(64),
      subtitle: 'Live chat and presence',
      title: 'My home'
    }
  )
})

test('home owner view model labels a trusted contact home', () => {
  assert.deepEqual(
    createHomeOwnerViewModel({
      contacts: [{ alias: 'Ada', profileId: 'b'.repeat(64) }],
      localProfileId: 'a'.repeat(64),
      ownerProfileId: 'b'.repeat(64),
      shortenProfileId: (value) => `short:${value.slice(0, 4)}`
    }),
    {
      actionLabel: 'Open profile',
      canOpenProfile: true,
      ownerProfileId: 'b'.repeat(64),
      subtitle: 'Ada is hosting',
      title: "Ada's home"
    }
  )
})

test('home owner view model falls back to a short owner fingerprint', () => {
  assert.deepEqual(
    createHomeOwnerViewModel({
      localProfileId: 'a'.repeat(64),
      ownerProfileId: 'c'.repeat(64),
      shortenProfileId: (value) => `short:${value.slice(0, 4)}`
    }),
    {
      canOpenProfile: false,
      ownerProfileId: 'c'.repeat(64),
      subtitle: 'Owner short:cccc',
      title: 'Profile short:cccc home'
    }
  )
})
