import assert from 'node:assert/strict'
import test from 'node:test'
import { getMobileThemeForScheme, mobileThemes } from '../src/mobile-theme-tokens.js'

test('mobile theme tokens expose Neo Cozy light and Indie Console dark palettes', () => {
  assert.equal(mobileThemes.neoCozy.surface, '#fffaf0')
  assert.equal(mobileThemes.neoCozy.statusBar, 'dark-content')
  assert.equal(mobileThemes.indieConsole.surface, '#171d33')
  assert.equal(mobileThemes.indieConsole.accent, '#ffcf3d')
  assert.equal(mobileThemes.indieConsole.statusBar, 'light-content')
})

test('mobile theme selector maps color scheme to product theme', () => {
  assert.equal(getMobileThemeForScheme('light'), mobileThemes.neoCozy)
  assert.equal(getMobileThemeForScheme(null), mobileThemes.neoCozy)
  assert.equal(getMobileThemeForScheme('dark'), mobileThemes.indieConsole)
})
