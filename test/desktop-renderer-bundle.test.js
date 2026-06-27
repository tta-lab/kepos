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
