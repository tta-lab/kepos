import assert from 'node:assert/strict'
import test from 'node:test'
import { selectProfileSelectionSource } from '../src/profile-selection-source.ts'

test('profile selection source chooses the first matching ordered group', () => {
  const result = selectProfileSelectionSource({
    groups: [
      { kind: 'trusted', values: [{ profileId: 'friend', label: 'trusted' }] },
      { kind: 'request_target', values: [{ profileId: 'friend', label: 'target' }] }
    ],
    selectedProfileId: 'friend'
  })

  assert.deepEqual(result, {
    kind: 'trusted',
    value: {
      label: 'trusted',
      profileId: 'friend'
    }
  })
})

test('profile selection source falls through to a later matching group', () => {
  const result = selectProfileSelectionSource({
    groups: [
      { kind: 'trusted', values: [{ profileId: 'other' }] },
      { kind: 'request_target', values: [{ profileId: 'friend' }] }
    ],
    selectedProfileId: 'friend'
  })

  assert.equal(result?.kind, 'request_target')
  assert.deepEqual(result?.value, { profileId: 'friend' })
})

test('profile selection source returns null without a selected profile id', () => {
  assert.equal(
    selectProfileSelectionSource({
      groups: [{ kind: 'trusted', values: [{ profileId: 'friend' }] }],
      selectedProfileId: ''
    }),
    null
  )
})
