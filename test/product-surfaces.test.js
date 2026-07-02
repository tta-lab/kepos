import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  getProductSurfaceLabel,
  getProductSurfaceTitle,
  productSurfaceTabs
} from '../src/product-surfaces.ts'

test('product surface labels are shared across desktop and mobile', () => {
  assert.deepEqual(
    productSurfaceTabs.map((surface) => [surface.id, surface.label]),
    [
      ['chat', 'Home'],
      ['dm', 'Chat'],
      ['people', 'Contacts'],
      ['treehole', 'Treehole']
    ]
  )
})

test('product surface titles keep Home chat distinct from Home label', () => {
  assert.equal(getProductSurfaceLabel('chat'), 'Home')
  assert.equal(getProductSurfaceTitle('chat'), 'Home chat')
  assert.equal(getProductSurfaceTitle('dm'), 'Chat')
  assert.equal(getProductSurfaceTitle('treehole'), 'Treehole')
  assert.equal(getProductSurfaceTitle('people'), 'Contacts')
})

test('unknown product surfaces fall back to Contacts', () => {
  assert.equal(getProductSurfaceLabel('unknown'), 'Contacts')
  assert.equal(getProductSurfaceTitle('unknown'), 'Contacts')
})

test('desktop and mobile main navigation derive from product surface tabs', async () => {
  const desktopShell = await readFile(
    new URL('../desktop/shell-components.tsx', import.meta.url),
    'utf8'
  )
  const mobileRoom = await readFile(
    new URL('../mobile/room-components.tsx', import.meta.url),
    'utf8'
  )

  assert.match(desktopShell, /productSurfaceTabs\.map\(\(surface\) =>/)
  assert.match(desktopShell, /id=\{RAIL_TAB_IDS\[surface\.id\]\}/)
  assert.match(desktopShell, /icon=\{RAIL_ICONS\[surface\.id\]\}/)
  assert.match(desktopShell, /label=\{surface\.label\}/)
  assert.match(desktopShell, /title=\{surface\.title\}/)
  assert.match(desktopShell, /onSelect=\{\(\) => shellActions\.setTab\(surface\.id\)\}/)
  assert.doesNotMatch(desktopShell, /getProductSurfaceLabel\('/)
  assert.doesNotMatch(desktopShell, /getProductSurfaceTitle\('/)

  assert.match(mobileRoom, /productSurfaceTabs\.map\(\(surface\) =>/)
  assert.match(mobileRoom, /icon=\{MOBILE_TAB_ICONS\[surface\.id\]\}/)
  assert.match(mobileRoom, /label=\{surface\.label\}/)
  assert.match(mobileRoom, /testID=\{MOBILE_TAB_TEST_IDS\[surface\.id\]\}/)
  assert.match(mobileRoom, /onPress=\{\(\) => onTabChange\(surface\.id\)\}/)
  assert.doesNotMatch(mobileRoom, /getProductSurfaceLabel\('/)
  assert.doesNotMatch(mobileRoom, /getProductSurfaceTitle\('/)
})
