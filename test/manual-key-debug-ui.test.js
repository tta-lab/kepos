import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { describe, test } from 'node:test'

async function readDesktopUiSource() {
  const app = await readFile(new URL('../desktop/app.jsx', import.meta.url), 'utf8')
  const appState = await readFile(new URL('../desktop/app-state.jsx', import.meta.url), 'utf8')
  const panes = await readFile(new URL('../desktop/pane-components.jsx', import.meta.url), 'utf8')
  const shell = await readFile(new URL('../desktop/shell-components.jsx', import.meta.url), 'utf8')
  const context = await readFile(
    new URL('../desktop/context-components.jsx', import.meta.url),
    'utf8'
  )
  const people = await readFile(
    new URL('../desktop/people-components.jsx', import.meta.url),
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

  test('desktop keeps manual DM recipient entry inside an advanced section', async () => {
    const source = await readDesktopUiSource()

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
      source.indexOf("title='Manual home key'") > source.indexOf('showAdvancedJoin ? ('),
      true
    )
  })

  test('mobile advanced panels use task headers for debug-only details', async () => {
    const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')
    const lobby = source.slice(
      source.indexOf('function Lobby('),
      source.indexOf('function ChatRoom(')
    )
    const peopleActions = source.slice(
      source.indexOf('function PeopleActions('),
      source.indexOf('function DirectPane(')
    )

    assert.match(lobby, /<TaskHeader[\s\S]*eyebrow='Advanced'[\s\S]*title='Manual home key'/)
    assert.match(lobby, /description='Use only when QR joining is unavailable\.'/)
    assert.match(peopleActions, /<TaskHeader[\s\S]*eyebrow='Advanced'[\s\S]*title='QR details'/)
    assert.match(peopleActions, /description='Paste or copy raw QR payloads for debug flows\.'/)
    assert.equal(lobby.includes('<Text style={styles.panelTitle}>Manual home key</Text>'), false)
    assert.equal(peopleActions.includes('<Text style={styles.panelTitle}>QR details</Text>'), false)
  })

  test('manual home key buttons still use product join copy', async () => {
    const desktop = await readDesktopUiSource()
    const mobile = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')

    assert.match(desktop, /Join home/)
    assert.match(mobile, /Join home/)
    assert.equal(desktop.includes('Join Home'), false)
    assert.equal(mobile.includes('Join Home'), false)
  })

  test('mobile keeps manual DM recipient entry inside an advanced section', async () => {
    const source = await readFile(new URL('../mobile/App.jsx', import.meta.url), 'utf8')

    assert.match(source, /<Text style={styles\.advancedSummary}>Advanced<\/Text>/)
    assert.match(source, /showAdvancedDmRecipient \? \(/)
    assert.equal(
      source.indexOf("testID='dm-recipient-input'") > source.indexOf('showAdvancedDmRecipient ? ('),
      true
    )
    assert.equal(source.includes('Paste a profile id and send a text DM.'), false)
  })
})
