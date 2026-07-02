import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function readDesktopAppSource() {
  return await readFile(new URL('../desktop/app.tsx', import.meta.url), 'utf8')
}

async function readDesktopUiSource() {
  const app = await readDesktopAppSource()
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
  const shared = await readFile(new URL('../desktop/ui-components.tsx', import.meta.url), 'utf8')
  return `${app}\n${appState}\n${panes}\n${shell}\n${context}\n${people}\n${shared}`
}

test('desktop React shell separates navigation, workspace, and context panels', async () => {
  const source = await readDesktopAppSource()
  const shell = await readFile(new URL('../desktop/shell-components.tsx', import.meta.url), 'utf8')
  const styles = await readFile(new URL('../desktop/styles.css', import.meta.url), 'utf8')

  assert.match(source, /<AppRail[\s\S]*activeTab=\{model\.activeTab\}/)
  assert.match(source, /<AppRail[\s\S]*shellActions=\{model\.shellActions\}/)
  assert.match(source, /className='workspace'/)
  assert.match(source, /className='contextPanel'/)
  assert.match(source, /aria-label='Contacts and Home context'/)
  assert.match(shell, /className='appRail'/)
  assert.equal(source.indexOf('<AppRail') < source.indexOf("className='workspace'"), true)
  assert.equal(
    source.indexOf("className='workspace'") < source.indexOf("className='contextPanel'"),
    true
  )
  assert.equal(source.indexOf('<ContextPanel') > source.indexOf("className='contextPanel'"), true)
  assert.match(await readDesktopUiSource(), /id='lobbyForm'/)
  assert.match(styles, /grid-template-columns:\s*88px minmax\(0, 1fr\) 340px/)
})

test('desktop context actions live behind a dedicated component boundary', async () => {
  const source = await readDesktopAppSource()
  const context = await readFile(
    new URL('../desktop/context-components.tsx', import.meta.url),
    'utf8'
  )

  assert.match(source, /import \{ ContextPanel \} from '\.\/context-components\.tsx'/)
  assert.match(source, /<ContextPanel[\s\S]*shareQrOutputs=\{model\.shareQrOutputs\}/)
  assert.match(context, /export function ContextPanel\(/)
  assert.match(context, /const ROOM_KEY_PATTERN = \/\^\[0-9a-f\]\{64\}\$\//)
  assert.doesNotMatch(source, /function ContextPanel\(/)
  assert.doesNotMatch(source, /function QrShareOutput\(/)
})

test('desktop context panel uses product actions for home and people flows', async () => {
  const source = await readDesktopUiSource()
  const styles = await readFile(new URL('../desktop/styles.css', import.meta.url), 'utf8')

  assert.match(source, /<h1>Kepos<\/h1>/)
  assert.match(source, /<details className='contextGroup homeActions'/)
  assert.equal(/<details className='contextGroup homeActions'[^>]+open>/.test(source), false)
  assert.match(source, /Open your home or enter a trusted live room\./)
  assert.match(source, /Name[\s\S]*id='nickInput'/)
  assert.match(source, /id='avatarFileInput'[\s\S]*type='file'/)
  assert.match(source, /id='avatarFileInput'[\s\S]*accept='image\/png,image\/jpeg,image\/webp'/)
  assert.match(source, /handleAvatarFileChange/)
  assert.match(source, /id='showMyQrButton'[\s\S]*label='Show My QR'/)
  assert.match(
    source,
    /id='showMyQrButton'[\s\S]*actions\.showLargeProfileQr\(\{ returnFocus: event\.currentTarget \}\)/
  )
  assert.equal(source.indexOf("id='showMyQrButton'") < source.indexOf("id='homeQrForm'"), true)
  assert.match(source, /Show Home QR/)
  assert.match(source, /Copy Home QR/)
  assert.match(source, /Enter Home/)
  assert.match(source, /placeholder='Paste Home QR'/)
  assert.match(source, /Profile QR details/)
  assert.match(source, /id='showLargeProfileQrButton'[\s\S]*label='Show My QR'/)
  assert.match(source, /Copy Profile QR/)
  assert.match(source, /SectionTitle[\s\S]*text='Contacts'/)
  assert.match(source, /Profile QR[\s\S]*id='trustQrInput'/)
  assert.match(source, /Friend name[\s\S]*id='trustAliasInput'/)
  assert.match(source, /placeholder='Ada'/)
  assert.match(source, /<details className='contextGroup peopleActions'[^>]+open>/)
  assert.match(source, /Show My QR, scan a Profile QR, and start requests\./)
  assert.equal(source.includes('Advanced contact requests and private messages.'), false)
  assert.equal(source.includes('Advanced profile trust and direct message setup.'), false)
  assert.match(source, /Start request/)
  assert.equal(source.includes("text='People'"), false)
  assert.equal(source.includes('Start your room'), false)
  assert.equal(source.includes('Trust a profile before private home access or DM.'), false)
  assert.equal(source.includes('Trust Profile'), false)
  assert.equal(source.includes('Friend profile'), false)
  assert.equal(source.includes('Show my profile'), false)
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

test('desktop context forms use task panel headers', async () => {
  const context = await readFile(
    new URL('../desktop/context-components.tsx', import.meta.url),
    'utf8'
  )
  const shared = await readFile(new URL('../desktop/ui-components.tsx', import.meta.url), 'utf8')
  const styles = await readFile(new URL('../desktop/styles.css', import.meta.url), 'utf8')

  assert.match(shared, /export function PanelHeader\(/)
  assert.match(shared, /export function ActionButton\(/)
  assert.match(
    context,
    /import \{ ActionButton, PanelHeader, SectionTitle \} from '\.\/ui-components\.tsx'/
  )
  assert.match(
    context,
    /id='lobbyForm'[\s\S]*<PanelHeader[\s\S]*eyebrow='Home'[\s\S]*title='My home'[\s\S]*description='Open your saved home on this device\.'[\s\S]*\/>/
  )
  assert.match(
    context,
    /id='homeQrForm'[\s\S]*<PanelHeader[\s\S]*eyebrow='Advanced'[\s\S]*title='Debug Home QR'[\s\S]*description='Debug home descriptor for explicit live-room entry; it does not create friendship\.'[\s\S]*\/>/
  )
  assert.match(
    context,
    /id='trustForm'[\s\S]*<PanelHeader[\s\S]*eyebrow='Contacts'[\s\S]*title='Add friend'[\s\S]*description='Paste a Profile QR, then write a request in Chat\.'[\s\S]*\/>/
  )
  assert.match(styles, /\.panelHeader/)
  assert.match(styles, /\.panelTitle/)
  assert.match(styles, /\.panelDescription/)
})

test('desktop trust form shows friend name copy once', async () => {
  const source = await readDesktopUiSource()
  const labelBlock = source.match(/<label>[\s\S]*?id='trustAliasInput'[\s\S]*?<\/label>/)?.[0]

  assert.ok(labelBlock)
  assert.equal(labelBlock.match(/Friend name/g)?.length, 1)
})

test('desktop people UI uses trusted friends copy', async () => {
  const source = await readDesktopUiSource()
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const presenter = await readFile(
    new URL('../src/desktop-render-presenter.ts', import.meta.url),
    'utf8'
  )
  const peopleViewModel = await readFile(
    new URL('../src/desktop-people-view-model.ts', import.meta.url),
    'utf8'
  )
  const actions = await readFile(
    new URL('../src/desktop-trust-actions.ts', import.meta.url),
    'utf8'
  )
  const bindings = await readFile(
    new URL('../src/desktop-ui-action-bindings.ts', import.meta.url),
    'utf8'
  )

  assert.match(source, /id='peopleTab'[\s\S]*title=\{getProductSurfaceTitle\('people'\)\}/)
  assert.match(source, /label=\{getProductSurfaceLabel\('people'\)\}/)
  assert.doesNotMatch(source, /<span className='railLabel'>/)
  assert.match(source, /id='peoplePane'/)
  assert.match(
    source,
    /<PaneHeader[\s\S]*eyebrow='profiles'[\s\S]*title='Contacts'[\s\S]*description='Trusted profiles, Chat, and home entry live here\.'/
  )
  assert.match(source, /Profiles/)
  assert.match(source, /No trusted friends yet/)
  assert.match(source, /No requests waiting/)
  assert.match(source, /Trusted contacts will appear here after a friend request is accepted\./)
  assert.match(source, /Open Contacts to scan a profile or accept a friend request\./)
  assert.equal(source.includes('Add a trusted friend before starting a direct message.'), false)
  assert.equal(source.includes('Add a trusted friend before starting a message thread.'), false)
  assert.equal(
    source.includes('Trusted profiles, direct messages, and home entry live here.'),
    false
  )
  assert.match(presenter, /createDesktopPeopleViewModel/)
  assert.match(source, /\{contact\.statusLabel\}/)
  assert.match(source, /\{contact\.sourceLabel\}/)
  assert.match(source, /\{contact\.trustedAtLabel\}/)
  assert.match(source, /label=\{contact\.messageActionLabel\}/)
  assert.match(source, /onClick=\{\(\) => actions\.messageContact\(contact\.profileId\)\}/)
  assert.match(source, /label='Profile'/)
  assert.match(source, /onClick=\{\(\) => actions\.openProfile\(contact\.profileId\)\}/)
  assert.doesNotMatch(
    source,
    /<p className='mono muted smallText text-xs text-base-content\/60'>Profile<\/p>/
  )
  assert.match(source, /label=\{contact\.homeActionLabel\}/)
  assert.match(source, /disabled=\{!contact\.homeActionEnabled\}/)
  assert.match(source, /\{contact\.recentTitle\}/)
  assert.match(source, /id='contactProfileDetail'/)
  assert.match(source, /ContactProfileDetail/)
  assert.match(source, /Advanced identity/)
  assert.match(source, /Profile fingerprint/)
  assert.match(source, /actions\.closeProfile/)
  assert.match(source, /\{profile\.homeActionEnabled \? \(/)
  assert.match(source, /ariaLabel=\{`Refresh recent posts from \$\{profile\.alias\}`\}/)
  assert.match(source, /label='Refresh posts'/)
  assert.match(source, /actions\.enterContactHome\(profile\.profileId\)/)
  assert.match(source, /<ActionButton[\s\S]*ariaLabel=\{`Remove \$\{contact\.alias\} as friend`\}/)
  assert.match(source, /<ActionButton[\s\S]*className='smallButton dangerButton'/)
  assert.match(source, /<ActionButton[\s\S]*icon=\{<UserX size=\{15\} \/>\}/)
  assert.match(source, /<ActionButton[\s\S]*label='Remove friend'/)
  assert.match(presenter, /ui\?\.setPeople\(/)
  assert.match(
    bindings,
    /messageContact: \(profileId\) => \{[\s\S]*selectDirectContact\(profileId\)[\s\S]*return setTab\('dm'\)/
  )
  assert.match(
    bindings,
    /allowContactRequests: \(profileId\) => dispatchCommand\('allowContactRequests'/
  )
  assert.match(bindings, /revokeContact: \(profileId\) => dispatchCommand\('revokeContact'/)
  assert.equal(source.indexOf("id='contactList'") > source.indexOf("id='peoplePane'"), true)
  assert.match(source, /onSelect=\{\(\) => shellActions\.setTab\('people'\)\}/)
  assert.match(controller, /createDesktopUiActionBindings/)
  assert.doesNotMatch(controller, /els\.peopleTab\.addEventListener/)
  assert.match(source, /className=\{activeTab === 'people' \? 'pane' : 'pane hidden'\}/)
  assert.match(source, /isActive=\{activeTab === 'people'\}/)
  assert.equal(controller.includes('No trusted contacts'), false)
  assert.equal(controller.includes('notice: `Revoked ${shorten(profileId)}.`'), false)
  assert.match(actions, /setNotice\('Friend removed\.'\)/)
})

test('desktop People empty panels use icon-led product empty states', async () => {
  const people = await readFile(
    new URL('../desktop/people-components.tsx', import.meta.url),
    'utf8'
  )
  const styles = await readFile(new URL('../desktop/styles.css', import.meta.url), 'utf8')

  assert.match(people, /function PeopleEmptyState\(\{[\s\S]*copy,[\s\S]*icon,[\s\S]*title[\s\S]*\}/)
  assert.match(people, /<PeopleEmptyState[\s\S]*icon=\{<MessageCircle size=\{18\} \/>/)
  assert.match(people, /title='No requests waiting'/)
  assert.match(people, /copy='Friend requests you receive will appear here\.'/)
  assert.equal(people.includes('Message requests from trusted Home traffic'), false)
  assert.match(people, /<PeopleEmptyState[\s\S]*icon=\{<Users size=\{18\} \/>/)
  assert.match(people, /title='No trusted friends yet'/)
  assert.match(
    people,
    /copy='Trusted contacts will appear here after a friend request is accepted\.'/
  )
  assert.match(styles, /\.peopleEmpty/)
  assert.match(styles, /\.peopleEmptyIcon/)
  assert.match(styles, /\.peopleEmptyTitle/)
  assert.match(styles, /\.peopleEmptyCopy/)
})

test('desktop People pane lives behind a dedicated component boundary', async () => {
  const source = await readDesktopAppSource()
  const people = await readFile(
    new URL('../desktop/people-components.tsx', import.meta.url),
    'utf8'
  )

  assert.match(source, /import \{ PeoplePane \} from '\.\/people-components\.tsx'/)
  assert.match(source, /blockedContacts=\{model\.people\.blockedContacts\}/)
  assert.match(source, /outgoingRequests=\{model\.people\.outgoingRequests\}/)
  assert.match(source, /<PeoplePane[\s\S]*trustedContacts=\{model\.people\.trustedContacts\}/)
  assert.match(source, /<PeoplePane[\s\S]*selectedProfile=\{model\.selectedProfile\}/)
  assert.match(people, /export function PeoplePane\(/)
  assert.match(people, /export function PeopleLists\(/)
  assert.match(people, /id='blockedProfilesTitle'/)
  assert.match(people, /id='blockedContactList'/)
  assert.match(people, /Removed \/ ignored/)
  assert.match(people, /Profiles you remove or ignore will appear here\./)
  assert.match(people, /contact\.recentCopy/)
  assert.match(people, /contact\.recentPosts/)
  assert.match(people, /profile\.recentPosts/)
  assert.match(people, /<ProfileAvatar avatar=\{contact\.avatar\}/)
  assert.match(people, /<ProfileAvatar avatar=\{profile\.avatar\}/)
  assert.match(
    people,
    /import \{ ActionButton, PaneHeader, RequestActionButton, SectionTitle \} from '\.\/ui-components\.tsx'/
  )
  assert.doesNotMatch(source, /<PaneLabel eyebrow='trusted' title='People' \/>/)
  assert.doesNotMatch(source, /function PeopleLists\(/)
  assert.doesNotMatch(people, /function SectionTitle\(/)
})

test('desktop recent profile posts cache is durable across app restart', async () => {
  const appState = await readFile(new URL('../desktop/app-state.ts', import.meta.url), 'utf8')

  assert.match(appState, /loadProfileRecentPostCacheFromStorage/)
  assert.match(appState, /saveProfileRecentPostCacheToStorage/)
  assert.match(appState, /updateProfileRecentPostCache/)
  assert.match(
    appState,
    /useState<ProfileRecentPostCache>\(\s*loadInitialProfileRecentPostCache\s*\)/
  )
  assert.match(appState, /function loadInitialProfileRecentPostCache\(\)/)
  assert.match(appState, /function saveProfileRecentPostCache\(cache: ProfileRecentPostCache\)/)
  assert.match(appState, /saveProfileRecentPostCache\(nextCache\)/)
})

test('desktop primary panes live behind a dedicated component boundary', async () => {
  const source = await readDesktopAppSource()
  const appState = await readFile(new URL('../desktop/app-state.ts', import.meta.url), 'utf8')
  const panes = await readFile(new URL('../desktop/pane-components.tsx', import.meta.url), 'utf8')
  const presenter = await readFile(
    new URL('../src/desktop-render-presenter.ts', import.meta.url),
    'utf8'
  )

  assert.match(
    source,
    /import \{ DirectPane, HomePane, TreeholePane \} from '\.\/pane-components\.tsx'/
  )
  assert.match(source, /<HomePane[\s\S]*messages=\{model\.homeMessages\}/)
  assert.match(source, /<HomePane[\s\S]*homeOwner=\{model\.homeOwner\}/)
  assert.match(appState, /setHomeOwner\(owner = DEFAULT_HOME_OWNER\)/)
  assert.match(presenter, /setHomeOwner\(\s*createHomeOwnerViewModel/)
  assert.match(panes, /homeOwner\.title/)
  assert.match(panes, /homeOwner\.subtitle/)
  assert.match(panes, /onOpenOwnerProfile\(homeOwner\.ownerProfileId\)/)
  assert.match(source, /<DirectPane[\s\S]*messages=\{model\.directMessages\}/)
  assert.match(source, /<DirectPane[\s\S]*threads=\{model\.directThreads\}/)
  assert.match(panes, /<ProfileAvatar avatar=\{thread\.avatar\}/)
  assert.match(source, /<TreeholePane[\s\S]*posts=\{model\.treeholePosts\}/)
  assert.match(panes, /export function HomePane\(/)
  assert.match(panes, /export function DirectPane\(/)
  assert.match(panes, /export function TreeholePane\(/)
  assert.doesNotMatch(source, /function HomeChatComposer\(/)
  assert.doesNotMatch(source, /function DirectComposer\(/)
  assert.doesNotMatch(source, /function TreeholeComposer\(/)
  assert.doesNotMatch(source, /function PaneLabel\(/)
})

test('desktop Chat focuses the selected direct thread message list', async () => {
  const panes = await readFile(new URL('../desktop/pane-components.tsx', import.meta.url), 'utf8')
  const directPane = panes.slice(
    panes.indexOf('export function DirectPane('),
    panes.indexOf('function DirectThreadHeader(')
  )

  assert.match(panes, /filterDirectMessagesForProfile/)
  assert.match(
    directPane,
    /const visibleMessages = filterDirectMessagesForProfile\(\s*messages,\s*composer\.toProfileId\.trim\(\)\s*\)/
  )
  assert.match(directPane, /<DirectMessageList[\s\S]*messages=\{visibleMessages\}/)
})

test('desktop panes share product headers with short guidance', async () => {
  const panes = await readFile(new URL('../desktop/pane-components.tsx', import.meta.url), 'utf8')
  const people = await readFile(
    new URL('../desktop/people-components.tsx', import.meta.url),
    'utf8'
  )
  const context = await readFile(
    new URL('../desktop/context-components.tsx', import.meta.url),
    'utf8'
  )
  const shared = await readFile(new URL('../desktop/ui-components.tsx', import.meta.url), 'utf8')
  const styles = await readFile(new URL('../desktop/styles.css', import.meta.url), 'utf8')

  assert.match(shared, /export function PaneHeader\(/)
  assert.match(shared, /export function SectionTitle\(/)
  assert.match(panes, /ActionButton,[\s\S]*ComposerSubmitButton,[\s\S]*PaneHeader/)
  assert.match(
    people,
    /import \{ ActionButton, PaneHeader, RequestActionButton, SectionTitle \} from '\.\/ui-components\.tsx'/
  )
  assert.match(
    context,
    /import \{ ActionButton, PanelHeader, SectionTitle \} from '\.\/ui-components\.tsx'/
  )
  assert.match(
    panes,
    /<PaneHeader[\s\S]*eyebrow='live'[\s\S]*title='Live home chat'[\s\S]*description='Ephemeral messages for everyone currently inside this home\.'[\s\S]*\/>/
  )
  assert.match(
    panes,
    /<PaneHeader[\s\S]*eyebrow='durable'[\s\S]*title='Chat'[\s\S]*description='Private pairwise threads that survive restarts\.'[\s\S]*\/>/
  )
  assert.match(
    panes,
    /<PaneHeader[\s\S]*eyebrow='durable'[\s\S]*title='Treehole'[\s\S]*description='Your durable posts stay here; trusted friends can react and comment\.'[\s\S]*\/>/
  )
  assert.match(panes, /placeholder='Post to Treehole'/)
  assert.equal(panes.includes("placeholder='Post to the treehole'"), false)
  assert.match(
    people,
    /<PaneHeader[\s\S]*eyebrow='profiles'[\s\S]*title='Contacts'[\s\S]*description='Trusted profiles, Chat, and home entry live here\.'[\s\S]*\/>/
  )
  assert.doesNotMatch(panes, /function PaneLabel\(/)
  assert.doesNotMatch(people, /function PaneLabel\(/)
  assert.doesNotMatch(people, /function SectionTitle\(/)
  assert.doesNotMatch(context, /function SectionTitle\(/)
  assert.match(styles, /\.paneDescription/)
})

test('desktop app state and bridge live behind a dedicated hook boundary', async () => {
  const source = await readDesktopAppSource()
  const appState = await readFile(new URL('../desktop/app-state.ts', import.meta.url), 'utf8')

  assert.match(source, /import \{ useDesktopAppModel \} from '\.\/app-state\.ts'/)
  assert.match(source, /const model = useDesktopAppModel\(\)/)
  assert.match(appState, /export function useDesktopAppModel\(\)/)
  assert.match(appState, /type DesktopUiBridge = \{/)
  assert.match(appState, /createProfileRecentPostsViewModel/)
  assert.match(appState, /activeHomeOwnerProfileId/)
  assert.match(appState, /profileRecentPostCache/)
  assert.match(appState, /const trustedContactsWithRecent = people\.trustedContacts\.map/)
  assert.match(appState, /people: peopleWithRecent/)
  assert.match(appState, /cachedPostsByProfileId: profileRecentPostCache/)
  assert.match(
    appState,
    /type DesktopGlobal = typeof globalThis & \{ keposDesktopUi: DesktopUiApi \}/
  )
  assert.match(appState, /\(globalThis as DesktopGlobal\)\.keposDesktopUi = \{/)
  assert.match(appState, /desktopUiBridge\.setContextFormDraft = \(draft = \{\}\) =>/)
  assert.doesNotMatch(source, /const desktopUiBridge = \{/)
  assert.doesNotMatch(source, /globalThis\.keposDesktopUi = \{/)
})

test('desktop people pane surfaces pending message requests', async () => {
  const source = await readDesktopUiSource()
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const backendActions = await readFile(
    new URL('../src/desktop-backend-actions.ts', import.meta.url),
    'utf8'
  )
  const presenter = await readFile(
    new URL('../src/desktop-render-presenter.ts', import.meta.url),
    'utf8'
  )
  const peopleViewModel = await readFile(
    new URL('../src/desktop-people-view-model.ts', import.meta.url),
    'utf8'
  )
  const actions = await readFile(
    new URL('../src/desktop-message-request-actions.ts', import.meta.url),
    'utf8'
  )
  const bindings = await readFile(
    new URL('../src/desktop-ui-action-bindings.ts', import.meta.url),
    'utf8'
  )

  assert.match(source, /id='requestList'/)
  assert.match(source, /Friend requests/)
  assert.match(source, /id='outgoingRequestList'/)
  assert.match(source, /Sent requests/)
  assert.match(peopleViewModel, /formatProfileFriendRequestDeliveryState/)
  assert.match(presenter, /createDesktopPeopleViewModel/)
  assert.match(source, /messageRequests=\{model\.people\.messageRequests\}/)
  assert.match(source, /outgoingRequests=\{model\.people\.outgoingRequests\}/)
  assert.match(source, /No requests waiting/)
  assert.match(source, /\{request\.title\}/)
  assert.match(source, /\{request\.preview\}/)
  assert.match(source, /actions\.acceptMessageRequest\(request\.acceptMessage\)/)
  assert.match(source, /actions\.ignoreMessageRequest\(request\.profileId\)/)
  assert.match(source, /ariaLabel=\{`Accept friend request from \$\{request\.title\}`\}/)
  assert.match(source, /ariaLabel=\{`Ignore friend request from \$\{request\.title\}`\}/)
  assert.match(
    bindings,
    /acceptMessageRequest: \(message\) => dispatchCommand\('acceptMessageRequest'/
  )
  assert.match(
    bindings,
    /ignoreMessageRequest: \(profileId\) => dispatchCommand\('ignoreMessageRequest'/
  )
  const session = await readFile(
    new URL('../src/desktop-backend-session.ts', import.meta.url),
    'utf8'
  )

  assert.match(session, /createDesktopMessageRequestActions/)
  assert.match(
    backendActions,
    /acceptMessageRequest: messageRequestActions\?\.acceptMessageRequest/
  )
  assert.match(
    backendActions,
    /ignoreMessageRequest: messageRequestActions\?\.ignoreMessageRequest/
  )
  assert.match(actions, /createDesktopMessageRequestAcceptance/)
  assert.match(actions, /createDesktopMessageRequestIgnore/)
})

test('desktop keeps inline QR codes as advanced share detail', async () => {
  const source = await readDesktopUiSource()

  assert.match(source, /id='copyHomeQrButton'[\s\S]*Copy Home QR/)
  assert.match(source, /id='copyProfileQrButton'[\s\S]*Copy Profile QR/)
  assert.equal(
    source.indexOf("qrId='homeQrCode'") > source.indexOf("detailsId='advancedHomeShare'"),
    true
  )
  assert.equal(
    source.indexOf("qrId='profileQrCode'") > source.indexOf("detailsId='advancedProfileShare'"),
    true
  )
  assert.equal(
    source.indexOf("id='showLargeHomeQrButton'") < source.indexOf("qrId='homeQrCode'"),
    true
  )
  assert.equal(
    source.indexOf("id='showLargeProfileQrButton'") < source.indexOf("qrId='profileQrCode'"),
    true
  )
  assert.match(source, /Home QR details/)
  assert.match(source, /Profile QR details/)
  assert.equal(source.includes('My home URI'), false)
  assert.equal(source.includes('My profile URI'), false)
})

test('desktop QR sharing exposes copy actions without surfacing raw URI copy', async () => {
  const source = await readDesktopUiSource()
  const context = await readFile(
    new URL('../desktop/context-components.tsx', import.meta.url),
    'utf8'
  )
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const bindings = await readFile(
    new URL('../src/desktop-ui-action-bindings.ts', import.meta.url),
    'utf8'
  )

  assert.match(source, /Copy Home QR/)
  assert.match(source, /Copy Profile QR/)
  assert.match(context, /<ActionButton[\s\S]*id='copyHomeQrButton'[\s\S]*actions\.copyHomeQr\(\)/)
  assert.match(
    context,
    /<ActionButton[\s\S]*id='copyProfileQrButton'[\s\S]*actions\.copyProfileQr\(\)/
  )
  assert.match(bindings, /copyHomeQr: \(\) =>/)
  assert.match(bindings, /copyProfileQr: \(\) =>/)
  assert.match(controller, /navigator\.clipboard\.writeText\(value\)/)
  assert.match(bindings, /notice: 'Home QR copied\.'/)
  assert.match(bindings, /notice: 'Profile QR copied\.'/)
  assert.match(controller, /setNotice\(notice\)/)
  assert.equal(source.includes('Copy URI'), false)
})

test('desktop request and QR dialog actions use clear icons', async () => {
  const source = await readDesktopUiSource()
  const panes = await readFile(new URL('../desktop/pane-components.tsx', import.meta.url), 'utf8')
  const people = await readFile(
    new URL('../desktop/people-components.tsx', import.meta.url),
    'utf8'
  )
  const shared = await readFile(new URL('../desktop/ui-components.tsx', import.meta.url), 'utf8')

  assert.match(source, /import \{ X \} from 'lucide-react'/)
  assert.match(source, /import \{ ActionButton \} from '\.\/ui-components\.tsx'/)
  assert.match(
    source,
    /<ActionButton[\s\S]*ariaLabel='Close QR dialog'[\s\S]*autoFocus=\{qr\.isOpen\}[\s\S]*className='smallButton'[\s\S]*icon=\{<X size=\{16\} \/>\}[\s\S]*id='largeQrCloseButton'[\s\S]*label='Close'/
  )
  assert.match(shared, /autoFocus=\{autoFocus\}/)
  assert.match(shared, /import \{ Check, X \} from 'lucide-react'/)
  assert.match(shared, /export function RequestActionButton\(/)
  assert.match(shared, /const Icon = isAccept \? Check : X/)
  assert.match(shared, /const label = isAccept \? 'Accept' : 'Ignore'/)
  assert.match(
    people,
    /<RequestActionButton[\s\S]*ariaLabel=\{`Ignore friend request from \$\{request\.title\}`\}[\s\S]*actions\.ignoreMessageRequest\(request\.profileId\)[\s\S]*variant='ignore'/
  )
  assert.match(
    people,
    /<RequestActionButton[\s\S]*ariaLabel=\{`Accept friend request from \$\{request\.title\}`\}[\s\S]*actions\.acceptMessageRequest\(request\.acceptMessage\)[\s\S]*variant='accept'/
  )
  assert.match(
    people,
    /<ActionButton[\s\S]*icon=\{<UserX size=\{15\} \/>\}[\s\S]*label='Remove friend'[\s\S]*actions\.revokeContact\(contact\.profileId\)/
  )
  assert.match(
    people,
    /<ActionButton[\s\S]*icon=\{<UserPlus size=\{15\} \/>\}[\s\S]*label='Allow requests'[\s\S]*actions\.allowContactRequests\(contact\.profileId\)/
  )
  assert.match(source, /import \{ Heart, MessageCircle, Send, Sprout, User, UserPlus \}/)
  assert.match(
    panes,
    /<RequestActionButton[\s\S]*ariaLabel='Ignore friend request'[\s\S]*onIgnore\(actions\.ignoreMessage\)[\s\S]*variant='ignore'/
  )
  assert.match(
    panes,
    /<RequestActionButton[\s\S]*ariaLabel='Accept friend request'[\s\S]*onAccept\(actions\.acceptMessage\)[\s\S]*variant='accept'/
  )
  assert.equal(panes.includes('direct message request'), false)
})

test('desktop normal UI copy avoids raw home address language', async () => {
  const source = await readDesktopUiSource()
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const roomActions = await readFile(
    new URL('../src/desktop-room-actions.ts', import.meta.url),
    'utf8'
  )
  const state = await readFile(new URL('../src/desktop-state.ts', import.meta.url), 'utf8')
  const desktopCopy = `${source}\n${controller}\n${roomActions}\n${state}`

  assert.match(source, /Open my home/)
  assert.match(desktopCopy, /Show My QR or add a friend\./)
  assert.match(desktopCopy, /Joining home\.\.\./)
  assert.match(source, /<p className='label'>Home<\/p>/)
  assert.equal(source.includes('Create Home'), false)
  assert.equal(source.includes("<p className='label'>Home address</p>"), false)
  assert.equal(desktopCopy.includes('Create or join a home.'), false)
  assert.equal(desktopCopy.includes('Create or join a room.'), false)
  assert.equal(desktopCopy.includes('Joining home room...'), false)
})

test('desktop status panel keeps raw ids in advanced details', async () => {
  const source = await readDesktopUiSource()
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const presenter = await readFile(
    new URL('../src/desktop-render-presenter.ts', import.meta.url),
    'utf8'
  )

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
  assert.match(source, /\{status\.homeStatusLabel\}/)
  assert.match(source, /\{status\.treeholeStatusLabel\}/)
  assert.match(source, /\{status\.errorDetailLabel\}/)
  assert.match(presenter, /createDesktopStatusViewModel/)
  assert.match(presenter, /ui\?\.setStatus\(/)
  assert.equal(source.includes('treehole idle'), false)
  assert.equal(source.includes("<p className='label'>Peers</p>"), false)
  assert.equal(controller.includes('Treehole ${state.treeholeStatus}'), false)
})

test('desktop status surfaces use compact visual status treatments', async () => {
  const source = await readDesktopUiSource()
  const styles = await readFile(new URL('../desktop/styles.css', import.meta.url), 'utf8')

  assert.match(source, /className='statusStrip'/)
  assert.match(source, /aria-label='Current status'/)
  assert.match(source, /aria-live='polite'/)
  assert.match(source, /role='status'/)
  assert.match(source, /className='statusPill noticePill'/)
  assert.match(source, /className='statusPill treeholePill'/)
  assert.match(source, /className='metricGrid'/)
  assert.match(source, /className='metricCard'/)
  assert.match(source, /className='metricLabel'/)
  assert.match(styles, /\.statusStrip/)
  assert.match(styles, /\.statusPill/)
  assert.match(styles, /\.noticePill/)
  assert.match(styles, /\.treeholePill/)
  assert.match(styles, /\.metricGrid/)
  assert.match(styles, /\.metricCard/)
  assert.match(styles, /\.metric\s*\{[\s\S]*font-size: 28px/)
  assert.match(styles, /\.metric\s*\{[\s\S]*word-break: keep-all/)
  assert.match(styles, /minmax\(0, 1fr\)/)
})

test('desktop error handling keeps raw exception detail advanced', async () => {
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const state = await readFile(new URL('../src/desktop-state.ts', import.meta.url), 'utf8')
  const statusViewModel = await readFile(
    new URL('../src/desktop-status-view-model.ts', import.meta.url),
    'utf8'
  )

  assert.match(state, /lastError: ''/)
  assert.match(statusViewModel, /errorDetailLabel: state\?\.lastError \|\| 'none'/)
  assert.match(controller, /notice: getDesktopErrorNotice\(error\)/)
  assert.match(controller, /function getDesktopErrorNotice\(error\)/)
  assert.match(controller, /Could not read this Home QR\./)
  assert.match(controller, /Could not read this Profile QR\./)
  assert.match(controller, /Could not join this home\. Trust this friend on this device first\./)
  assert.match(controller, /return 'Something went wrong\.'/)
  assert.equal(controller.includes('notice: error.message'), false)
})

test('desktop primary panes expose short empty states before content arrives', async () => {
  const source = await readDesktopUiSource()
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const presenter = await readFile(
    new URL('../src/desktop-render-presenter.ts', import.meta.url),
    'utf8'
  )
  const styles = await readFile(new URL('../desktop/styles.css', import.meta.url), 'utf8')

  assert.match(source, /function ListEmptyState\(/)
  assert.match(source, /visibleMessages\.length === 0 \?/)
  assert.match(source, /<ListEmptyState[\s\S]*title='No messages yet'/)
  assert.match(source, /copy='Send the first line from this desktop\.'/)
  assert.match(source, /<ListEmptyState[\s\S]*title='No messages yet'/)
  assert.match(source, /copy='Choose a trusted contact and send the first message\.'/)
  assert.match(source, /<DirectThreadList[\s\S]*onOpenPeople=\{contactPickerActions\.openPeople\}/)
  assert.match(source, /No message threads yet/)
  assert.match(source, /Open Contacts to scan a profile or accept a friend request\./)
  assert.match(source, /Open Contacts/)
  assert.match(source, /<ListEmptyState[\s\S]*title='No posts yet'/)
  assert.match(source, /const emptyCopy = canPost/)
  assert.match(source, /Write the first post from this desktop\./)
  assert.match(source, /Posts from this home will appear here\./)
  assert.match(source, /copy=\{emptyCopy\}/)
  assert.equal(source.includes('No DMs yet'), false)
  assert.match(styles, /\.listEmpty/)
  assert.match(styles, /\.listEmptyIcon/)
  assert.doesNotMatch(styles, /\.list:empty::before/)
  assert.doesNotMatch(styles, /content:\s*attr\(data-empty\)/)
  assert.doesNotMatch(styles, /\.list:empty::after/)
  assert.doesNotMatch(styles, /content:\s*attr\(data-empty-detail\)/)
  assert.match(presenter, /createDesktopHomeChatViewModel/)
  assert.match(presenter, /createDesktopTreeholeViewModel/)
})

test('desktop panes label live and durable surfaces', async () => {
  const source = await readDesktopUiSource()
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const presenter = await readFile(
    new URL('../src/desktop-render-presenter.ts', import.meta.url),
    'utf8'
  )
  const styles = await readFile(new URL('../desktop/styles.css', import.meta.url), 'utf8')

  for (const text of ['Live home chat', 'Chat', 'Treehole']) {
    assert.match(source, new RegExp(text), `${text} is missing`)
  }

  assert.match(source, /id='dmTab'[\s\S]*title=\{getProductSurfaceTitle\('dm'\)\}/)
  assert.match(source, /label=\{getProductSurfaceLabel\('dm'\)\}/)
  assert.match(source, /id='treeholeTab'[\s\S]*title=\{getProductSurfaceTitle\('treehole'\)\}/)
  assert.match(source, /label=\{getProductSurfaceLabel\('treehole'\)\}/)
  assert.match(source, /aria-label='Chat'/)
  assert.equal(source.includes("aria-label='Direct messages'"), false)
  assert.match(source, /aria-label='Treehole posts'/)
  assert.equal(source.includes("aria-label='My treehole posts'"), false)
  assert.match(source, /function DirectThreadList\(/)
  assert.match(source, /id='messageThreadList'/)
  assert.match(source, /aria-label=\{`Open message thread \$\{thread\.label\}`\}/)
  assert.match(source, /aria-pressed=\{selected\}/)
  assert.match(source, /onClick=\{\(\) => onSelect\(thread\.profileId\)\}/)
  assert.match(source, /ariaLabel=\{`Open \$\{thread\.label\} profile`\}/)
  assert.match(source, /onClick=\{\(\) => onOpenProfile\(thread\.profileId\)\}/)
  assert.match(source, /<DirectPane[\s\S]*onOpenProfile=\{model\.peopleActions\.openProfile\}/)
  assert.match(source, /<DirectPane[\s\S]*requestTarget=\{model\.profileRequestTarget\}/)
  assert.match(source, /function ProfileRequestTargetCard\(/)
  assert.match(source, /id='profileRequestTargetCard'/)
  assert.match(source, /<ProfileAvatar avatar=\{requestTarget\.avatar\} \/>/)
  assert.match(source, /Friend request/)
  assert.match(source, /Write a message below to send the request\./)
  assert.match(source, /onClick=\{\(\) => onOpenProfile\(requestTarget\.profileId\)\}/)
  assert.match(source, /<DirectThreadList[\s\S]*onOpenProfile=\{onOpenProfile\}/)
  assert.match(source, /<DirectThreadList[\s\S]*threads=\{threads\}/)
  assert.match(source, /setDirectThreads\(threads = \[\]\)/)
  assert.match(presenter, /ui\?\.setDirectThreads\([\s\S]*createDmThreadListView/)
  assert.match(presenter, /messages: \(dmSession\?\.messages \|\| \[\]\) as DirectMessages/)
  assert.doesNotMatch(source, /<span className='railLabel'>/)
  assert.equal(source.includes("<span className='railLabel'>DM</span>"), false)
  assert.match(source, /icon=\{<House size=\{20\} \/>\}/)
  assert.match(source, /Send message/)
  assert.equal(source.includes('Send DM'), false)
  assert.match(
    source,
    /const selected = contact\.profileId === selectedProfileId \|\| contact\.isSelected/
  )
  assert.match(source, /aria-label=\{`Message recipient \$\{contact\.alias\}`\}/)
  assert.match(source, /aria-pressed=\{selected\}/)
  assert.match(
    source,
    /className=\{selected \? 'contactButton activeContactButton' : 'contactButton'\}/
  )
  assert.match(source, /selectedProfileId=\{composer\.toProfileId\.trim\(\)\}/)
  assert.doesNotMatch(controller, /els\.dmRecipientInput\.addEventListener/)
  assert.match(presenter, /createDesktopDirectContactPickerViewModel/)
  assert.equal(controller.includes('button.title = contact.profileId'), false)
  assert.match(styles, /\.paneLabel/)
  assert.match(styles, /\.paneEyebrow/)
  assert.match(styles, /\.paneTitle/)
  assert.match(styles, /\.activeContactButton/)
})

test('desktop requested message thread rows expose request actions', async () => {
  const panes = await readFile(new URL('../desktop/pane-components.tsx', import.meta.url), 'utf8')
  const viewModel = await readFile(new URL('../src/dm-thread-list.ts', import.meta.url), 'utf8')
  const directPane = panes.slice(
    panes.indexOf('export function DirectPane('),
    panes.indexOf('function DirectThreadHeader(')
  )
  const threadList = panes.slice(
    panes.indexOf('function DirectThreadList('),
    panes.indexOf('function ProfileAvatar(')
  )

  assert.match(viewModel, /const requestActions = createThreadRequestActions\(thread, messages\)/)
  assert.match(viewModel, /export function findSelectedDmThreadView/)
  assert.match(directPane, /const selectedThread = findSelectedDmThreadView\(/)
  assert.doesNotMatch(panes, /function findSelectedDirectThread\(/)
  assert.match(directPane, /<DirectThreadList[\s\S]*onAccept=\{messageActions\.acceptMessage\}/)
  assert.match(directPane, /<DirectThreadList[\s\S]*onIgnore=\{messageActions\.ignoreMessage\}/)
  assert.match(threadList, /const requestActions = thread\.requestActions/)
  assert.match(
    threadList,
    /ariaLabel=\{`Ignore friend request from \$\{thread\.label\}`\}[\s\S]*onIgnore\(requestActions\.ignoreMessage\)[\s\S]*variant='ignore'/
  )
  assert.match(
    threadList,
    /ariaLabel=\{`Accept friend request from \$\{thread\.label\}`\}[\s\S]*onAccept\(requestActions\.acceptMessage\)[\s\S]*variant='accept'/
  )
  assert.equal(threadList.includes('message request from'), false)
})

test('desktop message thread rows can show unread badges', async () => {
  const panes = await readFile(new URL('../desktop/pane-components.tsx', import.meta.url), 'utf8')
  const styles = await readFile(new URL('../desktop/styles.css', import.meta.url), 'utf8')
  const threadList = panes.slice(
    panes.indexOf('function DirectThreadList('),
    panes.indexOf('function ProfileAvatar(')
  )

  assert.match(panes, /unreadCount\?: number/)
  assert.match(threadList, /thread\.unreadCount/)
  assert.match(threadList, /threadUnreadBadge/)
  assert.match(styles, /\.threadUnreadBadge/)
})

test('desktop profile avatars render real image snapshots when available', async () => {
  const panes = await readFile(new URL('../desktop/pane-components.tsx', import.meta.url), 'utf8')
  const people = await readFile(
    new URL('../desktop/people-components.tsx', import.meta.url),
    'utf8'
  )

  assert.match(panes, /imageUri\?: string/)
  assert.match(panes, /avatar\?\.imageUri[\s\S]*<img[\s\S]*src=\{avatar\.imageUri\}/)
  assert.match(people, /imageUri\?: string/)
  assert.match(people, /avatar\?\.imageUri[\s\S]*<img[\s\S]*src=\{avatar\.imageUri\}/)
})

test('desktop message rows separate metadata from readable message bodies', async () => {
  const source = await readDesktopUiSource()
  const styles = await readFile(new URL('../desktop/styles.css', import.meta.url), 'utf8')

  assert.match(source, /className='messageMetaRow'/)
  assert.match(source, /className='messageText'/)
  assert.match(source, /className='postText'/)
  assert.match(styles, /\.messageMetaRow/)
  assert.match(styles, /\.messageText/)
  assert.match(styles, /\.postText/)
  assert.match(styles, /\.outgoing \.messageText/)
  assert.match(styles, /\.incoming \.messageText/)
})

test('desktop rail keeps current view accessible', async () => {
  const source = await readDesktopUiSource()
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const presenter = await readFile(
    new URL('../src/desktop-render-presenter.ts', import.meta.url),
    'utf8'
  )

  assert.match(source, /function RailButton\(/)
  assert.match(source, /onClick=\{onSelect\}/)
  assert.doesNotMatch(controller, /els\.chatTab\.addEventListener/)
  assert.match(source, /role='tablist'/)
  assert.match(source, /role='tab'/)
  assert.match(source, /aria-selected=\{isActive\}/)
  assert.doesNotMatch(source, /aria-current=\{isActive \? 'page' : undefined\}/)
  assert.match(source, /className=\{isActive \? 'railButton active' : 'railButton'\}/)
  assert.match(presenter, /ui\?\.setActiveTab\(state\.activeTab\)/)
  assert.doesNotMatch(controller, /function updateTabCurrentState\(\)/)
})

test('desktop rail surfaces pending direct and people work without changing navigation shape', async () => {
  const app = await readDesktopAppSource()
  const shell = await readFile(new URL('../desktop/shell-components.tsx', import.meta.url), 'utf8')
  const styles = await readFile(new URL('../desktop/styles.css', import.meta.url), 'utf8')

  assert.match(
    app,
    /const navBadges = \{[\s\S]*direct: model\.directMessages\.filter\(\(message\) => message\.actions\)\.length,[\s\S]*people: model\.people\.messageRequests\.length \+ \(model\.people\.outgoingRequests \|\| \[\]\)\.length[\s\S]*\}/
  )
  assert.match(app, /<AppRail[\s\S]*navBadges=\{navBadges\}/)
  assert.match(
    shell,
    /id='dmTab'[\s\S]*badgeCount=\{navBadges\.direct\}[\s\S]*id='peopleTab'[\s\S]*badgeCount=\{navBadges\.people\}[\s\S]*id='treeholeTab'/
  )
  assert.match(shell, /function RailButton\(/)
  assert.match(shell, /aria-label=\{getRailButtonLabel\(label, badgeCount\)\}/)
  assert.doesNotMatch(shell, /className='railLabel'/)
  assert.match(shell, /function getRailButtonLabel\(label: string, badgeCount: number\): string \{/)
  assert.match(shell, /return `\$\{label\}, \$\{badgeCount\} pending`/)
  assert.match(
    shell,
    /<span className='railBadge' aria-label=\{`\$\{label\} pending \$\{badgeCount\}`\}>/
  )
  assert.match(shell, /\{badgeCount > 99 \? '99\+' : badgeCount\}/)
  assert.match(styles, /\.railButton\s*\{[\s\S]*position: relative/)
  assert.match(styles, /\.railBadge\s*\{[\s\S]*min-width: 20px/)
  assert.match(styles, /\.railBadge\s*\{[\s\S]*position: absolute/)
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
  const source = await readDesktopUiSource()
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const bindings = await readFile(
    new URL('../src/desktop-ui-action-bindings.ts', import.meta.url),
    'utf8'
  )
  const presenter = await readFile(
    new URL('../src/desktop-render-presenter.ts', import.meta.url),
    'utf8'
  )
  const styles = await readFile(new URL('../desktop/styles.css', import.meta.url), 'utf8')

  assert.match(source, /className='contactEmpty'/)
  assert.match(source, /<UserPlus size=\{18\} \/>/)
  assert.match(source, /className='contactEmptyIcon'/)
  assert.match(source, /\{empty\.title\}/)
  assert.match(source, /\{empty\.copy\}/)
  assert.match(source, /\{empty\.actionLabel\}/)
  assert.match(source, /className='smallButton contactEmptyAction'/)
  assert.match(source, /onClick=\{actions\.openPeople\}/)
  assert.match(bindings, /openPeople: \(\) => setTab\('people'\)/)
  assert.match(presenter, /createDesktopDirectContactPickerViewModel/)
  assert.match(styles, /\.contactEmpty/)
  assert.match(styles, /\.contactEmptyIcon/)
  assert.match(styles, /\.contactEmptyAction/)
})

test('desktop treehole composer has an explicit owner-only disabled state', async () => {
  const source = await readDesktopUiSource()
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const presenter = await readFile(
    new URL('../src/desktop-render-presenter.ts', import.meta.url),
    'utf8'
  )
  const styles = await readFile(new URL('../desktop/styles.css', import.meta.url), 'utf8')

  assert.match(source, /id='treeholePostPolicy'/)
  assert.match(source, /Only the owner can post here\./)
  assert.match(
    source,
    /className=\{[\s\S]*controls\.canPostTreehole \? 'composer tall' : 'composer tall disabledComposer'[\s\S]*\}/
  )
  assert.match(source, /hidden=\{controls\.canPostTreehole\}/)
  assert.match(source, /disabled=\{!controls\.canPostTreehole\}/)
  assert.match(presenter, /canPostTreehole: Boolean\(state\.treeholeCanPost\)/)
  assert.doesNotMatch(controller, /els\.treeholeForm\.classList\.toggle\('disabledComposer'/)
  assert.doesNotMatch(controller, /els\.treeholeInput\.disabled =/)
  assert.doesNotMatch(controller, /els\.treeholePostPolicy\.hidden =/)
  assert.match(styles, /\.disabledComposer/)
})

test('desktop treehole comment composer disables empty comments', async () => {
  const source = await readDesktopUiSource()
  const panes = await readFile(new URL('../desktop/pane-components.tsx', import.meta.url), 'utf8')
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const bindings = await readFile(
    new URL('../src/desktop-ui-action-bindings.ts', import.meta.url),
    'utf8'
  )

  assert.match(source, /function TreeholePostActions\(/)
  assert.match(source, /const \[draft, setDraft\] = useState\(''\)/)
  assert.match(source, /const hasDraft = Boolean\(draft\.trim\(\)\)/)
  assert.match(
    source,
    /actions\.commentPost\(\{ postId: post\.actions\.commentPostId, text: draft\.trim\(\) \}\)/
  )
  assert.match(source, /setDraft\(''\)/)
  assert.match(
    panes,
    /<ActionButton[\s\S]*className='smallButton'[\s\S]*icon=\{<Heart size=\{15\} \/>\}[\s\S]*label='Like'[\s\S]*actions\.likePost\(post\.actions\.likePostId\)/
  )
  assert.match(
    panes,
    /<ComposerSubmitButton[\s\S]*className='smallButton'[\s\S]*disabled=\{!hasDraft\}[\s\S]*icon=\{<MessageCircle size=\{15\} \/>\}[\s\S]*label='Comment'/
  )
  assert.match(
    bindings,
    /commentPost: \(\{ postId, text \}\) => dispatchCommand\('commentTreehole'/
  )
})

test('desktop treehole author rows show generated avatars', async () => {
  const panes = await readFile(new URL('../desktop/pane-components.tsx', import.meta.url), 'utf8')
  const viewModel = await readFile(
    new URL('../src/desktop-treehole-view-model.ts', import.meta.url),
    'utf8'
  )
  const treeholeList = panes.slice(
    panes.indexOf('function TreeholeList('),
    panes.indexOf('function ListEmptyState(')
  )

  assert.match(viewModel, /createProfileAvatarViewModel/)
  assert.match(viewModel, /authorAvatar: createTreeholeAuthorAvatar\(post\)/)
  assert.match(viewModel, /authorAvatar: createTreeholeAuthorAvatar\(comment\)/)
  assert.match(treeholeList, /<ProfileAvatar avatar=\{post\.authorAvatar\} \/>/)
  assert.match(treeholeList, /<ProfileAvatar avatar=\{comment\.authorAvatar\} \/>/)
  assert.match(treeholeList, /className='postAuthorRow'/)
  assert.match(treeholeList, /className='commentAuthorRow'/)
})

test('desktop composers disable unavailable sends', async () => {
  const source = await readDesktopUiSource()
  const panes = await readFile(new URL('../desktop/pane-components.tsx', import.meta.url), 'utf8')
  const shared = await readFile(new URL('../desktop/ui-components.tsx', import.meta.url), 'utf8')
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const presenter = await readFile(
    new URL('../src/desktop-render-presenter.ts', import.meta.url),
    'utf8'
  )

  for (const id of ['chatSendButton', 'dmSendButton', 'treeholeSendButton']) {
    assert.match(source, new RegExp(`id='${id}'`), `${id} is missing`)
  }

  assert.match(
    shared,
    /export function ComposerSubmitButton\(\{[\s\S]*className,[\s\S]*disabled,[\s\S]*icon,[\s\S]*id,[\s\S]*label[\s\S]*\}: Pick<ActionButtonProps/
  )
  assert.match(shared, /export function ActionButton\(/)
  assert.match(shared, /aria-label=\{ariaLabel\}/)
  assert.match(shared, /autoFocus=\{autoFocus\}/)
  assert.match(shared, /className=\{cx\('btn btn-primary min-h-9 rounded-md', className\)\}/)
  assert.match(shared, /className='btn btn-sm smallButton'/)
  assert.match(
    shared,
    /<ActionButton[\s\S]*className=\{className\}[\s\S]*disabled=\{disabled\}[\s\S]*icon=\{icon\}[\s\S]*id=\{id\}[\s\S]*label=\{label\}[\s\S]*type='submit'/
  )
  assert.match(panes, /<ComposerSubmitButton[\s\S]*id='chatSendButton'[\s\S]*label='Send'/)
  assert.match(panes, /<ComposerSubmitButton[\s\S]*id='dmSendButton'[\s\S]*label='Send message'/)
  assert.match(panes, /<ComposerSubmitButton[\s\S]*id='treeholeSendButton'[\s\S]*label='Post'/)
  assert.match(presenter, /ui\?\.setControls\(\{/)
  assert.match(
    source,
    /const canSend = controls\.canUseHomeChatComposer && Boolean\(draft\.trim\(\)\)/
  )
  assert.match(panes, /<ComposerSubmitButton[\s\S]*disabled=\{!canSend\}/)
  assert.match(
    source,
    /const canSend =[\s\S]*controls\.canUseDirectComposer &&[\s\S]*Boolean\(composer\.text\.trim\(\)\) &&[\s\S]*Boolean\(composer\.toProfileId\.trim\(\)\)/
  )
  assert.match(source, /const canPost = controls\.canPostTreehole && Boolean\(draft\.trim\(\)\)/)
  assert.match(panes, /<ComposerSubmitButton[\s\S]*disabled=\{!canPost\}/)
  assert.match(presenter, /canUseHomeChatComposer: inRoom/)
  assert.match(presenter, /const hasDmSession = Boolean\(dmSession\)/)
  assert.match(presenter, /canUseDirectComposer: hasDmSession && !isActionPending/)
  assert.doesNotMatch(controller, /canSendDirectMessage:/)
  assert.match(presenter, /canPostTreehole: Boolean\(state\.treeholeCanPost\)/)
})

test('desktop context actions disable unavailable joins and trust', async () => {
  const source = await readDesktopUiSource()
  const context = await readFile(
    new URL('../desktop/context-components.tsx', import.meta.url),
    'utf8'
  )
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const presenter = await readFile(
    new URL('../src/desktop-render-presenter.ts', import.meta.url),
    'utf8'
  )

  assert.match(source, /const ROOM_KEY_PATTERN = \/\^\[0-9a-f\]\{64\}\$\//)
  assert.match(presenter, /ui\?\.setControls\(\{/)
  assert.doesNotMatch(controller, /els\.roomKeyInput\.addEventListener/)
  assert.doesNotMatch(controller, /els\.homeQrInput\.addEventListener/)
  assert.doesNotMatch(controller, /els\.trustQrInput\.addEventListener/)
  assert.match(source, /const canJoinManualHome =[\s\S]*controls\.canUseManualHomeJoin/)
  assert.match(source, /const canJoinHomeQr =[\s\S]*controls\.canUseHomeQrJoin/)
  assert.match(source, /const canTrustProfile =[\s\S]*controls\.canUseTrustProfile/)
  assert.match(context, /<ActionButton[\s\S]*disabled=\{!canJoinManualHome\}/)
  assert.match(context, /<ActionButton[\s\S]*disabled=\{!canJoinHomeQr\}/)
  assert.match(context, /<ActionButton[\s\S]*disabled=\{!canTrustProfile\}/)
  assert.match(presenter, /canUseManualHomeJoin: !isActionPending && !inRoom/)
  assert.match(presenter, /canUseHomeQrJoin: !isActionPending && !inRoom/)
  assert.match(presenter, /canUseTrustProfile: !isActionPending/)
})

test('desktop context actions expose a pending lock during blocking commands', async () => {
  const source = await readDesktopUiSource()
  const controller = await readFile(new URL('../desktop/controller.js', import.meta.url), 'utf8')
  const dispatcher = await readFile(
    new URL('../src/desktop-command-dispatcher.ts', import.meta.url),
    'utf8'
  )
  const presenter = await readFile(
    new URL('../src/desktop-render-presenter.ts', import.meta.url),
    'utf8'
  )

  assert.match(controller, /const BLOCKING_COMMANDS = new Set\(\[/)
  for (const command of ['joinHome', 'joinHomeUri', 'leaveHome', 'prepareProfileRequestTarget']) {
    assert.match(controller, new RegExp(`'${command}'`), `${command} is not pending-locked`)
  }
  assert.match(controller, /createDesktopCommandDispatcher/)
  assert.match(controller, /commandDispatcher\.dispatch\(command, payload\)/)
  assert.match(controller, /pendingCommand: commandDispatcher\.getPendingCommand\(\)/)
  assert.match(dispatcher, /if \(blocking && pendingCommand\) return/)
  assert.match(dispatcher, /await backendClient\.dispatch\(command, payload\)/)
  assert.match(dispatcher, /onError\(error\)/)
  assert.match(dispatcher, /pendingCommand = null/)
  assert.match(source, /document\.body\.setAttribute\('aria-busy', String\(isShellBusy\)\)/)
  assert.match(presenter, /ui\?\.setShellBusy\(isActionPending\)/)
  assert.match(
    source,
    /<ActionButton[\s\S]*disabled=\{!controls\.canLeaveHome\}[\s\S]*icon=\{<LogOut size=\{17\} \/>\}[\s\S]*id='leaveButton'[\s\S]*label='Leave'[\s\S]*onClick=\{onLeave\}/
  )
  assert.match(source, /disabled=\{!controls\.canCreateHome\}/)
  assert.match(presenter, /canLeaveHome: inRoom && !isActionPending/)
  assert.match(presenter, /canCreateHome: !inRoom && !isActionPending/)
  assert.match(presenter, /canUseManualHomeJoin: !isActionPending && !inRoom/)
  assert.match(presenter, /canUseHomeQrJoin: !isActionPending && !inRoom/)
  assert.match(presenter, /canUseTrustProfile: !isActionPending/)
})

test('desktop direct messages show generated sender avatars', async () => {
  const panes = await readFile(new URL('../desktop/pane-components.tsx', import.meta.url), 'utf8')
  const viewModel = await readFile(
    new URL('../src/desktop-direct-view-model.ts', import.meta.url),
    'utf8'
  )
  const directMessageList = panes.slice(
    panes.indexOf('function DirectMessageList('),
    panes.indexOf('function DirectContactPicker(')
  )

  assert.match(viewModel, /createProfileAvatarViewModel/)
  assert.match(
    viewModel,
    /avatar: createDirectMessageAvatar\(message, \{ contactBook, contacts, resolveAvatarMediaUri \}\)/
  )
  assert.match(directMessageList, /<ProfileAvatar avatar=\{message\.avatar\} \/>/)
  assert.match(directMessageList, /className='directMessageContent'/)
})

test('desktop direct contact picker shows trusted contact avatars', async () => {
  const panes = await readFile(new URL('../desktop/pane-components.tsx', import.meta.url), 'utf8')
  const viewModel = await readFile(
    new URL('../src/desktop-direct-contact-picker-view-model.ts', import.meta.url),
    'utf8'
  )
  const picker = panes.slice(
    panes.indexOf('function DirectContactPicker('),
    panes.indexOf('function TreeholeList(')
  )

  assert.match(viewModel, /createProfileAvatarViewModel/)
  assert.match(viewModel, /avatarUri: contact\.avatarUriSnapshot/)
  assert.match(picker, /<ProfileAvatar avatar=\{contact\.avatar\} \/>/)
})

test('desktop UI uses Tailwind and daisyUI through Kepos component boundaries', async () => {
  const context = await readFile(
    new URL('../desktop/context-components.tsx', import.meta.url),
    'utf8'
  )
  const panes = await readFile(new URL('../desktop/pane-components.tsx', import.meta.url), 'utf8')
  const people = await readFile(
    new URL('../desktop/people-components.tsx', import.meta.url),
    'utf8'
  )
  const shared = await readFile(new URL('../desktop/ui-components.tsx', import.meta.url), 'utf8')
  const tailwind = await readFile(
    new URL('../desktop/tailwind.source.css', import.meta.url),
    'utf8'
  )
  const index = await readFile(new URL('../desktop/index.html', import.meta.url), 'utf8')

  assert.match(index, /<link rel="stylesheet" href="\.\/tailwind\.css" \/>/)
  assert.match(tailwind, /@import 'tailwindcss';/)
  assert.match(tailwind, /@plugin 'daisyui'/)
  assert.match(tailwind, /@plugin 'daisyui\/theme'/)
  assert.match(tailwind, /name: 'light'/)
  assert.match(tailwind, /name: 'dark'/)
  assert.match(shared, /className=\{cx\('btn btn-primary min-h-9 rounded-md', className\)\}/)
  assert.match(shared, /badge badge-sm badge-outline/)
  assert.match(context, /className='panel compactPanel card border border-base-300/)
  assert.match(context, /className='input input-bordered input-sm/)
  assert.match(context, /className='textarea textarea-bordered compactArea/)
  assert.match(context, /className='advanced collapse collapse-arrow/)
  assert.match(panes, /className='composer border-base-300 bg-base-100\/80'/)
  assert.match(panes, /className=\{cx\('item card border border-base-300 shadow-sm'/)
  assert.match(panes, /className='listEmpty rounded-lg border border-dashed border-base-300/)
  assert.match(people, /className='panel contactsPanel card border border-base-300/)
  assert.match(people, /className='badge badge-success badge-sm/)
})

test('desktop shell exposes Neo Cozy light and Indie Console dark themes', async () => {
  const source = await readDesktopUiSource()
  const shell = await readFile(new URL('../desktop/shell-components.tsx', import.meta.url), 'utf8')
  const styles = await readFile(new URL('../desktop/styles.css', import.meta.url), 'utf8')

  assert.match(source, /id='lightThemeButton'/)
  assert.match(source, /id='darkThemeButton'/)
  assert.match(shell, /function ThemeButton\(/)
  assert.match(shell, /className=\{active \? 'themeButton active' : 'themeButton'\}/)
  assert.match(shell, /aria-pressed=\{active\}/)
  assert.match(
    shell,
    /<ThemeButton[\s\S]*active=\{theme === 'light'\}[\s\S]*icon=\{<Sun size=\{15\} \/>\}[\s\S]*id='lightThemeButton'[\s\S]*label='Light'[\s\S]*setTheme\('light'\)[\s\S]*title='Neo Cozy light'/
  )
  assert.match(
    shell,
    /<ThemeButton[\s\S]*active=\{theme === 'dark'\}[\s\S]*icon=\{<Moon size=\{15\} \/>\}[\s\S]*id='darkThemeButton'[\s\S]*label='Dark'[\s\S]*setTheme\('dark'\)[\s\S]*title='Indie Console dark'/
  )
  assert.match(source, /data-theme/)
  assert.match(source, /kepos\.desktop\.theme/)
  assert.match(styles, /:root/)
  assert.match(styles, /--surface:\s*#f3efe5/)
  assert.match(styles, /\[data-theme='dark'\]/)
  assert.match(styles, /--surface:\s*#171d33/)
  assert.match(styles, /--accent:\s*#ffcf3d/)
})
