import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeComposerText } from '../src/composer-text.ts'

test('composer text normalization trims string drafts', () => {
  assert.equal(normalizeComposerText('  hello kepos  '), 'hello kepos')
})

test('composer text normalization keeps interior whitespace', () => {
  assert.equal(normalizeComposerText('hello   kepos\nagain'), 'hello   kepos\nagain')
})

test('composer text normalization treats non-string drafts as empty text', () => {
  assert.equal(normalizeComposerText(null), '')
  assert.equal(normalizeComposerText(undefined), '')
  assert.equal(normalizeComposerText(42), '')
})
