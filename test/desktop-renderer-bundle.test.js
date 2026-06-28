import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

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

test('desktop renderer loads separate UI and controller bundles', async () => {
  const html = await readFile(new URL('../desktop/index.html', import.meta.url), 'utf8')

  assert.match(html, /<script src="\.\/app\.bundle\.js"><\/script>/)
  assert.match(html, /<script src="\.\/controller\.browser\.bundle\.js"><\/script>/)
  assert.match(
    html,
    /<script src="\.\/app\.bundle\.js"><\/script>[\s\S]*<script src="\.\/controller\.browser\.bundle\.js"><\/script>/
  )
  assert.doesNotMatch(html, /src="\.\/app\.js" type="module"/)
  assert.doesNotMatch(html, /require\('\.\/app\.bundle\.cjs'\)/)
  assert.doesNotMatch(html, /require\('\.\/controller\.bundle\.cjs'\)/)
  assert.doesNotMatch(html, /keposDesktopController/)
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
    'esbuild desktop/app.jsx --bundle --platform=browser --format=iife --define:process.env.NODE_ENV=\\\"production\\\" --minify --outfile=desktop/app.bundle.js && esbuild desktop/controller.js --bundle --platform=browser --format=iife --define:process.env.NODE_ENV=\\\"production\\\" --outfile=desktop/controller.browser.bundle.js && esbuild desktop/controller.js --bundle --platform=node --format=cjs --packages=external --outfile=desktop/controller.bundle.cjs && esbuild desktop/local-backend.js --bundle --platform=node --format=cjs --packages=external --outfile=desktop/local-backend.bundle.cjs && esbuild desktop/local-profile.js --bundle --platform=node --format=cjs --packages=external --outfile=desktop/local-profile.bundle.cjs && esbuild src/desktop-backend-worker-bare-entry.js --bundle --platform=node --format=cjs --packages=external --outfile=desktop/backend-worker.bundle.cjs'
  )
  assert.equal(packageJson.scripts.desktop, 'npm run start --prefix desktop')
  assert.equal(desktopPackageJson.scripts.prestart, 'npm run desktop:bundle --prefix ..')
  assert.match(packageJson.scripts['smoke:desktop'], /^npm run desktop:bundle && /)
})

test('desktop scripts build a transpiled backend worker bundle for Bare', async () => {
  const packageJson = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8')
  )
  const mainSource = await readFile(
    new URL('../desktop/electron/main.cjs', import.meta.url),
    'utf8'
  )

  assert.match(packageJson.scripts['desktop:bundle'], /desktop-backend-worker-bare-entry\.js/)
  assert.match(
    packageJson.scripts['desktop:bundle'],
    /--outfile=desktop\/backend-worker\.bundle\.cjs/
  )
  assert.match(mainSource, /backend-worker\.bundle\.cjs/)
  assert.doesNotMatch(mainSource, /src'[\s\S]*'desktop-backend-worker-bare-entry\.js'/)
})

test('desktop React entry renders before starting the controller', async () => {
  const source = await readDesktopUiSource()
  const html = await readFile(new URL('../desktop/index.html', import.meta.url), 'utf8')

  assert.match(source, /createRoot\(document\.querySelector\('#root'\)\)/)
  assert.match(source, /flushSync/)
  assert.doesNotMatch(source, /import\('\.\/controller\.js'\)/)
  assert.match(
    html,
    /<script src="\.\/app\.bundle\.js"><\/script>[\s\S]*<script src="\.\/controller\.browser\.bundle\.js"><\/script>/
  )
})

test('desktop React owns the home chat list surface', async () => {
  const source = await readDesktopUiSource()
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const presenter = await readFile(
    new URL('../src/desktop-render-presenter.js', import.meta.url),
    'utf8'
  )

  assert.match(source, /function HomeChatList\(\{ messages \}\)/)
  assert.match(source, /globalThis\.keposDesktopUi/)
  assert.match(source, /setHomeMessages\(messages = \[\]\)/)
  assert.match(source, /<HomePane[\s\S]*messages=\{model\.homeMessages\}/)
  assert.match(source, /<HomeChatList messages=\{messages\} \/>/)
  assert.match(presenter, /ui\?\.setHomeMessages\(/)
  assert.doesNotMatch(controller, /els\.messageList\.replaceChildren/)
})

test('desktop React owns the home chat composer draft', async () => {
  const source = await readDesktopUiSource()
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
  assert.match(controller, /createDesktopUiActionBindings/)
  assert.doesNotMatch(controller, /chatForm: document\.querySelector/)
  assert.doesNotMatch(controller, /chatInput: document\.querySelector/)
  assert.doesNotMatch(controller, /els\.chatInput\.addEventListener/)
  assert.doesNotMatch(controller, /els\.chatForm\.addEventListener/)
  assert.doesNotMatch(controller, /els\.chatInput\.value/)
})

test('desktop React owns the direct message list surface', async () => {
  const source = await readDesktopUiSource()
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const presenter = await readFile(
    new URL('../src/desktop-render-presenter.js', import.meta.url),
    'utf8'
  )

  assert.match(source, /function DirectMessageList\(\{ messages, onAccept, onIgnore \}\)/)
  assert.match(source, /setDirectMessages\(messages = \[\]\)/)
  assert.match(source, /setDirectMessageActions\(actions = \{\}\)/)
  assert.match(source, /<DirectPane[\s\S]*messages=\{model\.directMessages\}/)
  assert.match(source, /<DirectMessageList[\s\S]*messages=\{messages\}/)
  assert.match(source, /onClick=\{\(\) => onIgnore\(message\.actions\.ignoreMessage\)\}/)
  assert.match(source, /onClick=\{\(\) => onAccept\(message\.actions\.acceptMessage\)\}/)
  assert.match(presenter, /ui\?\.setDirectMessages\(/)
  assert.match(controller, /createDesktopUiActionBindings/)
  assert.doesNotMatch(controller, /els\.dmList\.replaceChildren/)
})

test('desktop React owns the direct contact picker surface', async () => {
  const source = await readDesktopUiSource()
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const presenter = await readFile(
    new URL('../src/desktop-render-presenter.js', import.meta.url),
    'utf8'
  )

  assert.match(
    source,
    /function DirectContactPicker\(\{ actions, contacts, empty, selectedProfileId \}\)/
  )
  assert.match(source, /setDirectContactPicker\([\s\S]*picker = \{[\s\S]*contacts: \[\]/)
  assert.match(source, /setDirectContactPickerActions\(actions = \{\}\)/)
  assert.match(source, /<DirectPane[\s\S]*contactPicker=\{model\.directContactPicker\}/)
  assert.match(source, /<DirectComposer[\s\S]*contactPicker=\{contactPicker\}/)
  assert.match(source, /<DirectContactPicker[\s\S]*contacts=\{contactPicker\.contacts\}/)
  assert.match(source, /selectedProfileId=\{composer\.toProfileId\.trim\(\)\}/)
  assert.match(source, /onClick=\{\(\) => actions\.selectContact\(contact\.profileId\)\}/)
  assert.match(source, /onClick=\{actions\.openPeople\}/)
  assert.match(presenter, /createDesktopDirectContactPickerViewModel/)
  assert.match(presenter, /ui\?\.setDirectContactPicker\(/)
  assert.match(controller, /createDesktopUiActionBindings/)
  assert.doesNotMatch(controller, /els\.dmContactList\.replaceChildren/)
})

test('desktop React owns the status labels surface', async () => {
  const source = await readDesktopUiSource()
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const presenter = await readFile(
    new URL('../src/desktop-render-presenter.js', import.meta.url),
    'utf8'
  )

  assert.match(source, /setStatus\(status = DEFAULT_STATUS\)/)
  assert.match(source, /\{status\.noticeLabel\}/)
  assert.match(source, /\{status\.treeholeStatusLabel\}/)
  assert.match(source, /\{status\.homeStatusLabel\}/)
  assert.match(source, /\{status\.peerLabel\}/)
  assert.match(source, /\{status\.roomKeyLabel\}/)
  assert.match(source, /\{status\.profileIdLabel\}/)
  assert.match(source, /\{status\.errorDetailLabel\}/)
  assert.match(controller, /createDesktopRenderPresenter/)
  assert.match(presenter, /createDesktopStatusViewModel/)
  assert.match(presenter, /ui\?\.setStatus\(/)
  assert.doesNotMatch(controller, /els\.homeStatusLabel\.textContent/)
  assert.doesNotMatch(controller, /els\.noticeLabel\.textContent/)
  assert.doesNotMatch(controller, /els\.treeholeStatusLabel\.textContent/)
  assert.doesNotMatch(controller, /els\.errorDetailLabel\.textContent/)
})

test('desktop React owns tab and pane active state', async () => {
  const source = await readDesktopUiSource()
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const presenter = await readFile(
    new URL('../src/desktop-render-presenter.js', import.meta.url),
    'utf8'
  )

  assert.match(source, /setActiveTab\(tab = 'chat'\)/)
  assert.match(source, /setShellActions\(actions = \{\}\)/)
  assert.match(source, /const \[activeTab, setActiveTab\] = useState\('chat'\)/)
  assert.match(source, /const \[shellActions, setShellActions\] = useState\(\{/)
  assert.match(source, /isActive=\{activeTab === 'chat'\}/)
  assert.match(source, /onSelect=\{\(\) => shellActions\.setTab\('chat'\)\}/)
  assert.match(source, /onClick=\{onSelect\}/)
  assert.match(source, /className=\{isActive \? 'railButton active' : 'railButton'\}/)
  assert.match(source, /className=\{activeTab === 'chat' \? 'pane' : 'pane hidden'\}/)
  assert.match(presenter, /ui\?\.setActiveTab\(state\.activeTab\)/)
  assert.match(controller, /createDesktopUiActionBindings/)
  assert.doesNotMatch(controller, /chatTab: document\.querySelector/)
  assert.doesNotMatch(controller, /dmTab: document\.querySelector/)
  assert.doesNotMatch(controller, /treeholeTab: document\.querySelector/)
  assert.doesNotMatch(controller, /peopleTab: document\.querySelector/)
  assert.doesNotMatch(controller, /els\.chatTab\.addEventListener/)
  assert.doesNotMatch(controller, /els\.dmTab\.addEventListener/)
  assert.doesNotMatch(controller, /els\.treeholeTab\.addEventListener/)
  assert.doesNotMatch(controller, /els\.peopleTab\.addEventListener/)
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
  const source = await readDesktopUiSource()
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const presenter = await readFile(
    new URL('../src/desktop-render-presenter.js', import.meta.url),
    'utf8'
  )

  assert.match(source, /setControls\(controls = DEFAULT_CONTROLS\)/)
  assert.match(source, /const \[controls, setControls\] = useState\(DEFAULT_CONTROLS\)/)
  assert.match(source, /disabled=\{!controls\.canCreateHome\}/)
  assert.match(source, /disabled=\{!controls\.canLeaveHome\}/)
  assert.match(source, /disabled=\{!canJoinManualHome\}/)
  assert.match(source, /disabled=\{!canJoinHomeQr\}/)
  assert.match(source, /disabled=\{!canTrustProfile\}/)
  assert.match(source, /canUseHomeChatComposer: false/)
  assert.match(
    source,
    /const canSend = controls\.canUseHomeChatComposer && Boolean\(draft\.trim\(\)\)/
  )
  assert.match(source, /disabled=\{!canSend\}/)
  assert.match(
    source,
    /const canSend =[\s\S]*controls\.canUseDirectComposer &&[\s\S]*Boolean\(composer\.text\.trim\(\)\) &&[\s\S]*Boolean\(composer\.toProfileId\.trim\(\)\)/
  )
  assert.match(source, /const canPost = controls\.canPostTreehole && Boolean\(draft\.trim\(\)\)/)
  assert.match(source, /disabled=\{!canPost\}/)
  assert.match(
    source,
    /className=\{[\s\S]*controls\.canPostTreehole \? 'composer tall' : 'composer tall disabledComposer'[\s\S]*\}/
  )
  assert.match(source, /hidden=\{controls\.canPostTreehole\}/)
  assert.match(source, /disabled=\{!controls\.canPostTreehole\}/)
  assert.match(presenter, /ui\?\.setControls\(\{/)
  assert.doesNotMatch(controller, /\.disabled =/)
  assert.doesNotMatch(controller, /classList\.toggle\('disabledComposer'/)
  assert.doesNotMatch(controller, /treeholePostPolicy\.hidden =/)
})

test('desktop React owns the large QR dialog surface', async () => {
  const source = await readDesktopUiSource()
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const localProfile = await readFile(
    new URL('../desktop/local-profile.js', import.meta.url),
    'utf8'
  )

  assert.match(source, /function LargeQrDialog\(\{ onClose, qr \}\)/)
  assert.match(source, /setLargeQr\(qr = EMPTY_LARGE_QR\)/)
  assert.match(source, /className=\{qr\.isOpen \? 'largeQrDialog' : 'largeQrDialog hidden'\}/)
  assert.match(
    source,
    /onClick=\{\(event\) => \{[\s\S]*if \(event\.target === event\.currentTarget\) onClose\(\)/
  )
  assert.match(
    source,
    /onKeyDown=\{\(event\) => \{[\s\S]*if \(event\.key === 'Escape'\) onClose\(\)/
  )
  assert.match(source, /onClick=\{onClose\}/)
  assert.match(source, /dangerouslySetInnerHTML=\{\{ __html: qr\.svg \}\}/)
  assert.match(
    source,
    /<LargeQrDialog onClose=\{model\.shellActions\.hideLargeQr\} qr=\{model\.largeQr\} \/>/
  )
  assert.match(controller, /globalThis\.keposDesktopUi\?\.setLargeQr\(\{/)
  assert.match(controller, /let largeQrReturnFocus = null/)
  assert.match(controller, /largeQrReturnFocus = returnFocus/)
  assert.match(controller, /largeQrReturnFocus\?\.focus\(\)/)
  assert.match(controller, /getShareQrSvgForUri\(uri\)/)
  assert.match(controller, /getLocalProfileApi\(\)\.renderQrSvg\(uri/)
  assert.match(localProfile, /renderDesktopQrSvg/)
  assert.doesNotMatch(controller, /largeQrCloseButton: document\.querySelector/)
  assert.doesNotMatch(controller, /largeQrDialog: document\.querySelector/)
  assert.doesNotMatch(controller, /els\.largeQrCloseButton\.addEventListener/)
  assert.doesNotMatch(controller, /els\.largeQrDialog\.addEventListener/)
  assert.doesNotMatch(controller, /document\.addEventListener\('keydown'/)
  assert.doesNotMatch(controller, /els\.largeQrTitle\.textContent/)
  assert.doesNotMatch(controller, /els\.largeQrCode\.innerHTML/)
  assert.doesNotMatch(controller, /els\.largeQrCode\.replaceChildren/)
  assert.doesNotMatch(controller, /els\.largeQrDialog\.classList\.add\('hidden'\)/)
  assert.doesNotMatch(controller, /els\.largeQrDialog\.classList\.remove\('hidden'\)/)
})

test('desktop React owns shell busy and leave action', async () => {
  const source = await readDesktopUiSource()
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const bindings = await readFile(
    new URL('../src/desktop-ui-action-bindings.js', import.meta.url),
    'utf8'
  )
  const presenter = await readFile(
    new URL('../src/desktop-render-presenter.js', import.meta.url),
    'utf8'
  )

  assert.match(source, /setShellBusy\(isBusy = false\)/)
  assert.match(source, /const \[isShellBusy, setShellBusy\] = useState\(false\)/)
  assert.match(source, /document\.body\.setAttribute\('aria-busy', String\(isShellBusy\)\)/)
  assert.match(source, /<HomeStatusPanel[\s\S]*onLeave=\{model\.shellActions\.leaveHome\}/)
  assert.match(source, /onClick=\{onLeave\}/)
  assert.match(presenter, /ui\?\.setShellBusy\(isActionPending\)/)
  assert.match(bindings, /leaveHome: \(\) => dispatchCommand\('leaveHome'\)/)
  assert.doesNotMatch(controller, /leaveButton: document\.querySelector/)
  assert.doesNotMatch(controller, /els\.leaveButton\.addEventListener/)
  assert.doesNotMatch(controller, /document\.body\.setAttribute\('aria-busy'/)
})

test('desktop React owns inline QR share outputs', async () => {
  const source = await readDesktopUiSource()
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const localProfile = await readFile(
    new URL('../desktop/local-profile.js', import.meta.url),
    'utf8'
  )

  assert.match(source, /function QrShareOutput\(/)
  assert.match(source, /setShareQrOutputs\(outputs = EMPTY_SHARE_QR_OUTPUTS\)/)
  assert.match(source, /dangerouslySetInnerHTML=\{\{ __html: svg \}\}/)
  assert.match(source, /value=\{uri\}/)
  assert.match(source, /svg=\{shareQrOutputs\.homeSvg\}/)
  assert.match(source, /uri=\{shareQrOutputs\.homeUri\}/)
  assert.match(source, /svg=\{shareQrOutputs\.profileSvg\}/)
  assert.match(source, /uri=\{shareQrOutputs\.profileUri\}/)
  assert.match(controller, /let shareQrOutputs = \{/)
  assert.match(controller, /getShareQrOutputs\(\) \{[\s\S]*return shareQrOutputs/)
  assert.match(
    controller,
    /setShareQrOutputs\(outputs\) \{[\s\S]*setShareQrOutputsSnapshot\(outputs\)/
  )
  assert.match(
    controller,
    /setShareQrOutputsSnapshot\(await getLocalProfileApi\(\)\.createShareQrOutputs/
  )
  assert.match(controller, /globalThis\.keposDesktopUi\?\.setShareQrOutputs\(shareQrOutputs\)/)
  assert.match(localProfile, /createDesktopShareQrOutputs/)
  assert.doesNotMatch(controller, /els\.profileQrOutput\.value =/)
  assert.doesNotMatch(controller, /els\.homeQrOutput\.value =/)
  assert.doesNotMatch(controller, /els\.profileQrCode\.innerHTML/)
  assert.doesNotMatch(controller, /els\.homeQrCode\.innerHTML/)
})

test('desktop React owns context form drafts and QR actions', async () => {
  const source = await readDesktopUiSource()
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')

  assert.match(source, /function ContextPanel\(\{/)
  assert.match(source, /const DEFAULT_CONTEXT_FORM = \{/)
  assert.match(source, /const \[contextForm, setContextForm\] = useState\(DEFAULT_CONTEXT_FORM\)/)
  assert.match(source, /displayName: 'Desktop'/)
  assert.match(source, /homeQrUri: ''/)
  assert.match(source, /roomKey: ''/)
  assert.match(source, /trustAlias: ''/)
  assert.match(source, /trustQrUri: ''/)
  assert.match(source, /setContextFormActions\(actions = \{\}\)/)
  assert.match(source, /setContextFormDraft\(draft = \{\}\)/)
  assert.match(source, /form=\{model\.contextForm\}/)
  assert.match(source, /value=\{form\.displayName\}/)
  assert.match(source, /value=\{form\.roomKey\}/)
  assert.match(source, /value=\{form\.homeQrUri\}/)
  assert.match(source, /value=\{form\.trustQrUri\}/)
  assert.match(source, /value=\{form\.trustAlias\}/)
  assert.match(source, /actions\.createHome\(\{ displayName \}\)/)
  assert.match(
    source,
    /actions\.joinManualHome\(\{ displayName, roomKey: form\.roomKey\.trim\(\) \}\)/
  )
  assert.match(controller, /createDesktopUiActionBindings/)
  assert.doesNotMatch(controller, /lobbyForm: document\.querySelector/)
  assert.doesNotMatch(controller, /homeQrForm: document\.querySelector/)
  assert.doesNotMatch(controller, /trustForm: document\.querySelector/)
  assert.doesNotMatch(controller, /nickInput: document\.querySelector/)
  assert.doesNotMatch(controller, /roomKeyInput: document\.querySelector/)
  assert.doesNotMatch(controller, /homeQrInput: document\.querySelector/)
  assert.doesNotMatch(controller, /trustQrInput: document\.querySelector/)
  assert.doesNotMatch(controller, /trustAliasInput: document\.querySelector/)
  assert.doesNotMatch(controller, /els\.roomKeyInput\.value/)
  assert.doesNotMatch(controller, /els\.homeQrInput\.value/)
  assert.doesNotMatch(controller, /els\.trustQrInput\.value/)
  assert.doesNotMatch(controller, /els\.trustAliasInput\.value/)
  assert.doesNotMatch(controller, /els\.nickInput\.value/)
})

test('desktop React owns the people list surfaces', async () => {
  const source = await readDesktopUiSource()
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const presenter = await readFile(
    new URL('../src/desktop-render-presenter.js', import.meta.url),
    'utf8'
  )

  assert.match(source, /function PeopleLists\(\{ actions, messageRequests, trustedContacts \}\)/)
  assert.match(source, /setPeople\(people = \{ messageRequests: \[\], trustedContacts: \[\] \}\)/)
  assert.match(source, /setPeopleActions\(actions = \{\}\)/)
  assert.match(source, /<PeoplePane[\s\S]*messageRequests=\{model\.people\.messageRequests\}/)
  assert.match(source, /<PeopleLists[\s\S]*messageRequests=\{messageRequests\}/)
  assert.match(source, /onClick=\{\(\) => actions\.revokeContact\(contact\.profileId\)\}/)
  assert.match(source, /onClick=\{\(\) => actions\.ignoreMessageRequest\(request\.profileId\)\}/)
  assert.match(
    source,
    /onClick=\{\(\) => actions\.acceptMessageRequest\(request\.acceptMessage\)\}/
  )
  assert.match(presenter, /ui\?\.setPeople\(/)
  assert.match(controller, /createDesktopUiActionBindings/)
  assert.doesNotMatch(controller, /els\.contactList\.replaceChildren/)
  assert.doesNotMatch(controller, /els\.requestList\.replaceChildren/)
})

test('desktop React owns the treehole post list surface', async () => {
  const source = await readDesktopUiSource()
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const presenter = await readFile(
    new URL('../src/desktop-render-presenter.js', import.meta.url),
    'utf8'
  )

  assert.match(source, /function TreeholeList\(\{ actions, posts \}\)/)
  assert.match(source, /setTreeholePosts\(posts = \[\]\)/)
  assert.match(source, /setTreeholeActions\(actions = \{\}\)/)
  assert.match(source, /<TreeholePane[\s\S]*posts=\{model\.treeholePosts\}/)
  assert.match(source, /<TreeholeList[\s\S]*posts=\{posts\}/)
  assert.match(source, /onClick=\{\(\) => actions\.likePost\(post\.actions\.likePostId\)\}/)
  assert.match(
    source,
    /actions\.commentPost\(\{ postId: post\.actions\.commentPostId, text: draft\.trim\(\) \}\)/
  )
  assert.match(presenter, /ui\?\.setTreeholePosts\(/)
  assert.match(controller, /createDesktopUiActionBindings/)
  assert.doesNotMatch(controller, /els\.treeholeList\.replaceChildren/)
})

test('desktop React owns the treehole main post composer draft', async () => {
  const source = await readDesktopUiSource()
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
  assert.match(controller, /createDesktopUiActionBindings/)
  assert.doesNotMatch(controller, /treeholeForm: document\.querySelector/)
  assert.doesNotMatch(controller, /treeholeInput: document\.querySelector/)
  assert.doesNotMatch(controller, /els\.treeholeInput\.addEventListener/)
  assert.doesNotMatch(controller, /els\.treeholeForm\.addEventListener/)
  assert.doesNotMatch(controller, /els\.treeholeInput\.value/)
})

test('desktop React owns the direct message composer draft and recipient', async () => {
  const source = await readDesktopUiSource()
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')

  assert.match(
    source,
    /function DirectComposer\(\{[\s\S]*actions,[\s\S]*composer,[\s\S]*contactPicker/
  )
  assert.match(source, /const \[directComposer, setDirectComposer\] = useState\(\{/)
  assert.match(source, /text: '',\s*toProfileId: ''/)
  assert.match(source, /setDirectComposerActions\(actions = \{\}\)/)
  assert.match(source, /setDirectComposerRecipient\(toProfileId = ''\)/)
  assert.match(
    source,
    /const canSend =[\s\S]*controls\.canUseDirectComposer &&[\s\S]*Boolean\(composer\.text\.trim\(\)\) &&[\s\S]*Boolean\(composer\.toProfileId\.trim\(\)\)/
  )
  assert.match(
    source,
    /actions\.sendDirectMessage\(\{\s*text: composer\.text\.trim\(\),\s*toProfileId: composer\.toProfileId\.trim\(\)\s*\}\)/
  )
  assert.match(source, /value=\{composer\.toProfileId\}/)
  assert.match(source, /value=\{composer\.text\}/)
  assert.match(controller, /createDesktopUiActionBindings/)
  assert.doesNotMatch(controller, /dmForm: document\.querySelector/)
  assert.doesNotMatch(controller, /dmInput: document\.querySelector/)
  assert.doesNotMatch(controller, /dmRecipientInput: document\.querySelector/)
  assert.doesNotMatch(controller, /els\.dmInput\.addEventListener/)
  assert.doesNotMatch(controller, /els\.dmRecipientInput\.addEventListener/)
  assert.doesNotMatch(controller, /els\.dmInput\.value/)
  assert.doesNotMatch(controller, /els\.dmRecipientInput\.value/)
})
