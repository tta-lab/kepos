import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('desktop React shell separates navigation, workspace, and context panels', async () => {
  const source = await readFile(new URL('../desktop/app.jsx', import.meta.url), 'utf8')
  const styles = await readFile(new URL('../desktop/styles.css', import.meta.url), 'utf8')

  assert.match(source, /className='appRail'/)
  assert.match(source, /className='workspace'/)
  assert.match(source, /className='contextPanel'/)
  assert.equal(
    source.indexOf("className='appRail'") < source.indexOf("className='workspace'"),
    true
  )
  assert.equal(
    source.indexOf("className='workspace'") < source.indexOf("className='contextPanel'"),
    true
  )
  assert.equal(source.indexOf("id='lobbyForm'") > source.indexOf("className='contextPanel'"), true)
  assert.match(styles, /grid-template-columns:\s*88px minmax\(0, 1fr\) 340px/)
})

test('desktop context panel uses product actions for home and people flows', async () => {
  const source = await readFile(new URL('../desktop/app.jsx', import.meta.url), 'utf8')
  const styles = await readFile(new URL('../desktop/styles.css', import.meta.url), 'utf8')

  assert.match(source, /className='contextGroup homeActions'/)
  assert.match(source, /Invite a friend/)
  assert.match(source, /Join a friend&apos;s home/)
  assert.match(source, /className='contextGroup peopleActions'/)
  assert.match(source, /Add trusted friend/)
  assert.equal(source.includes('Trust Profile'), false)
  assert.equal(source.includes('Join Home URI'), false)
  assert.match(styles, /\.contextGroup/)
  assert.match(styles, /\.contextHint/)
})

test('desktop keeps inline QR codes as advanced share detail', async () => {
  const source = await readFile(new URL('../desktop/app.jsx', import.meta.url), 'utf8')

  assert.equal(source.indexOf("id='homeQrCode'") > source.indexOf("id='advancedHomeShare'"), true)
  assert.equal(
    source.indexOf("id='profileQrCode'") > source.indexOf("id='advancedProfileShare'"),
    true
  )
  assert.equal(
    source.indexOf("id='showLargeHomeQrButton'") < source.indexOf("id='homeQrCode'"),
    true
  )
  assert.equal(
    source.indexOf("id='showLargeProfileQrButton'") < source.indexOf("id='profileQrCode'"),
    true
  )
})

test('desktop normal UI copy avoids raw home address language', async () => {
  const source = await readFile(new URL('../desktop/app.jsx', import.meta.url), 'utf8')

  assert.match(source, /Create my home/)
  assert.match(source, /<p className='label'>Home<\/p>/)
  assert.equal(source.includes('Create Home'), false)
  assert.equal(source.includes("<p className='label'>Home address</p>"), false)
})

test('desktop status panel keeps raw ids in advanced details', async () => {
  const source = await readFile(new URL('../desktop/app.jsx', import.meta.url), 'utf8')
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')

  assert.match(source, /id='homeStatusLabel'/)
  assert.match(source, /<details[^>]+id='advancedStatus'/)
  assert.equal(source.indexOf("id='roomKeyLabel'") > source.indexOf("id='advancedStatus'"), true)
  assert.equal(source.indexOf("id='profileIdLabel'") > source.indexOf("id='advancedStatus'"), true)
  assert.match(controller, /els\.homeStatusLabel\.textContent = getDesktopHomeStatus\(state\)/)
  assert.match(
    controller,
    /treeholeStatusLabel\.textContent = `Treehole \$\{state\.treeholeStatus\}`/
  )
})

test('desktop primary panes expose short empty states before content arrives', async () => {
  const source = await readFile(new URL('../desktop/app.jsx', import.meta.url), 'utf8')
  const styles = await readFile(new URL('../desktop/styles.css', import.meta.url), 'utf8')

  assert.match(source, /id='messageList'[^>]+data-empty='No messages yet'/)
  assert.match(source, /id='dmList'[^>]+data-empty='No DMs yet'/)
  assert.match(source, /id='treeholeList'[^>]+data-empty='No posts yet'/)
  assert.match(styles, /\.list:empty::before/)
  assert.match(styles, /content:\s*attr\(data-empty\)/)
})

test('desktop treehole composer has an explicit owner-only disabled state', async () => {
  const source = await readFile(new URL('../desktop/app.jsx', import.meta.url), 'utf8')
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const styles = await readFile(new URL('../desktop/styles.css', import.meta.url), 'utf8')

  assert.match(source, /id='treeholePostPolicy'/)
  assert.match(source, /Only the owner can post here\./)
  assert.match(controller, /els\.treeholeForm\.classList\.toggle\('disabledComposer'/)
  assert.match(controller, /els\.treeholeInput\.disabled = !state\.treeholeCanPost/)
  assert.match(controller, /els\.treeholePostPolicy\.hidden = state\.treeholeCanPost/)
  assert.match(styles, /\.disabledComposer/)
})

test('desktop shell exposes Neo Cozy light and Indie Console dark themes', async () => {
  const source = await readFile(new URL('../desktop/app.jsx', import.meta.url), 'utf8')
  const styles = await readFile(new URL('../desktop/styles.css', import.meta.url), 'utf8')

  assert.match(source, /id='lightThemeButton'/)
  assert.match(source, /id='darkThemeButton'/)
  assert.match(source, /data-theme/)
  assert.match(source, /kepos\.desktop\.theme/)
  assert.match(styles, /:root/)
  assert.match(styles, /--surface:\s*#f3efe5/)
  assert.match(styles, /\[data-theme='dark'\]/)
  assert.match(styles, /--surface:\s*#171d33/)
  assert.match(styles, /--accent:\s*#ffcf3d/)
})
