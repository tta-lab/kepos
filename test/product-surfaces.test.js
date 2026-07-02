import assert from 'node:assert/strict'
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

test('unknown product surfaces fall back to Home', () => {
  assert.equal(getProductSurfaceLabel('unknown'), 'Home')
  assert.equal(getProductSurfaceTitle('unknown'), 'Home chat')
})
