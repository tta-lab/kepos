import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { describe, test } from 'node:test'

describe('manual key debug UI boundary', () => {
  test('desktop keeps manual home key entry inside an advanced section', async () => {
    const source = await readFile(new URL('../desktop/app.jsx', import.meta.url), 'utf8')

    assert.match(source, /<details[^>]+id='advancedJoin'/)
    assert.match(source, /<summary>Advanced<\/summary>/)
    assert.equal(source.indexOf("id='roomKeyInput'") > source.indexOf("id='advancedJoin'"), true)
  })

  test('desktop keeps raw share URIs inside advanced sections', async () => {
    const source = await readFile(new URL('../desktop/app.jsx', import.meta.url), 'utf8')

    assert.match(source, /<details[^>]+id='advancedHomeShare'/)
    assert.match(source, /<details[^>]+id='advancedProfileShare'/)
    assert.equal(
      source.indexOf("id='homeQrOutput'") > source.indexOf("id='advancedHomeShare'"),
      true
    )
    assert.equal(
      source.indexOf("id='profileQrOutput'") > source.indexOf("id='advancedProfileShare'"),
      true
    )
  })

  test('desktop keeps manual DM recipient entry inside an advanced section', async () => {
    const source = await readFile(new URL('../desktop/app.jsx', import.meta.url), 'utf8')

    assert.match(source, /<details[^>]+id='advancedDmRecipient'/)
    assert.equal(
      source.indexOf("id='dmRecipientInput'") > source.indexOf("id='advancedDmRecipient'"),
      true
    )
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
