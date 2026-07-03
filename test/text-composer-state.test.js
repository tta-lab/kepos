import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { createTextComposerState } from '../src/text-composer-state.ts'

test('text composer state normalizes draft text and submit availability', () => {
  assert.deepEqual(createTextComposerState({ draft: ' hello ' }), {
    canSubmit: true,
    text: 'hello'
  })
  assert.deepEqual(createTextComposerState({ draft: ' hello ', enabled: false }), {
    canSubmit: false,
    text: 'hello'
  })
  assert.deepEqual(createTextComposerState({ draft: '   ' }), {
    canSubmit: false,
    text: ''
  })
  assert.deepEqual(createTextComposerState({ draft: null }), {
    canSubmit: false,
    text: ''
  })
})

test('text composer state keeps platform components out of raw draft trimming', async () => {
  const desktop = await readFile(new URL('../desktop/pane-components.tsx', import.meta.url), 'utf8')
  const mobileMessages = await readFile(
    new URL('../mobile/message-components.tsx', import.meta.url),
    'utf8'
  )
  const mobileTreehole = await readFile(
    new URL('../mobile/treehole-components.tsx', import.meta.url),
    'utf8'
  )

  assert.match(desktop, /createTextComposerState\(/)
  assert.match(mobileMessages, /createTextComposerState\(/)
  assert.match(mobileTreehole, /createTextComposerState\(/)
  assert.doesNotMatch(desktop, /Boolean\(draft\.trim\(\)\)/)
  assert.doesNotMatch(mobileMessages, /disabled=\{!draft\.trim\(\)\}/)
  assert.doesNotMatch(mobileTreehole, /draft\.trim\(\)\.length > 0/)
})
