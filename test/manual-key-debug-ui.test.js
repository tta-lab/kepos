import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { describe, test } from 'node:test'

describe('manual key debug UI boundary', () => {
  test('desktop keeps manual home key entry inside an advanced section', async () => {
    const html = await readFile(new URL('../desktop/index.html', import.meta.url), 'utf8')

    assert.match(html, /<details[^>]+id="advancedJoin"/)
    assert.match(html, /<summary>Advanced<\/summary>/)
    assert.equal(html.indexOf('id="roomKeyInput"') > html.indexOf('id="advancedJoin"'), true)
  })

  test('mobile hides manual home key entry until advanced mode is opened', async () => {
    const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')

    assert.match(source, /const \[showAdvancedJoin, setShowAdvancedJoin\] = useState\(false\)/)
    assert.match(source, /showAdvancedJoin \? \(/)
    assert.equal(
      source.indexOf('<Text style={styles.panelTitle}>Manual home key</Text>') >
        source.indexOf('showAdvancedJoin ? ('),
      true
    )
  })
})
