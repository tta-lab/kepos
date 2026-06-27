import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('desktop renderer loads the bundled CommonJS entrypoint', async () => {
  const html = await readFile(new URL('../desktop/index.html', import.meta.url), 'utf8')

  assert.match(html, /require\('\.\/app\.bundle\.cjs'\)/)
  assert.doesNotMatch(html, /src="\.\/app\.js" type="module"/)
})

test('desktop scripts build the renderer bundle before launch', async () => {
  const packageJson = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8')
  )
  const desktopPackageJson = JSON.parse(
    await readFile(new URL('../desktop/package.json', import.meta.url), 'utf8')
  )

  assert.equal(
    packageJson.scripts['desktop:bundle'],
    'esbuild desktop/app.jsx --bundle --platform=node --format=cjs --packages=external --outfile=desktop/app.bundle.cjs'
  )
  assert.equal(packageJson.scripts.desktop, 'npm run start --prefix desktop')
  assert.equal(desktopPackageJson.scripts.prestart, 'npm run desktop:bundle --prefix ..')
  assert.match(packageJson.scripts['smoke:desktop'], /^npm run desktop:bundle && /)
})

test('desktop React entry renders before starting the controller', async () => {
  const source = await readFile(new URL('../desktop/app.jsx', import.meta.url), 'utf8')

  assert.match(source, /createRoot\(document\.querySelector\('#root'\)\)/)
  assert.match(source, /flushSync/)
  assert.match(source, /import\('\.\/controller\.js'\)/)
})

test('desktop React owns the home chat list surface', async () => {
  const source = await readFile(new URL('../desktop/app.jsx', import.meta.url), 'utf8')
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')

  assert.match(source, /function HomeChatList\(\{ messages \}\)/)
  assert.match(source, /globalThis\.keposDesktopUi/)
  assert.match(source, /setHomeMessages\(messages = \[\]\)/)
  assert.match(source, /<HomeChatList messages=\{homeMessages\} \/>/)
  assert.match(controller, /globalThis\.keposDesktopUi\?\.setHomeMessages\(messages\)/)
  assert.doesNotMatch(controller, /els\.messageList\.replaceChildren/)
})

test('desktop React owns the home chat composer draft', async () => {
  const source = await readFile(new URL('../desktop/app.jsx', import.meta.url), 'utf8')
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')

  assert.match(source, /function HomeChatComposer\(\{ controls, onSend \}\)/)
  assert.match(source, /const \[draft, setDraft\] = useState\(''\)/)
  assert.match(
    source,
    /const canSend = controls\.canUseHomeChatComposer && Boolean\(draft\.trim\(\)\)/
  )
  assert.match(source, /onSend\(\{ text: draft\.trim\(\) \}\)/)
  assert.match(source, /setDraft\(''\)/)
  assert.match(source, /value=\{draft\}/)
  assert.match(source, /onChange=\{\(event\) => setDraft\(event\.target\.value\)\}/)
  assert.match(source, /disabled=\{!canSend\}/)
  assert.match(source, /setHomeComposerActions\(actions = \{\}\)/)
  assert.match(controller, /globalThis\.keposDesktopUi\?\.setHomeComposerActions\(\{/)
  assert.doesNotMatch(controller, /chatForm: document\.querySelector/)
  assert.doesNotMatch(controller, /chatInput: document\.querySelector/)
  assert.doesNotMatch(controller, /els\.chatInput\.addEventListener/)
  assert.doesNotMatch(controller, /els\.chatForm\.addEventListener/)
  assert.doesNotMatch(controller, /els\.chatInput\.value/)
})

test('desktop React owns the direct message list surface', async () => {
  const source = await readFile(new URL('../desktop/app.jsx', import.meta.url), 'utf8')
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')

  assert.match(source, /function DirectMessageList\(\{ messages, onAccept, onIgnore \}\)/)
  assert.match(source, /setDirectMessages\(messages = \[\]\)/)
  assert.match(source, /setDirectMessageActions\(actions = \{\}\)/)
  assert.match(source, /<DirectMessageList[\s\S]*messages=\{directMessages\}/)
  assert.match(source, /onClick=\{\(\) => onIgnore\(message\.actions\.ignoreMessage\)\}/)
  assert.match(source, /onClick=\{\(\) => onAccept\(message\.actions\.acceptMessage\)\}/)
  assert.match(controller, /globalThis\.keposDesktopUi\?\.setDirectMessages\(messages\)/)
  assert.match(controller, /globalThis\.keposDesktopUi\?\.setDirectMessageActions\(\{/)
  assert.doesNotMatch(controller, /els\.dmList\.replaceChildren/)
})

test('desktop React owns the direct contact picker surface', async () => {
  const source = await readFile(new URL('../desktop/app.jsx', import.meta.url), 'utf8')
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')

  assert.match(source, /function DirectContactPicker\(\{ actions, contacts, empty \}\)/)
  assert.match(source, /setDirectContactPicker\([\s\S]*picker = \{[\s\S]*contacts: \[\]/)
  assert.match(source, /setDirectContactPickerActions\(actions = \{\}\)/)
  assert.match(source, /<DirectContactPicker[\s\S]*contacts=\{directContactPicker\.contacts\}/)
  assert.match(source, /onClick=\{\(\) => actions\.selectContact\(contact\.profileId\)\}/)
  assert.match(source, /onClick=\{actions\.openPeople\}/)
  assert.match(controller, /createDesktopDirectContactPickerViewModel/)
  assert.match(controller, /globalThis\.keposDesktopUi\?\.setDirectContactPicker\(picker\)/)
  assert.match(controller, /globalThis\.keposDesktopUi\?\.setDirectContactPickerActions\(\{/)
  assert.doesNotMatch(controller, /els\.dmContactList\.replaceChildren/)
})

test('desktop React owns the status labels surface', async () => {
  const source = await readFile(new URL('../desktop/app.jsx', import.meta.url), 'utf8')
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')

  assert.match(source, /setStatus\(status = DEFAULT_STATUS\)/)
  assert.match(source, /\{status\.noticeLabel\}/)
  assert.match(source, /\{status\.treeholeStatusLabel\}/)
  assert.match(source, /\{status\.homeStatusLabel\}/)
  assert.match(source, /\{status\.peerLabel\}/)
  assert.match(source, /\{status\.roomKeyLabel\}/)
  assert.match(source, /\{status\.profileIdLabel\}/)
  assert.match(source, /\{status\.errorDetailLabel\}/)
  assert.match(controller, /createDesktopStatusViewModel/)
  assert.match(controller, /globalThis\.keposDesktopUi\?\.setStatus\(status\)/)
  assert.doesNotMatch(controller, /els\.homeStatusLabel\.textContent/)
  assert.doesNotMatch(controller, /els\.noticeLabel\.textContent/)
  assert.doesNotMatch(controller, /els\.treeholeStatusLabel\.textContent/)
  assert.doesNotMatch(controller, /els\.errorDetailLabel\.textContent/)
})

test('desktop React owns tab and pane active state', async () => {
  const source = await readFile(new URL('../desktop/app.jsx', import.meta.url), 'utf8')
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')

  assert.match(source, /setActiveTab\(tab = 'chat'\)/)
  assert.match(source, /const \[activeTab, setActiveTab\] = useState\('chat'\)/)
  assert.match(source, /isActive=\{activeTab === 'chat'\}/)
  assert.match(source, /className=\{isActive \? 'railButton active' : 'railButton'\}/)
  assert.match(source, /className=\{activeTab === 'chat' \? 'pane' : 'pane hidden'\}/)
  assert.match(controller, /globalThis\.keposDesktopUi\?\.setActiveTab\(state\.activeTab\)/)
  assert.doesNotMatch(controller, /els\.chatPane\.classList\.toggle/)
  assert.doesNotMatch(controller, /els\.dmPane\.classList\.toggle/)
  assert.doesNotMatch(controller, /els\.treeholePane\.classList\.toggle/)
  assert.doesNotMatch(controller, /els\.peoplePane\.classList\.toggle/)
  assert.doesNotMatch(controller, /els\.chatTab\.classList\.toggle/)
  assert.doesNotMatch(controller, /els\.dmTab\.classList\.toggle/)
  assert.doesNotMatch(controller, /els\.treeholeTab\.classList\.toggle/)
  assert.doesNotMatch(controller, /els\.peopleTab\.classList\.toggle/)
  assert.doesNotMatch(controller, /function updateTabCurrentState\(\)/)
})

test('desktop React owns action and composer disabled state', async () => {
  const source = await readFile(new URL('../desktop/app.jsx', import.meta.url), 'utf8')
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')

  assert.match(source, /setControls\(controls = DEFAULT_CONTROLS\)/)
  assert.match(source, /const \[controls, setControls\] = useState\(DEFAULT_CONTROLS\)/)
  assert.match(source, /disabled=\{!controls\.canCreateHome\}/)
  assert.match(source, /disabled=\{!controls\.canLeaveHome\}/)
  assert.match(source, /disabled=\{!controls\.canJoinManualHome\}/)
  assert.match(source, /disabled=\{!controls\.canJoinHomeQr\}/)
  assert.match(source, /disabled=\{!controls\.canTrustProfile\}/)
  assert.match(source, /canUseHomeChatComposer: false/)
  assert.match(
    source,
    /const canSend = controls\.canUseHomeChatComposer && Boolean\(draft\.trim\(\)\)/
  )
  assert.match(source, /disabled=\{!canSend\}/)
  assert.match(source, /disabled=\{!controls\.canSendDirectMessage\}/)
  assert.match(source, /const canPost = controls\.canPostTreehole && Boolean\(draft\.trim\(\)\)/)
  assert.match(source, /disabled=\{!canPost\}/)
  assert.match(
    source,
    /className=\{[\s\S]*controls\.canPostTreehole \? 'composer tall' : 'composer tall disabledComposer'[\s\S]*\}/
  )
  assert.match(source, /hidden=\{controls\.canPostTreehole\}/)
  assert.match(source, /disabled=\{!controls\.canPostTreehole\}/)
  assert.match(controller, /globalThis\.keposDesktopUi\?\.setControls\(controls\)/)
  assert.doesNotMatch(controller, /\.disabled =/)
  assert.doesNotMatch(controller, /classList\.toggle\('disabledComposer'/)
  assert.doesNotMatch(controller, /treeholePostPolicy\.hidden =/)
})

test('desktop React owns the large QR dialog surface', async () => {
  const source = await readFile(new URL('../desktop/app.jsx', import.meta.url), 'utf8')
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')

  assert.match(source, /function LargeQrDialog\(\{ qr \}\)/)
  assert.match(source, /setLargeQr\(qr = EMPTY_LARGE_QR\)/)
  assert.match(source, /className=\{qr\.isOpen \? 'largeQrDialog' : 'largeQrDialog hidden'\}/)
  assert.match(source, /dangerouslySetInnerHTML=\{\{ __html: qr\.svg \}\}/)
  assert.match(source, /<LargeQrDialog qr=\{largeQr\} \/>/)
  assert.match(controller, /globalThis\.keposDesktopUi\?\.setLargeQr\(\{/)
  assert.doesNotMatch(controller, /els\.largeQrTitle\.textContent/)
  assert.doesNotMatch(controller, /els\.largeQrCode\.innerHTML/)
  assert.doesNotMatch(controller, /els\.largeQrCode\.replaceChildren/)
  assert.doesNotMatch(controller, /els\.largeQrDialog\.classList\.add\('hidden'\)/)
  assert.doesNotMatch(controller, /els\.largeQrDialog\.classList\.remove\('hidden'\)/)
})

test('desktop React owns inline QR share outputs', async () => {
  const source = await readFile(new URL('../desktop/app.jsx', import.meta.url), 'utf8')
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')

  assert.match(source, /function QrShareOutput\(/)
  assert.match(source, /setShareQrOutputs\(outputs = EMPTY_SHARE_QR_OUTPUTS\)/)
  assert.match(source, /dangerouslySetInnerHTML=\{\{ __html: svg \}\}/)
  assert.match(source, /value=\{uri\}/)
  assert.match(source, /svg=\{shareQrOutputs\.homeSvg\}/)
  assert.match(source, /uri=\{shareQrOutputs\.homeUri\}/)
  assert.match(source, /svg=\{shareQrOutputs\.profileSvg\}/)
  assert.match(source, /uri=\{shareQrOutputs\.profileUri\}/)
  assert.match(controller, /globalThis\.keposDesktopUi\?\.setShareQrOutputs\(shareQrOutputs\)/)
  assert.doesNotMatch(controller, /els\.profileQrOutput\.value =/)
  assert.doesNotMatch(controller, /els\.homeQrOutput\.value =/)
  assert.doesNotMatch(controller, /els\.profileQrCode\.innerHTML/)
  assert.doesNotMatch(controller, /els\.homeQrCode\.innerHTML/)
})

test('desktop React owns the people list surfaces', async () => {
  const source = await readFile(new URL('../desktop/app.jsx', import.meta.url), 'utf8')
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')

  assert.match(source, /function PeopleLists\(\{ actions, messageRequests, trustedContacts \}\)/)
  assert.match(source, /setPeople\(people = \{ messageRequests: \[\], trustedContacts: \[\] \}\)/)
  assert.match(source, /setPeopleActions\(actions = \{\}\)/)
  assert.match(source, /<PeopleLists[\s\S]*messageRequests=\{people\.messageRequests\}/)
  assert.match(source, /onClick=\{\(\) => actions\.revokeContact\(contact\.profileId\)\}/)
  assert.match(source, /onClick=\{\(\) => actions\.ignoreMessageRequest\(request\.profileId\)\}/)
  assert.match(
    source,
    /onClick=\{\(\) => actions\.acceptMessageRequest\(request\.acceptMessage\)\}/
  )
  assert.match(controller, /globalThis\.keposDesktopUi\?\.setPeople\(people\)/)
  assert.match(controller, /globalThis\.keposDesktopUi\?\.setPeopleActions\(\{/)
  assert.doesNotMatch(controller, /els\.contactList\.replaceChildren/)
  assert.doesNotMatch(controller, /els\.requestList\.replaceChildren/)
})

test('desktop React owns the treehole post list surface', async () => {
  const source = await readFile(new URL('../desktop/app.jsx', import.meta.url), 'utf8')
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')

  assert.match(source, /function TreeholeList\(\{ actions, posts \}\)/)
  assert.match(source, /setTreeholePosts\(posts = \[\]\)/)
  assert.match(source, /setTreeholeActions\(actions = \{\}\)/)
  assert.match(source, /<TreeholeList[\s\S]*posts=\{treeholePosts\}/)
  assert.match(source, /onClick=\{\(\) => actions\.likePost\(post\.actions\.likePostId\)\}/)
  assert.match(
    source,
    /actions\.commentPost\(\{ postId: post\.actions\.commentPostId, text: draft\.trim\(\) \}\)/
  )
  assert.match(controller, /globalThis\.keposDesktopUi\?\.setTreeholePosts\(posts\)/)
  assert.match(controller, /globalThis\.keposDesktopUi\?\.setTreeholeActions\(\{/)
  assert.doesNotMatch(controller, /els\.treeholeList\.replaceChildren/)
})

test('desktop React owns the treehole main post composer draft', async () => {
  const source = await readFile(new URL('../desktop/app.jsx', import.meta.url), 'utf8')
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')

  assert.match(source, /function TreeholeComposer\(\{ controls, onPost \}\)/)
  assert.match(source, /const \[draft, setDraft\] = useState\(''\)/)
  assert.match(source, /const canPost = controls\.canPostTreehole && Boolean\(draft\.trim\(\)\)/)
  assert.match(source, /onPost\(\{ text: draft\.trim\(\) \}\)/)
  assert.match(source, /setDraft\(''\)/)
  assert.match(source, /value=\{draft\}/)
  assert.match(source, /onChange=\{\(event\) => setDraft\(event\.target\.value\)\}/)
  assert.match(source, /disabled=\{!controls\.canPostTreehole\}/)
  assert.match(source, /disabled=\{!canPost\}/)
  assert.match(source, /setTreeholeComposerActions\(actions = \{\}\)/)
  assert.match(controller, /globalThis\.keposDesktopUi\?\.setTreeholeComposerActions\(\{/)
  assert.doesNotMatch(controller, /treeholeForm: document\.querySelector/)
  assert.doesNotMatch(controller, /treeholeInput: document\.querySelector/)
  assert.doesNotMatch(controller, /els\.treeholeInput\.addEventListener/)
  assert.doesNotMatch(controller, /els\.treeholeForm\.addEventListener/)
  assert.doesNotMatch(controller, /els\.treeholeInput\.value/)
})
