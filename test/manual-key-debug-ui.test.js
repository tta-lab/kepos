import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { describe, test } from 'node:test'

async function readDesktopUiSource() {
  const app = await readFile(new URL('../desktop/app.tsx', import.meta.url), 'utf8')
  const appState = await readFile(new URL('../desktop/app-state.ts', import.meta.url), 'utf8')
  const panes = await readFile(new URL('../desktop/pane-components.tsx', import.meta.url), 'utf8')
  const shell = await readFile(new URL('../desktop/shell-components.tsx', import.meta.url), 'utf8')
  const context = await readFile(
    new URL('../desktop/context-components.tsx', import.meta.url),
    'utf8'
  )
  const people = await readFile(
    new URL('../desktop/people-components.tsx', import.meta.url),
    'utf8'
  )
  return `${app}\n${appState}\n${panes}\n${shell}\n${context}\n${people}`
}

describe('manual key debug UI boundary', () => {
  test('desktop keeps manual home key entry inside an advanced section', async () => {
    const source = await readDesktopUiSource()

    assert.match(source, /<details[^>]+id='advancedJoin'/)
    assert.match(source, /<summary>Advanced<\/summary>/)
    assert.equal(source.indexOf("id='roomKeyInput'") > source.indexOf("id='advancedJoin'"), true)
  })

  test('desktop keeps raw share URIs inside advanced sections', async () => {
    const source = await readDesktopUiSource()

    assert.match(source, /detailsId='advancedHomeShare'/)
    assert.match(source, /detailsId='advancedProfileShare'/)
    assert.equal(
      source.indexOf("outputId='homeQrOutput'") > source.indexOf("detailsId='advancedHomeShare'"),
      true
    )
    assert.equal(
      source.indexOf("outputId='profileQrOutput'") >
        source.indexOf("detailsId='advancedProfileShare'"),
      true
    )
  })

  test('desktop keeps Home QR transport controls behind an advanced section', async () => {
    const source = await readDesktopUiSource()

    assert.match(source, /<details[^>]+id='advancedHomeQrControls'/)
    assert.equal(
      source.indexOf("id='homeQrForm'") > source.indexOf("id='advancedHomeQrControls'"),
      true
    )
    assert.equal(
      source.indexOf("id='showLargeHomeQrButton'") > source.indexOf("id='advancedHomeQrControls'"),
      true
    )
    assert.equal(
      source.indexOf("id='copyHomeQrButton'") > source.indexOf("id='advancedHomeQrControls'"),
      true
    )
  })

  test('desktop keeps manual DM recipient entry inside an advanced section', async () => {
    const source = await readDesktopUiSource()

    assert.match(source, /<details[^>]+id='advancedDmRecipient'/)
    assert.equal(
      source.indexOf("id='dmRecipientInput'") > source.indexOf("id='advancedDmRecipient'"),
      true
    )
    assert.match(source, /Manual recipient profile id/)
    assert.doesNotMatch(source, />\s*Recipient profile id\s*</)
  })

  test('mobile hides manual home key entry until advanced mode is opened', async () => {
    const app = await readFile(new URL('../mobile/App.tsx', import.meta.url), 'utf8')
    const source = await readFile(
      new URL('../mobile/lobby-components.tsx', import.meta.url),
      'utf8'
    )

    assert.match(app, /const \[showAdvancedJoin, setShowAdvancedJoin\] = useState\(false\)/)
    assert.match(source, /showAdvancedJoin \? \(/)
    assert.equal(
      source.indexOf("title='Manual home key'") > source.indexOf('showAdvancedJoin ? ('),
      true
    )
  })

  test('mobile advanced panels use task headers for debug-only details', async () => {
    const lobby = await readFile(new URL('../mobile/lobby-components.tsx', import.meta.url), 'utf8')
    const peopleActions = await readFile(
      new URL('../mobile/people-components.tsx', import.meta.url),
      'utf8'
    )

    assert.match(lobby, /<TaskHeader[\s\S]*eyebrow='Advanced'[\s\S]*title='Manual home key'/)
    assert.match(lobby, /description='Debug manual Home entry; not for adding friends\.'/)
    assert.match(lobby, /placeholder='Diagnostic direct host:port'/)
    assert.equal(lobby.includes("placeholder='Optional direct host:port'"), false)
    assert.equal(lobby.includes("placeholder='Debug direct host:port'"), false)
    assert.match(peopleActions, /<TaskHeader[\s\S]*eyebrow='Advanced'[\s\S]*title='QR details'/)
    assert.match(
      peopleActions,
      /description='Paste or copy raw QR payloads for advanced diagnostics\.'/
    )
    assert.equal(lobby.includes('<Text style={styles.panelTitle}>Manual home key</Text>'), false)
    assert.equal(peopleActions.includes('<Text style={styles.panelTitle}>QR details</Text>'), false)
  })

  test('manual home key buttons use explicit Enter Home product copy', async () => {
    const desktop = await readDesktopUiSource()
    const mobile = await readFile(
      new URL('../mobile/lobby-components.tsx', import.meta.url),
      'utf8'
    )

    assert.match(desktop, /Enter Home/)
    assert.match(mobile, /Enter Home/)
    assert.equal(desktop.includes('Join home'), false)
    assert.equal(mobile.includes('Join home'), false)
    assert.equal(desktop.includes('Join Home'), false)
    assert.equal(mobile.includes('Join Home'), false)
  })

  test('mobile keeps manual DM recipient entry inside an advanced section', async () => {
    const source = await readFile(
      new URL('../mobile/direct-components.tsx', import.meta.url),
      'utf8'
    )

    assert.match(source, /<MobileAdvancedToggle/)
    assert.match(source, /showAdvancedDmRecipient \? \(/)
    assert.equal(
      source.indexOf("testID='dm-recipient-input'") > source.indexOf('showAdvancedDmRecipient ? ('),
      true
    )
    assert.equal(source.includes('Paste a profile id and send a text DM.'), false)
  })
})
