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

  assert.match(source, /<h1>Kepos Home<\/h1>/)
  assert.match(source, /<details className='contextGroup homeActions'[^>]+open>/)
  assert.match(source, /Start your home, invite a friend, or join theirs\./)
  assert.match(source, /<label>\s*Name\s*<input id='nickInput'/)
  assert.match(source, /Invite a friend/)
  assert.match(source, /Join a friend&apos;s home/)
  assert.match(source, /placeholder='Paste Home QR'/)
  assert.match(source, /placeholder='Paste Profile QR'/)
  assert.match(source, /<label>\s*Friend name\s*<input id='trustAliasInput'/)
  assert.match(source, /placeholder='Friend name'/)
  assert.match(source, /<details className='contextGroup peopleActions'/)
  assert.equal(/<details className='contextGroup peopleActions'[^>]+open>/.test(source), false)
  assert.match(source, /Trust a friend before home access or direct messages\./)
  assert.match(source, /Add trusted friend/)
  assert.equal(source.includes('Start your room'), false)
  assert.equal(source.includes('Trust a profile before private home access or DM.'), false)
  assert.equal(source.includes('Trust Profile'), false)
  assert.equal(source.includes('Join Home URI'), false)
  assert.equal(source.includes('Kepos Peer'), false)
  assert.equal(source.includes('Nick'), false)
  assert.equal(source.includes('>Alias'), false)
  assert.equal(source.includes("placeholder='Contact name'"), false)
  assert.equal(source.includes('Paste Home QR text'), false)
  assert.equal(source.includes('Paste Profile QR text'), false)
  assert.match(styles, /\.contextGroup/)
  assert.match(styles, /\.contextGroup > summary/)
  assert.match(styles, /\.contextGroup\[open\]/)
  assert.match(styles, /\.contextHint/)
})

test('desktop people UI uses trusted friends copy', async () => {
  const source = await readFile(new URL('../desktop/app.jsx', import.meta.url), 'utf8')
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')

  assert.match(source, /id='peopleTab'[^>]+title='People'/)
  assert.match(source, /<span className='railLabel'>People<\/span>/)
  assert.match(source, /id='peoplePane'/)
  assert.match(source, /<PaneLabel eyebrow='trusted' title='People' \/>/)
  assert.match(source, /Trusted friends/)
  assert.match(source, /No trusted friends yet/)
  assert.match(controller, /createDesktopPeopleViewModel/)
  assert.match(source, /\{contact\.statusLabel\}/)
  assert.match(source, /\{contact\.sourceLabel\}/)
  assert.match(source, /\{contact\.trustedAtLabel\}/)
  assert.match(controller, /globalThis\.keposDesktopUi\?\.setPeople\(people\)/)
  assert.match(controller, /revokeContact: \(profileId\) => dispatchCommand\('revokeContact'/)
  assert.equal(source.indexOf("id='contactList'") > source.indexOf("id='peoplePane'"), true)
  assert.match(
    controller,
    /els\.peopleTab\.addEventListener\('click', \(\) => setTab\('people'\)\)/
  )
  assert.match(
    controller,
    /els\.peoplePane\.classList\.toggle\('hidden', state\.activeTab !== 'people'\)/
  )
  assert.match(
    controller,
    /els\.peopleTab\.classList\.toggle\('active', state\.activeTab === 'people'\)/
  )
  assert.equal(source.includes("text='Contacts'"), false)
  assert.equal(controller.includes('No trusted contacts'), false)
  assert.equal(controller.includes('notice: `Revoked ${shorten(profileId)}.`'), false)
  assert.match(controller, /notice: 'Trust revoked\.'/)
})

test('desktop people pane surfaces pending message requests', async () => {
  const source = await readFile(new URL('../desktop/app.jsx', import.meta.url), 'utf8')
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')

  assert.match(source, /id='requestList'/)
  assert.match(source, /Message requests/)
  assert.match(controller, /renderPeople\(\)/)
  assert.match(source, /messageRequests=\{people\.messageRequests\}/)
  assert.match(source, /No message requests/)
  assert.match(source, /\{request\.title\}/)
  assert.match(source, /\{request\.preview\}/)
  assert.match(source, /actions\.acceptMessageRequest\(request\.acceptMessage\)/)
  assert.match(source, /actions\.ignoreMessageRequest\(request\.profileId\)/)
  assert.match(
    controller,
    /acceptMessageRequest: \(message\) => dispatchCommand\('acceptMessageRequest'/
  )
  assert.match(
    controller,
    /ignoreMessageRequest: \(profileId\) => dispatchCommand\('ignoreMessageRequest'/
  )
  assert.match(controller, /createDesktopMessageRequestAcceptance/)
  assert.match(controller, /createDesktopMessageRequestIgnore/)
})

test('desktop keeps inline QR codes as advanced share detail', async () => {
  const source = await readFile(new URL('../desktop/app.jsx', import.meta.url), 'utf8')

  assert.match(source, /id='copyHomeQrButton'[\s\S]*Copy Home QR/)
  assert.match(source, /id='copyProfileQrButton'[\s\S]*Copy Profile QR/)
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
  assert.match(source, /Home QR details/)
  assert.match(source, /Profile QR details/)
  assert.equal(source.includes('My home URI'), false)
  assert.equal(source.includes('My profile URI'), false)
})

test('desktop QR sharing exposes copy actions without surfacing raw URI copy', async () => {
  const source = await readFile(new URL('../desktop/app.jsx', import.meta.url), 'utf8')
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')

  assert.match(source, /Copy Home QR/)
  assert.match(source, /Copy Profile QR/)
  assert.match(controller, /copyHomeQrButton: document\.querySelector\('#copyHomeQrButton'\)/)
  assert.match(controller, /copyProfileQrButton: document\.querySelector\('#copyProfileQrButton'\)/)
  assert.match(controller, /els\.copyHomeQrButton\.addEventListener\('click', \(\) =>/)
  assert.match(controller, /els\.copyProfileQrButton\.addEventListener\('click', \(\) =>/)
  assert.match(controller, /navigator\.clipboard\.writeText\(value\)/)
  assert.match(controller, /notice: 'Home QR copied\.'/)
  assert.match(controller, /notice: 'Profile QR copied\.'/)
  assert.equal(source.includes('Copy URI'), false)
})

test('desktop normal UI copy avoids raw home address language', async () => {
  const source = await readFile(new URL('../desktop/app.jsx', import.meta.url), 'utf8')
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const state = await readFile(new URL('../src/desktop-state.js', import.meta.url), 'utf8')
  const desktopCopy = `${source}\n${controller}\n${state}`

  assert.match(source, /Create my home/)
  assert.match(desktopCopy, /Create or join a home\./)
  assert.match(desktopCopy, /Joining home\.\.\./)
  assert.match(source, /<p className='label'>Home<\/p>/)
  assert.equal(source.includes('Create Home'), false)
  assert.equal(source.includes("<p className='label'>Home address</p>"), false)
  assert.equal(desktopCopy.includes('Create or join a room.'), false)
  assert.equal(desktopCopy.includes('Joining home room...'), false)
})

test('desktop status panel keeps raw ids in advanced details', async () => {
  const source = await readFile(new URL('../desktop/app.jsx', import.meta.url), 'utf8')
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')

  assert.match(source, /id='homeStatusLabel'/)
  assert.match(source, /Treehole offline/)
  assert.match(source, /<p className='label'>Online<\/p>/)
  assert.match(source, /<details[^>]+id='advancedStatus'/)
  assert.equal(source.indexOf("id='roomKeyLabel'") > source.indexOf("id='advancedStatus'"), true)
  assert.equal(source.indexOf("id='profileIdLabel'") > source.indexOf("id='advancedStatus'"), true)
  assert.equal(
    source.indexOf("id='errorDetailLabel'") > source.indexOf("id='advancedStatus'"),
    true
  )
  assert.match(controller, /els\.homeStatusLabel\.textContent = getDesktopHomeStatus\(state\)/)
  assert.match(
    controller,
    /els\.treeholeStatusLabel\.textContent = getDesktopTreeholeStatus\(state\)/
  )
  assert.match(controller, /els\.errorDetailLabel\.textContent = state\.lastError \|\| 'none'/)
  assert.equal(source.includes('treehole idle'), false)
  assert.equal(source.includes("<p className='label'>Peers</p>"), false)
  assert.equal(controller.includes('Treehole ${state.treeholeStatus}'), false)
})

test('desktop error handling keeps raw exception detail advanced', async () => {
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const state = await readFile(new URL('../src/desktop-state.js', import.meta.url), 'utf8')

  assert.match(state, /lastError: ''/)
  assert.match(controller, /errorDetailLabel: document\.querySelector\('#errorDetailLabel'\)/)
  assert.match(controller, /notice: getDesktopErrorNotice\(error\)/)
  assert.match(controller, /function getDesktopErrorNotice\(error\)/)
  assert.match(controller, /Could not read this Home QR\./)
  assert.match(controller, /Could not read this Profile QR\./)
  assert.match(controller, /Could not join this home\. Trust this friend on this device first\./)
  assert.match(controller, /return 'Something went wrong\.'/)
  assert.equal(controller.includes('notice: error.message'), false)
})

test('desktop primary panes expose short empty states before content arrives', async () => {
  const source = await readFile(new URL('../desktop/app.jsx', import.meta.url), 'utf8')
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const styles = await readFile(new URL('../desktop/styles.css', import.meta.url), 'utf8')

  assert.match(source, /id='messageList'[^>]+data-empty='No messages yet'/)
  assert.match(
    source,
    /id='messageList'[^>]+data-empty-detail='Send the first line from this desktop\.'/
  )
  assert.match(source, /id='dmList'[^>]+data-empty='No direct messages yet'/)
  assert.match(
    source,
    /id='dmList'[^>]+data-empty-detail='Choose a trusted friend and send the first message\.'/
  )
  assert.match(source, /id='treeholeList'[^>]+data-empty='No posts yet'/)
  assert.match(
    source,
    /id='treeholeList'[^>]+data-empty-detail='Posts from this home will appear here\.'/
  )
  assert.equal(source.includes('No DMs yet'), false)
  assert.match(styles, /\.list:empty::before/)
  assert.match(styles, /content:\s*attr\(data-empty\)/)
  assert.match(styles, /\.list:empty::after/)
  assert.match(styles, /content:\s*attr\(data-empty-detail\)/)
  assert.match(controller, /createDesktopHomeChatViewModel/)
  assert.match(controller, /createDesktopTreeholeViewModel/)
})

test('desktop panes label live and durable surfaces', async () => {
  const source = await readFile(new URL('../desktop/app.jsx', import.meta.url), 'utf8')
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const styles = await readFile(new URL('../desktop/styles.css', import.meta.url), 'utf8')

  for (const text of ['Live home chat', 'Direct messages', 'Durable treehole']) {
    assert.match(source, new RegExp(text), `${text} is missing`)
  }

  assert.match(source, /id='dmTab'[^>]+title='Direct messages'/)
  assert.match(source, /<span className='railLabel'>Direct<\/span>/)
  assert.equal(source.includes("<span className='railLabel'>DM</span>"), false)
  assert.match(source, /Send message/)
  assert.equal(source.includes('Send DM'), false)
  assert.match(controller, /button\.classList\.toggle\('activeContactButton'/)
  assert.match(controller, /els\.dmRecipientInput\.addEventListener\('input', \(\) => \{/)
  assert.match(controller, /renderDirectContacts\(\)/)
  assert.equal(controller.includes('button.title = contact.profileId'), false)
  assert.match(styles, /\.paneLabel/)
  assert.match(styles, /\.paneEyebrow/)
  assert.match(styles, /\.paneTitle/)
  assert.match(styles, /\.activeContactButton/)
})

test('desktop rail keeps current view accessible', async () => {
  const source = await readFile(new URL('../desktop/app.jsx', import.meta.url), 'utf8')
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')

  assert.match(source, /id='chatTab'[\s\S]+aria-current='page'/)
  assert.match(controller, /function updateTabCurrentState\(\)/)
  assert.match(controller, /element\.setAttribute\('aria-current', 'page'\)/)
  assert.match(controller, /element\.removeAttribute\('aria-current'\)/)
  assert.equal(
    controller.indexOf("els.peopleTab.classList.toggle('active'") <
      controller.indexOf('updateTabCurrentState()'),
    true
  )
})

test('desktop MLP shell has responsive polish for narrow screens', async () => {
  const styles = await readFile(new URL('../desktop/styles.css', import.meta.url), 'utf8')

  assert.match(styles, /--focus:/)
  assert.match(styles, /--shadow-soft:/)
  assert.match(styles, /button:not\(:disabled\):hover/)
  assert.match(styles, /:focus-visible/)
  assert.match(styles, /@media \(max-width: 720px\)/)
  assert.match(styles, /grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/)
  assert.match(
    styles,
    /\.composer,\s*\.commentForm,\s*\.postActions\s*\{\s*grid-template-columns: 1fr;/
  )
  assert.match(styles, /\.managedContact\s*\{[\s\S]*border-radius: 8px/)
})

test('desktop direct messages links zero-contact state to People', async () => {
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const styles = await readFile(new URL('../desktop/styles.css', import.meta.url), 'utf8')

  assert.match(controller, /if \(!contacts\.length\) \{/)
  assert.match(controller, /empty\.className = 'contactEmpty'/)
  assert.match(controller, /title\.textContent = 'No trusted friends yet'/)
  assert.match(
    controller,
    /copy\.textContent = 'Add a trusted friend before starting a direct message\.'/
  )
  assert.match(controller, /button\.textContent = 'Add trusted friend'/)
  assert.match(controller, /button\.addEventListener\('click', \(\) => setTab\('people'\)\)/)
  assert.match(styles, /\.contactEmpty/)
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

test('desktop treehole comment composer disables empty comments', async () => {
  const source = await readFile(new URL('../desktop/app.jsx', import.meta.url), 'utf8')
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')

  assert.match(source, /function TreeholePostActions\(\{ actions, post \}\)/)
  assert.match(source, /const \[draft, setDraft\] = useState\(''\)/)
  assert.match(source, /const hasDraft = Boolean\(draft\.trim\(\)\)/)
  assert.match(
    source,
    /actions\.commentPost\(\{ postId: post\.actions\.commentPostId, text: draft\.trim\(\) \}\)/
  )
  assert.match(source, /setDraft\(''\)/)
  assert.match(source, /disabled=\{!hasDraft\}/)
  assert.match(
    controller,
    /commentPost: \(\{ postId, text \}\) => dispatchCommand\('commentTreehole'/
  )
})

test('desktop composers disable unavailable sends', async () => {
  const source = await readFile(new URL('../desktop/app.jsx', import.meta.url), 'utf8')
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')

  for (const id of ['chatSendButton', 'dmSendButton', 'treeholeSendButton']) {
    assert.match(source, new RegExp(`id='${id}'`), `${id} is missing`)
    assert.match(controller, new RegExp(`${id}: document\\.querySelector\\('#${id}'\\)`))
  }

  assert.match(controller, /function updateComposerButtons\(\)/)
  assert.match(
    controller,
    /els\.chatSendButton\.disabled = !inRoom \|\| !els\.chatInput\.value\.trim\(\)/
  )
  assert.match(
    controller,
    /els\.dmSendButton\.disabled =\s*!inRoom \|\| !els\.dmInput\.value\.trim\(\) \|\| !els\.dmRecipientInput\.value\.trim\(\)/
  )
  assert.match(
    controller,
    /els\.treeholeSendButton\.disabled =\s*!inRoom \|\| !state\.treeholeCanPost \|\| !els\.treeholeInput\.value\.trim\(\)/
  )
})

test('desktop context actions disable unavailable joins and trust', async () => {
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')

  assert.match(controller, /const ROOM_KEY_PATTERN = \/\^\[0-9a-f\]\{64\}\$\//)
  assert.match(controller, /function updateActionButtons\(\)/)
  assert.match(controller, /els\.roomKeyInput\.addEventListener\('input', updateActionButtons\)/)
  assert.match(controller, /els\.homeQrInput\.addEventListener\('input', updateActionButtons\)/)
  assert.match(controller, /els\.trustQrInput\.addEventListener\('input', updateActionButtons\)/)
  assert.match(
    controller,
    /els\.joinButton\.disabled =\s*isActionPending \|\| inRoom \|\| !ROOM_KEY_PATTERN\.test\(els\.roomKeyInput\.value\.trim\(\)\)/
  )
  assert.match(
    controller,
    /els\.joinHomeQrButton\.disabled = isActionPending \|\| inRoom \|\| !els\.homeQrInput\.value\.trim\(\)/
  )
  assert.match(
    controller,
    /els\.trustButton\.disabled = isActionPending \|\| !els\.trustQrInput\.value\.trim\(\)/
  )
})

test('desktop context actions expose a pending lock during blocking commands', async () => {
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')

  assert.match(controller, /const BLOCKING_COMMANDS = new Set\(\[/)
  for (const command of ['joinHome', 'joinHomeUri', 'leaveHome', 'trustProfileUri']) {
    assert.match(controller, new RegExp(`'${command}'`), `${command} is not pending-locked`)
  }
  assert.match(controller, /let pendingCommand = null/)
  assert.match(controller, /if \(isBlockingCommand\(command\) && pendingCommand\) return/)
  assert.match(controller, /pendingCommand = command/)
  assert.match(
    controller,
    /finally \{\s*if \(pendingCommand === command\) \{\s*pendingCommand = null/
  )
  assert.match(controller, /document\.body\.setAttribute\('aria-busy', String\(isActionPending\)\)/)
  assert.match(controller, /els\.leaveButton\.disabled = !inRoom \|\| isActionPending/)
  assert.match(controller, /els\.createButton\.disabled = inRoom \|\| isActionPending/)
  assert.match(
    controller,
    /els\.joinButton\.disabled =\s*isActionPending \|\| inRoom \|\| !ROOM_KEY_PATTERN\.test\(els\.roomKeyInput\.value\.trim\(\)\)/
  )
  assert.match(
    controller,
    /els\.joinHomeQrButton\.disabled = isActionPending \|\| inRoom \|\| !els\.homeQrInput\.value\.trim\(\)/
  )
  assert.match(
    controller,
    /els\.trustButton\.disabled = isActionPending \|\| !els\.trustQrInput\.value\.trim\(\)/
  )
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
