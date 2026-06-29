import assert from 'node:assert/strict'
import test from 'node:test'
import { createDesktopQrActions } from '../src/desktop-qr-actions.js'

function createHarness(overrides = {}) {
  const calls = []
  let shareQrOutputs = {
    homeSvg: '',
    homeUri: '',
    profileSvg: '',
    profileUri: ''
  }
  let restoredFocus = false
  const returnFocus = {
    focus() {
      restoredFocus = true
      calls.push(['focus.restore'])
    }
  }
  const actions = createDesktopQrActions({
    copyText: (value) => calls.push(['clipboard.writeText', value]),
    createShareQrOutputs: ({ profile }) => ({
      homeSvg: `<svg>${profile.id}:home</svg>`,
      homeUri: `kepos://home/${profile.id}`,
      profileSvg: `<svg>${profile.id}:profile</svg>`,
      profileUri: `kepos://profile/${profile.id}`
    }),
    getProfileContext: () => ({
      profile: { id: 'local' }
    }),
    getShareQrOutputs: () => shareQrOutputs,
    onChanged: () => calls.push(['render']),
    renderQrSvg: (uri, options) => `<svg>${uri}:${options.width}:${options.margin}</svg>`,
    setLargeQr: (qr) => calls.push(['largeQr', qr]),
    setNotice: (notice) => calls.push(['notice', notice]),
    setShareQrOutputs: (outputs) => {
      shareQrOutputs = outputs
      calls.push(['shareQrOutputs', outputs])
    },
    ...overrides
  })

  return {
    actions,
    calls,
    get restoredFocus() {
      return restoredFocus
    },
    returnFocus
  }
}

test('desktop QR actions refresh share outputs from the current profile', async () => {
  const { actions, calls } = createHarness()

  await actions.updateQrOutputs()

  assert.deepEqual(calls, [
    [
      'shareQrOutputs',
      {
        homeSvg: '<svg>local:home</svg>',
        homeUri: 'kepos://home/local',
        profileSvg: '<svg>local:profile</svg>',
        profileUri: 'kepos://profile/local'
      }
    ]
  ])
})

test('desktop QR actions accept backend share output snapshots', () => {
  const { actions, calls } = createHarness()
  const outputs = {
    homeSvg: '<svg>backend-home</svg>',
    homeUri: 'kepos://home/backend',
    profileSvg: '<svg>backend-profile</svg>',
    profileUri: 'kepos://profile/backend'
  }

  actions.setShareQrOutputs(outputs)

  assert.equal(actions.getShareQrOutputs(), outputs)
  assert.deepEqual(calls, [['shareQrOutputs', outputs]])
})

test('desktop QR actions open and hide large QR with focus restoration', async () => {
  const harness = createHarness()

  await harness.actions.showLargeQr({
    returnFocus: harness.returnFocus,
    title: 'Home QR',
    uri: 'kepos://home/local'
  })
  harness.actions.hideLargeQr()

  assert.equal(harness.restoredFocus, true)
  assert.deepEqual(harness.calls, [
    [
      'largeQr',
      {
        isOpen: true,
        svg: '<svg>kepos://home/local:640:4</svg>',
        title: 'Home QR'
      }
    ],
    ['largeQr', { isOpen: false, svg: '', title: '' }],
    ['focus.restore']
  ])
})

test('desktop QR actions copy QR values and set notice', async () => {
  const { actions, calls } = createHarness()

  await actions.copyQrValue({ notice: 'Home QR copied.', value: ' kepos://home/local ' })
  await actions.copyQrValue({ notice: 'Ignored.', value: '   ' })

  assert.deepEqual(calls, [
    ['clipboard.writeText', ' kepos://home/local '],
    ['notice', 'Home QR copied.'],
    ['render']
  ])
})
