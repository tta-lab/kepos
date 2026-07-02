import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

function readText(path) {
  return readFile(new URL(path, import.meta.url), 'utf8')
}

async function assertReferencedDocsExist(sourcePath) {
  const source = await readText(sourcePath)
  const referencedDocs = new Set(
    [...source.matchAll(/docs\/[A-Za-z0-9._/-]+\.(?:md|html)/g)].map((match) => match[0])
  )

  assert.notEqual(referencedDocs.size, 0, `${sourcePath} should reference docs`)

  for (const docPath of referencedDocs) {
    await readText(`../${docPath}`)
  }
}

test('project direction doc reflects the current V1 evidence and user loop', async () => {
  const direction = await readText('../docs/00-project-direction.md')

  assert.match(direction, /as of 2026-07-02/)
  assert.match(direction, /`npm run v1:gate` has passed/)
  assert.match(direction, /902 Node tests/)
  assert.match(direction, /`npm run android:assemble:release` has passed/)
  assert.match(direction, /Profile QR friend-request targets/)
  assert.match(direction, /Desktop Pear\/Bare smoke covers the bundled worker bridge/)
  assert.match(direction, /send a friend request/)
  assert.match(direction, /open the durable Chat thread/)
  assert.match(direction, /enter the trusted contact's Home explicitly/)
  assert.match(direction, /remove a friend and see future access stop/)
  assert.doesNotMatch(direction, /230 tests/)
  assert.doesNotMatch(direction, /scan a friend's profile QR\s+3\. trust them/)
  assert.doesNotMatch(direction, /read or write treehole interaction/)
})

test('feature overview describes the current V1 MLP instead of the old room prototype', async () => {
  const overview = await readText('../docs/v1.30-kepos-features.html')

  assert.match(overview, /Kepos \/ V1 MLP/)
  assert.match(overview, /Profile QR 好友请求/)
  assert.match(overview, /持久 Chat/)
  assert.match(overview, /Contacts 和撤销/)
  assert.match(overview, /显式进入 Home/)
  assert.match(overview, /Treehole \/ Recent posts/)
  assert.match(overview, /npm run v1:gate/)
  assert.match(overview, /normal path release proof/)
  assert.doesNotMatch(overview, /current prototype/)
  assert.doesNotMatch(overview, /32-byte room key/)
  assert.doesNotMatch(overview, /正式邀请流还没有进入当前实现/)
  assert.doesNotMatch(overview, /消息历史持久化和产品级同步体验/)
})

test('docs maps only reference local docs that exist', async () => {
  await assertReferencedDocsExist('../AGENTS.md')
  await assertReferencedDocsExist('../docs/moc.md')
})

test('V1 architecture docs describe the Pear Bare bridge as app-smoke proven', async () => {
  const architecture = await readText('../docs/v1.11-mlp-desktop-react-architecture.md')
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')

  assert.doesNotMatch(architecture, /Current status: pending\./)
  assert.doesNotMatch(architecture, /pending Bare bridge/)
  assert.doesNotMatch(audit, /next implementation phase should be the desktop backend bridge/i)
  assert.doesNotMatch(audit, /Extend Pear\/Bare desktop smoke beyond Home create/)
  assert.doesNotMatch(
    audit,
    /move the desktop runtime behind the preload\/main\/Bare worker bridge/
  )
  assert.match(architecture, /smoke:desktop:pear/)
  assert.match(audit, /smoke:desktop:pear/)
})

test('V1 docs no longer describe JSX as the current UI source shape', async () => {
  const docs = [
    await readText('../AGENTS.md'),
    await readText('../docs/moc.md'),
    await readText('../docs/00-project-direction.md'),
    await readText('../docs/v1.01-dependency-order.md'),
    await readText('../docs/v1.16-final-mlp-ui-ux-refactor.md')
  ].join('\n')

  assert.doesNotMatch(docs, /JS\/JSX\/MJS/)
  assert.doesNotMatch(docs, /mobile\/App\.tsx` is still a large entry file/)
  assert.match(docs, /React UI source should be TSX/)
  assert.match(docs, /mobile\s+rendering has been split into typed TSX component slices/)
})

test('V1 docs map points agents to the current ready checklist and smoke recipes', async () => {
  const agents = await readText('../AGENTS.md')
  const moc = await readText('../docs/moc.md')
  const profileFirst = await readText(
    '../docs/v1-friend-home-architecture/05-profile-first-next-plan.md'
  )
  const docs = `${agents}\n${moc}\n${profileFirst}`

  for (const path of [
    'docs/v1.16-final-mlp-ui-ux-refactor.md',
    'docs/v1.17-ready-im-completion-plan.md',
    'docs/v1-friend-home-architecture/12-v1-profile-first-implementation-next-plan.md',
    'docs/v1-friend-home-architecture/14-v1-product-logic-unification-next-plan.md',
    'docs/v1-friend-home-architecture/17-v1-profile-routed-im-next-plan.md',
    'docs/v1-friend-home-architecture/18-v1-profile-p2p-hardening-next-plan.md',
    'docs/v1-friend-home-architecture/19-v1-profile-social-delivery-next-plan.md',
    'docs/v1-friend-home-architecture/20-v1-profile-social-completion-next-plan.md',
    'docs/v1.20-smoke-guide.md',
    'docs/v1.21-cross-device-smoke.md'
  ]) {
    assert.match(docs, new RegExp(path.replaceAll('.', '\\.')))
  }

  assert.match(docs, /canonical V1 completion evidence checklist/)
  assert.match(docs, /proven desktop worker bridge/)
  assert.match(docs, /remaining release-proof risk/)
  assert.doesNotMatch(docs, /remaining desktop worker bridge/)
  assert.doesNotMatch(docs, /start architecture migration/)
  assert.match(docs, /manual smoke checklist for V1 parity/)
  assert.match(docs, /agent recipe for desktop\/Android gates/)
  assert.match(agents, /final V1 release proof packet/)
  assert.match(agents, /tmp\/final-v1-proof\.md/)
  assert.match(moc, /final V1 release proof packet/)
  assert.match(moc, /tmp\/final-v1-proof\.md/)
  assert.match(docs, /Use this as the checklist before starting V2 or calling V1 ready/)
  assert.match(docs, /Previous V1 profile-routed IM next plan/)
  assert.match(docs, /Previous V1 profile P2P hardening next plan/)
  assert.match(docs, /Previous V1 profile social delivery next plan/)
  assert.match(docs, /Active V1 profile social completion next plan/)
  assert.match(docs, /profile-routed private IM/)
  assert.match(docs, /profile-to-profile P2P route/)
  assert.match(docs, /Profile is the social address/)
  assert.match(docs, /low-cost proof/)
  assert.match(profileFirst, /12-v1-profile-first-implementation-next-plan\.md/)
  assert.match(profileFirst, /13-v1-home-decoupling-next-plan\.md/)
  assert.match(profileFirst, /14-v1-product-logic-unification-next-plan\.md/)
  assert.match(profileFirst, /18-v1-profile-p2p-hardening-next-plan\.md/)
  assert.match(profileFirst, /19-v1-profile-social-delivery-next-plan\.md/)
  assert.match(profileFirst, /20-v1-profile-social-completion-next-plan\.md/)
  assert.match(profileFirst, /\.\.\/v1\.21-cross-device-smoke\.md/)
  assert.match(moc, /Prior product-logic unification next plan/)
  assert.doesNotMatch(
    profileFirst,
    /current execution plan has moved on to `08-v1-im-release-next-plan\.md`/
  )
  assert.doesNotMatch(profileFirst, /evidence packet described in `08`/)
})

test('V1 TypeScript boundary docs describe the current TSX migration state', async () => {
  const boundary = await readText('../docs/v1.05-typescript-boundary.md')

  await readText('../src/p2p-room.ts')
  await readText('../src/dm-replication.ts')
  await readText('../src/desktop-backend-session.ts')
  assert.doesNotMatch(boundary, /5` JSX files/)
  assert.doesNotMatch(boundary, /2` TSX files/)
  assert.match(boundary, /no JSX source files remain/)
  assert.match(boundary, /src\/p2p-room\.ts` owns Home room transport/)
  assert.match(boundary, /src\/dm-replication\.ts` owns the signed DM replication channel/)
  assert.match(
    boundary,
    /src\/desktop-backend-session\.ts` owns desktop backend session composition/
  )
  assert.match(boundary, /remaining JavaScript files are entrypoints or platform glue/)
  assert.doesNotMatch(boundary, /src\/p2p-room\.js/)
  assert.doesNotMatch(boundary, /src\/dm-replication\.js/)
  assert.doesNotMatch(boundary, /src\/desktop-backend-session\.js/)
  assert.match(boundary, /mobile\/App\.tsx` is now checked by TypeScript/)
  assert.match(boundary, /Mobile React TSX is the current exception/)
  assert.match(boundary, /`metro\.config\.cjs` maps only\s+local `\.js` specifiers/)
  assert.match(boundary, /Expo\s+Android export/)
  assert.match(boundary, /Bare\/RPC IPC edge behind local narrow types/)
  assert.match(boundary, /src\/mobile-runtime-ids\.ts` owns checked mobile runtime ID helpers/)
  assert.match(boundary, /Home room\s+keys and local message\/thread ids/)
  assert.match(boundary, /secure random byte length/)
  assert.match(boundary, /shared secure-id utility/)
  assert.match(boundary, /src\/mobile-profile-bootstrap\.ts` owns checked mobile profile bootstrap/)
  assert.match(boundary, /backend storage base-path setup/)
  assert.match(boundary, /durable\s+document-directory selection/)
  assert.match(boundary, /identity restore\/create/)
  assert.match(boundary, /recent-post cache restore/)
  assert.match(boundary, /initial\s+treehole policy derivation/)
  assert.match(boundary, /src\/rpc-payload\.ts` owns checked RPC request payload decoding/)
  assert.match(boundary, /empty request data handling/)
  assert.match(boundary, /byte-to-string decoding through\s+`b4a`/)
  assert.match(boundary, /JSON parsing/)
  assert.match(boundary, /mobile\/styles\.ts` owns checked React Native style creation/)
  assert.match(boundary, /StyleSheet\.create/)
  assert.match(boundary, /Android status-bar top padding/)
  assert.match(boundary, /shared tab badge styles/)
  assert.match(boundary, /avatar tone colors/)
  assert.match(boundary, /typed `success`, `warning`,\s+and `info` tokens/)
  assert.match(boundary, /mobile\/qr-components\.tsx` owns checked QR card rendering/)
  assert.match(
    boundary,
    /mobile\/panel-components\.tsx` owns checked panel empty states, pane labels, and\s+task headers/
  )
  assert.match(
    boundary,
    /mobile\/profile-components\.tsx` owns checked avatar rendering, Chat\s+recipient contact chips, and the Profile QR request-target card/
  )
  assert.match(boundary, /Contact profile detail rendering/)
  assert.match(boundary, /recent-post rows/)
  assert.match(boundary, /collapsible advanced identity\s+fingerprint/)
  assert.match(
    boundary,
    /mobile\/action-components\.tsx` owns checked mobile request action buttons/
  )
  assert.match(boundary, /shared primary\/secondary setup action buttons/)
  assert.match(boundary, /shared composer send buttons for Home,\s+Chat, and Treehole/)
  assert.match(boundary, /shared\s+small trust\/treehole action buttons/)
  assert.match(boundary, /top-bar icon-only controls/)
  assert.match(boundary, /QR scanner\s+cancel action/)
  assert.match(boundary, /Advanced toggles\s+for Home and Chat debug panels/)
  assert.match(boundary, /mobile\/setup-components\.tsx` owns checked Quick Start panel/)
  assert.match(boundary, /name\/avatar\s+fields/)
  assert.match(boundary, /inline My QR reveal state/)
  assert.match(boundary, /mobile\/lobby-components\.tsx` owns checked pre-Home lobby composition/)
  assert.match(boundary, /Advanced manual home-key join/)
  assert.match(boundary, /manual direct\s+endpoint input/)
  assert.match(boundary, /Contacts panel reveal state/)
  assert.match(boundary, /not-yet-in-Home entry layout/)
  assert.match(
    boundary,
    /mobile\/message-components\.tsx` owns checked Home chat pane rendering and Home\s+and Chat bubble rendering/
  )
  assert.match(boundary, /Home\s+composer input\/send controls/)
  assert.match(boundary, /direct sender avatars/)
  assert.match(boundary, /incoming message request actions/)
  assert.match(boundary, /mobile\/direct-components\.tsx` owns checked Chat pane composition/)
  assert.match(boundary, /selected thread header/)
  assert.match(boundary, /visible message filtering/)
  assert.match(boundary, /zero-contact Contacts entry/)
  assert.match(boundary, /manual recipient debug toggle/)
  assert.match(boundary, /Chat composer/)
  assert.doesNotMatch(boundary, /DM composer/)
  assert.match(boundary, /mobile\/form-components\.tsx` owns checked text field rendering/)
  assert.match(boundary, /TextInput defaults/)
  assert.match(
    boundary,
    /mobile\/thread-components\.tsx` owns checked Chat thread header and thread\s+list rendering/
  )
  assert.match(boundary, /unread badges/)
  assert.match(boundary, /message thread time formatting/)
  assert.match(
    boundary,
    /mobile\/empty-components\.tsx` owns checked primary empty-state rendering/
  )
  assert.match(boundary, /Home chat empty copy/)
  assert.match(boundary, /Treehole\s+empty copy selection/)
  assert.match(boundary, /mobile\/tab-components\.tsx` owns checked mobile bottom-tab button/)
  assert.match(boundary, /tab role semantics/)
  assert.match(boundary, /pending\s+badge rendering/)
  assert.match(boundary, /mobile\/room-components\.tsx` owns checked Home room composition/)
  assert.match(boundary, /current-space bar/)
  assert.match(boundary, /Home owner profile action/)
  assert.match(boundary, /room advanced debug panel/)
  assert.match(boundary, /bottom tab wiring/)
  assert.match(boundary, /pane composition/)
  assert.match(
    boundary,
    /mobile\/treehole-components\.tsx` owns checked Treehole pane and post rendering/
  )
  assert.match(boundary, /owner-only\s+post composer copy/)
  assert.match(boundary, /post submit controls/)
  assert.match(boundary, /comment draft state/)
  assert.match(boundary, /Like\/comment actions/)
  assert.match(boundary, /mobile\/chrome-components\.tsx` owns checked mobile app chrome/)
  assert.match(boundary, /polite notice region/)
  assert.match(boundary, /CameraView wiring/)
  assert.match(
    boundary,
    /mobile\/request-components\.tsx` owns checked mobile friend-request manager/
  )
  assert.match(boundary, /outgoing request cards/)
  assert.match(boundary, /accepted\s+message-request payload construction/)
  assert.match(boundary, /mobile\/people-components\.tsx` owns checked Contacts pane composition/)
  assert.match(boundary, /Contacts\s+action controls/)
  assert.match(boundary, /contact-management rendering/)
  assert.match(boundary, /friend-request manager\s+placement/)
  assert.match(boundary, /outgoing request placement/)
  assert.match(boundary, /advanced\s+raw QR controls/)
  assert.match(boundary, /removed\/ignored profile rows/)
  assert.match(boundary, /allow-request actions/)
})

test('V1 docs record real avatar URI snapshot support without overclaiming upload sync', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const completionPlan = await readText('../docs/v1.17-ready-im-completion-plan.md')
  const docs = `${audit}\n${completionPlan}`

  assert.doesNotMatch(docs, /Generated placeholder coverage is done/)
  assert.match(docs, /signed Profile QR payload can carry an optional avatar URI/)
  assert.match(docs, /local profile storage persists the local `avatarUri`/)
  assert.match(docs, /optional\s+`avatarMedia` reference/)
  assert.match(docs, /Android's profile document and runtime bootstrap/)
  assert.match(docs, /desktop and Android\s+both expose a local avatar URI setting/)
  assert.match(docs, /Show My QR emits\s+that avatar URI/)
  assert.match(docs, /ContactBook stores `avatarUriSnapshot`/)
  assert.match(docs, /ContactBook (also )?stores `avatarMediaSnapshot`/)
  assert.match(docs, /Profile QR request-target previews/)
  assert.match(docs, /src\/avatar-media\.ts/)
  assert.match(docs, /src\/avatar-media-storage\.ts/)
  assert.match(docs, /src\/profile-avatar-import\.ts/)
  assert.match(docs, /content-addressed avatar media\s+reference/)
  assert.match(docs, /verified byte-storage/)
  assert.match(docs, /shared import boundary/)
  assert.match(docs, /string file-system adapter/)
  assert.match(docs, /base64/)
  assert.match(docs, /shared b4a-backed default codec/)
  assert.match(docs, /missing or mismatched bytes as absent\s+media/)
  assert.match(docs, /Shared avatar view-models can (now )?prefer/)
  assert.match(docs, /platform-resolved local URI from\s+`avatarMediaSnapshot`/)
  assert.match(docs, /createAvatarMediaUriResolver/)
  assert.match(docs, /Desktop Chat recipient chips/)
  assert.match(docs, /Mobile Chat recipient chips/)
  assert.match(docs, /direct message bubbles/)
  assert.match(docs, /Profile QR request-target previews/)
  assert.match(docs, /limited request-target profile details/)
  assert.match(docs, /downloaded avatar\s+bytes/)
  assert.match(docs, /app-private avatar media storage/)
  assert.match(docs, /Desktop now has a\s+local image picker/)
  assert.match(docs, /Android now has\s+the same local picker\/import path/)
  assert.match(docs, /src\/mobile-profile-avatar-media\.ts/)
  assert.match(docs, /src\/mobile-avatar-media-sync\.ts/)
  assert.match(docs, /src\/avatar-media-sync\.ts/)
  assert.match(docs, /Expo image picker/)
  assert.match(docs, /Desktop Home control now sends local verified avatar bytes/)
  assert.match(docs, /Android Home runtime now uses the same frame/)
  assert.match(docs, /UI\/backend bridge/)
  assert.match(docs, /ContactBook-gated verified storage/)
  assert.match(docs, /verified Home hello/)
  assert.match(docs, /updateAvatarMedia/)
  assert.match(docs, /src\/desktop-profile-avatar-media\.ts/)
  assert.match(docs, /kepos\.trust\.invite\.v1/)
  assert.match(docs, /kepos\.trust\.invite\.v2/)
  assert.match(docs, /tamper-evident/)
  assert.match(docs, /desktop share\s+QR plus Android Show My QR generation pass/)
  assert.match(docs, /Android Show My QR/)
  assert.match(docs, /outgoing friend-request writes/)
  assert.match(docs, /request-sent rows can recover/)
  assert.doesNotMatch(docs, /Android runtime byte sync\s+plus richer versioned snapshots remain/)
  assert.match(docs, /src\/profile-snapshot\.ts/)
  assert.match(docs, /minimal local versioned profile\s+snapshot model/)
  assert.match(docs, /Full signed profile records or profile-feed streaming remain future work/)
})

test('V1 UX docs do not regress avatar media status to placeholder-only', async () => {
  const finalUx = await readText('../docs/v1.16-final-mlp-ui-ux-refactor.md')
  const completionPlan = await readText('../docs/v1.17-ready-im-completion-plan.md')

  assert.doesNotMatch(finalUx, /No real uploaded\/synced avatar field yet/)
  assert.match(finalUx, /Avatar import and first-pass verified Home-control avatar byte sync exist/)
  assert.match(finalUx, /does not claim a full profile-feed protocol/)
  assert.match(finalUx, /generated\s+placeholders remain the fallback/)

  assert.doesNotMatch(
    completionPlan,
    /Android and\s+remaining request-target surfaces should follow/
  )
  assert.match(
    completionPlan,
    /Profile QR request-target previews and limited request-target profile details\s+now share/
  )
})

test('V1 docs record corrupt Recent posts cache fail-closed behavior', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const completionPlan = await readText('../docs/v1.17-ready-im-completion-plan.md')

  assert.match(audit, /Recent posts cache restore now drops corrupt optional\s+cache JSON/)
  assert.match(completionPlan, /Corrupt optional Recent posts cache data is dropped/)
  assert.match(`${audit}\n${completionPlan}`, /instead of blocking startup/)
})

test('V1 docs record corrupt DM session display cache fail-closed behavior', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const completionPlan = await readText('../docs/v1.17-ready-im-completion-plan.md')

  assert.match(audit, /DM session message restore now drops corrupt optional/)
  assert.match(completionPlan, /Corrupt optional DM session request-row cache data is dropped/)
  assert.match(`${audit}\n${completionPlan}`, /ContactBook remains the pending-request authority/)
})

test('V1 docs record corrupt profile snapshot history fail-closed behavior', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const completionPlan = await readText('../docs/v1.17-ready-im-completion-plan.md')

  assert.match(audit, /ContactBook restore now drops corrupt optional profile\s+snapshot history/)
  assert.match(completionPlan, /Corrupt optional profile snapshot history is dropped/)
  assert.match(`${audit}\n${completionPlan}`, /contact identity, trust, and request fields/)
})

test('V1 audit records Profile QR friend requests as the normal trust path', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const ux = await readText('../docs/v1.12-mlp-ux-after-architecture-switch.md')
  const finalUx = await readText('../docs/v1.16-final-mlp-ui-ux-refactor.md')
  const docs = `${audit}\n${ux}\n${finalUx}`

  assert.doesNotMatch(docs, /Home invite is the normal trust\/join surface/)
  assert.doesNotMatch(docs, /Home invite is the normal sharing surface/)
  assert.doesNotMatch(docs, /Home invite MLP copy/)
  assert.doesNotMatch(docs, /Product UX should expose one normal entry object: `Home invite`/)
  assert.doesNotMatch(docs, /Home invite is the signed access ticket/)
  assert.doesNotMatch(docs, /show one invite/)
  assert.doesNotMatch(docs, /Add trusted friend entry/)
  assert.doesNotMatch(docs, /invite a friend, join a friend's home, and add trusted friend/)
  assert.doesNotMatch(docs, /Invite or join, and Trusted friend flows/)
  assert.doesNotMatch(docs, /enter a home invite/)
  assert.doesNotMatch(docs, /show my home invite/)
  assert.doesNotMatch(docs, /advanced profile trust/)
  assert.doesNotMatch(docs, /Profile trust remains/)
  assert.doesNotMatch(docs, /Show invite/)
  assert.doesNotMatch(docs, /Show My Profile QR/)
  assert.match(docs, /Profile QR and friend requests are the normal social entry path/)
  assert.match(docs, /Home QR remains\s+an advanced transport descriptor/)
})

test('V1 QR matching docs describe Profile QR as a friend-request target', async () => {
  const qr = await readText('../docs/v1.10-qr-code-matching.md')

  assert.doesNotMatch(qr, /scan a person to trust them/)
  assert.doesNotMatch(qr, /scanner adds trust toward the scanned profile/)
  assert.doesNotMatch(qr, /Mutual Trust By Scan/)
  assert.match(qr, /scan a profile to prepare a friend request/)
  assert.match(qr, /scanner verifies payload shape without creating trust/)
  assert.match(qr, /friend request acceptance creates mutual trust/)
})

test('V1 docs use request-target language for desktop Profile QR flow', async () => {
  const architecture = await readText('../docs/v1.11-mlp-desktop-react-architecture.md')
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const smoke = await readText('../docs/v1.20-smoke-guide.md')
  const crossDevice = await readText('../docs/v1.21-cross-device-smoke.md')
  const completion = await readText('../docs/v1.17-ready-im-completion-plan.md')
  const docs = `${architecture}\n${audit}\n${smoke}\n${crossDevice}\n${completion}`

  assert.doesNotMatch(docs, /trustProfileUri/)
  assert.doesNotMatch(
    docs,
    /Android should not be the only platform with a profile request preview/
  )
  assert.match(docs, /prepareProfileRequestTarget/)
  assert.match(docs, /Profile QR request target/)
  assert.match(docs, /profile QR request target/)
  assert.match(docs, /Desktop and Android both expose Profile QR request-target previews/)
})

test('V1 smoke docs include the desktop Pear Bare smoke path', async () => {
  const guide = await readText('../docs/v1.20-smoke-guide.md')
  const recipe = await readText('../docs/v1.21-cross-device-smoke.md')

  assert.match(guide, /npm run smoke:desktop:pear/)
  assert.match(guide, /npm run smoke:desktop:contacts:pear/)
  assert.match(guide, /Pear\/Bare/)
  assert.match(guide, /message request still appears after desktop restart/)
  assert.match(guide, /revoked trusted contact stays hidden after restart/)
  assert.match(recipe, /npm run smoke:desktop:pear/)
  assert.match(recipe, /npm run smoke:desktop:contacts:pear/)
  assert.match(recipe, /npm run smoke:two-device:debug:pear/)
  assert.match(recipe, /Android still shows the outgoing request as Request pending after restart/)
  assert.match(recipe, /message request rows remain after app restart/)
  assert.match(recipe, /revoked contacts leave trusted contact lists/)
  assert.match(recipe, /revoked contacts leave Chat recipient options/)
})

test('V1 smoke guide records desktop bundle as part of the automatic gate', async () => {
  const guide = await readText('../docs/v1.20-smoke-guide.md')

  assert.match(guide, /`npm run v1:gate` runs lint, tests/)
  assert.match(guide, /desktop bundle generation/)
  assert.match(guide, /Current automated coverage proves/)
  assert.match(guide, /desktop bundle creation/)
  assert.match(guide, /APK native-library alignment/)
})

test('V1 UX docs include pending work badges in desktop and mobile navigation', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const ux = await readText('../docs/v1.12-mlp-ux-after-architecture-switch.md')

  assert.match(audit, /desktop and mobile navigation surfaces pending Chat and Contacts work/)
  assert.match(ux, /Desktop rail badges now show pending Chat and Contacts work/)
  assert.match(ux, /Mobile tab\s+badges now show pending Chat and Contacts work/)
  assert.match(ux, /navigation accessibility labels include pending counts/)
})

test('V1 UX docs include desktop Contacts product empty states', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const ux = await readText('../docs/v1.12-mlp-ux-after-architecture-switch.md')

  assert.match(audit, /desktop Contacts empty panels now use icon-led product empty states/)
  assert.match(ux, /Desktop Contacts empty panels now use icon-led product empty states/)
  assert.match(ux, /trust management does not collapse into plain\s+placeholder text/)
})

test('V1 UX docs include desktop Contacts target-specific trust actions', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const ux = await readText('../docs/v1.12-mlp-ux-after-architecture-switch.md')

  assert.match(
    audit,
    /desktop Contacts request and Remove friend action labels include the target person/
  )
  assert.match(
    ux,
    /Desktop Contacts request and Remove friend action labels now include the target person/
  )
  assert.match(ux, /trust decisions remain clear to assistive technology/)
})

test('V1 UX docs include accessible desktop primary empty states', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const ux = await readText('../docs/v1.12-mlp-ux-after-architecture-switch.md')

  assert.match(audit, /desktop Home, Chat, and Treehole empty states now render/)
  assert.match(ux, /Desktop Home, Chat, and Treehole empty states now render/)
  assert.match(ux, /assistive technology/)
})

test('V1 UX docs include mobile Chat zero-contact empty state polish', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const ux = await readText('../docs/v1.12-mlp-ux-after-architecture-switch.md')

  assert.match(audit, /mobile Chat zero-contact state now reuses/)
  assert.match(ux, /Mobile Chat zero-contact state now uses/)
  assert.match(ux, /before linking users to Contacts/)
})

test('V1 UX docs include desktop Chat zero-contact empty state polish', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const ux = await readText('../docs/v1.12-mlp-ux-after-architecture-switch.md')

  assert.match(audit, /desktop Chat zero-contact contact picker now uses/)
  assert.match(ux, /Desktop Chat zero-contact contact picker now uses/)
  assert.match(ux, /links directly to Contacts/)
})

test('V1 UX docs include desktop Chat recipient selected state', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const ux = await readText('../docs/v1.12-mlp-ux-after-architecture-switch.md')

  assert.match(audit, /desktop Chat trusted-contact buttons expose selected state/)
  assert.match(ux, /Desktop Chat trusted-contact buttons now expose selected state/)
  assert.match(ux, /matching the mobile recipient\s+selection semantics/)
})

test('V1 docs record physical QR as a passed sub-proof, not full release proof', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const gaps = await readText('../docs/v1.07-architecture-gaps.md')
  const smoke = await readText('../docs/v1.20-smoke-guide.md')
  const crossDevice = await readText('../docs/v1.21-cross-device-smoke.md')
  const dependencyOrder = await readText('../docs/v1.01-dependency-order.md')
  const docs = `${audit}\n${gaps}\n${smoke}\n${crossDevice}\n${dependencyOrder}`

  assert.doesNotMatch(docs, /physical QR remains release proof/)
  assert.doesNotMatch(docs, /physical QR release proof (passed|remains)/i)
  assert.doesNotMatch(docs, /screen-to-camera QR proof remains open/)
  assert.doesNotMatch(docs, /Physical QR evidence still needed/)
  assert.doesNotMatch(docs, /must be rerun before declaring V1 complete/)
  assert.match(docs, /physical QR sub-proof passed/)
  assert.match(docs, /not\s+the full\s+cross-device V1 release proof by itself/)
  assert.match(docs, /Manual physical QR smoke passed/)
  assert.match(docs, /screen-to-camera QR sub-proof has passed/)
  assert.match(docs, /screen-to-camera QR proof passed/)
})

test('V1 docs describe current debug two-device proof without physical QR overclaim', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const gaps = await readText('../docs/v1.07-architecture-gaps.md')
  const smoke = await readText('../docs/v1.20-smoke-guide.md')
  const crossDevice = await readText('../docs/v1.21-cross-device-smoke.md')
  const dmBootstrap = await readText('../docs/v1.08-dm-bootstrap-security.md')
  const dependencyOrder = await readText('../docs/v1.01-dependency-order.md')
  const docs = `${audit}\n${gaps}\n${smoke}\n${crossDevice}\n${dmBootstrap}\n${dependencyOrder}`

  assert.doesNotMatch(docs, /smoke:two-device:debug` is not yet passing/)
  assert.doesNotMatch(docs, /because it proves live transport/)
  assert.match(docs, /debug two-device now proves/)
  assert.match(docs, /smoke:two-device:debug:pear/)
  assert.match(docs, /Manual physical\s+desktop-to-Android QR trust\/home join also passed/)
})

test('V1 docs keep debug two-device proof separate from normal release proof', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const completion = await readText('../docs/v1.17-ready-im-completion-plan.md')
  const gaps = await readText('../docs/v1.07-architecture-gaps.md')
  const crossDevice = await readText('../docs/v1.21-cross-device-smoke.md')
  const docs = `${audit}\n${completion}\n${gaps}\n${crossDevice}`

  assert.match(docs, /live runtime proof through debug setup/)
  assert.match(
    docs,
    /does\s+not replace the normal Profile QR -> request -> ignore -> allow -> request -> accept release proof/
  )
  assert.match(docs, /bypasses the product\s+entry path/)
  assert.match(docs, /physical QR and normal friend-request release proof/)
  assert.match(
    docs,
    /does not replace normal Profile QR request\/ignore\/recover\/accept release proof/
  )
  assert.match(
    gaps,
    /final release proof still needs the normal Profile QR -> request -> ignore -> allow -> request -> accept path/
  )
  assert.doesNotMatch(gaps, /final release proof still needs the normal friend-request path/)
  assert.match(docs, /Profile QR\s+scan, friend request, ignored request recovery/)
  assert.match(docs, /second request\s+acceptance, Chat/)
  assert.doesNotMatch(docs, /debug two-device remains release proof/)
  assert.doesNotMatch(docs, /Profile QR -> friend request -> accept release proof/)
  assert.doesNotMatch(docs, /Profile QR\s+scan, friend request, accept, Chat/)
})

test('V1 UX docs include desktop icon-led trust and QR actions', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const ux = await readText('../docs/v1.12-mlp-ux-after-architecture-switch.md')

  assert.match(
    audit,
    /desktop Chat request, Contacts request, Remove friend, and large QR close actions/
  )
  assert.match(
    ux,
    /Desktop Chat request, Contacts request, Remove friend, and large QR close actions/
  )
  assert.match(ux, /lucide icons with text labels/)
  assert.match(audit, /desktop large QR close reuses the shared icon-led action button/)
  assert.match(ux, /Desktop large QR close now reuses the shared icon-led action button/)
})

test('V1 UX docs include mobile icon-led request actions', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const ux = await readText('../docs/v1.12-mlp-ux-after-architecture-switch.md')

  assert.match(audit, /mobile Chat request and Contacts request actions use lucide icons/)
  assert.match(ux, /Mobile Chat request and Contacts request actions now use lucide icons/)
  assert.match(ux, /Accept and Ignore/)
  assert.match(audit, /one Accept\/Ignore\s+action component/)
  assert.match(ux, /one Accept\/Ignore\s+action component/)
})

test('V1 UX docs include mobile shared setup action buttons', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const ux = await readText('../docs/v1.12-mlp-ux-after-architecture-switch.md')

  assert.match(audit, /mobile setup, Advanced join, QR, trust, and zero-contact Chat entry actions/)
  assert.match(ux, /Mobile setup, Advanced join, QR, trust, and zero-contact Chat entry actions/)
  assert.match(ux, /one\s+icon button component/)
})

test('V1 UX docs include mobile shared composer send buttons', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const ux = await readText('../docs/v1.12-mlp-ux-after-architecture-switch.md')

  assert.match(audit, /mobile Home, Chat, Treehole post, and Treehole comment composers/)
  assert.match(ux, /Mobile Home, Chat, Treehole post, and Treehole comment composers/)
  assert.match(ux, /one send button component/)
})

test('V1 UX docs include desktop shared composer send buttons', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const ux = await readText('../docs/v1.12-mlp-ux-after-architecture-switch.md')

  assert.match(audit, /desktop Home, Chat, and Treehole composers/)
  assert.match(ux, /Desktop Home, Chat, and Treehole composers/)
  assert.match(ux, /one submit button\s+component/)
})

test('V1 UX docs include desktop shared context action buttons', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const ux = await readText('../docs/v1.12-mlp-ux-after-architecture-switch.md')

  assert.match(audit, /desktop context action buttons/)
  assert.match(ux, /Desktop context action buttons/)
  assert.match(ux, /one icon-led action component/)
})

test('V1 UX docs include desktop icon-led treehole interactions', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const ux = await readText('../docs/v1.12-mlp-ux-after-architecture-switch.md')

  assert.match(audit, /desktop Treehole like and comment actions/)
  assert.match(ux, /Desktop Treehole like and comment actions/)
  assert.match(ux, /icon-led shared action\s+buttons/)
})

test('V1 UX docs include desktop shared Contacts Remove friend actions', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const ux = await readText('../docs/v1.12-mlp-ux-after-architecture-switch.md')

  assert.match(audit, /desktop trusted-friend Remove friend actions/)
  assert.match(ux, /Desktop trusted-friend Remove friend actions/)
  assert.match(ux, /shared icon-led action\s+button/)
})

test('V1 UX docs include desktop shared Leave home action', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const ux = await readText('../docs/v1.12-mlp-ux-after-architecture-switch.md')

  assert.match(audit, /desktop Leave home/)
  assert.match(ux, /Desktop Leave home/)
  assert.match(ux, /pending-command disabled state/)
})

test('V1 UX docs include desktop shared theme buttons', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const ux = await readText('../docs/v1.12-mlp-ux-after-architecture-switch.md')

  assert.match(audit, /desktop theme switching/)
  assert.match(ux, /Desktop theme switching/)
  assert.match(ux, /aria-pressed/)
})

test('V1 UX docs include mobile shared small action buttons', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const ux = await readText('../docs/v1.12-mlp-ux-after-architecture-switch.md')

  assert.match(audit, /mobile trusted-friend Remove friend and Treehole like actions/)
  assert.match(ux, /Mobile trusted-friend Remove friend and Treehole like actions/)
  assert.match(ux, /one small\s+icon-led action component/)
})

test('V1 UX docs include mobile shared advanced toggles', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const ux = await readText('../docs/v1.12-mlp-ux-after-architecture-switch.md')

  assert.match(audit, /mobile room and Chat Advanced toggles/)
  assert.match(ux, /Mobile room and Chat Advanced toggles/)
  assert.match(ux, /normal\s+and compact variants/)
})

test('V1 UX docs include mobile shared top-bar icon controls', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const ux = await readText('../docs/v1.12-mlp-ux-after-architecture-switch.md')

  assert.match(audit, /mobile top-bar icon controls/)
  assert.match(ux, /Mobile top-bar icon controls/)
  assert.match(ux, /icon-only button component/)
})

test('V1 UX docs include mobile scanner cancel action component', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const ux = await readText('../docs/v1.12-mlp-ux-after-architecture-switch.md')

  assert.match(audit, /mobile QR scanner cancel/)
  assert.match(ux, /Mobile QR scanner cancel/)
  assert.match(ux, /qr-scanner-cancel/)
})

test('V1 UX docs include mobile shared Chat contact chips', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const ux = await readText('../docs/v1.12-mlp-ux-after-architecture-switch.md')

  assert.match(audit, /mobile Chat trusted-contact recipient chips/)
  assert.match(ux, /Mobile Chat trusted-contact recipient chips/)
  assert.match(ux, /selected accessibility state/)
})

test('V1 UX docs include mobile Chat contact and Remove friend state polish', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const ux = await readText('../docs/v1.12-mlp-ux-after-architecture-switch.md')

  assert.match(audit, /mobile Chat trusted-contact chips expose selected accessibility state/)
  assert.match(ux, /Mobile Chat trusted-contact chips now expose selected accessibility state/)
  assert.match(ux, /trusted-friend Remove friend actions use an icon/)
})

test('V1 UX docs include mobile collapsible expanded states', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const ux = await readText('../docs/v1.12-mlp-ux-after-architecture-switch.md')

  assert.match(audit, /mobile collapsible controls expose expanded accessibility state/)
  assert.match(ux, /Mobile collapsible controls now expose expanded accessibility state/)
  assert.match(ux, /Advanced panels, Contacts panel, QR reveals/)
})

test('V1 UX docs include polite live regions for product notices', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const ux = await readText('../docs/v1.12-mlp-ux-after-architecture-switch.md')

  assert.match(audit, /desktop and mobile product notices use polite live-region semantics/)
  assert.match(ux, /Desktop and mobile product notices now use polite live-region semantics/)
  assert.match(ux, /join, trust, revoke, and error states are announced/)
})

test('V1 docs include desktop rail tab semantics', async () => {
  const architecture = await readText('../docs/v1.11-mlp-desktop-react-architecture.md')
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const ux = await readText('../docs/v1.12-mlp-ux-after-architecture-switch.md')

  assert.match(audit, /desktop rail navigation uses tablist\/tab semantics/)
  assert.match(ux, /Desktop rail navigation now uses tablist\/tab semantics/)
  assert.match(architecture, /tablist\/tab `aria-selected` state/)
  assert.match(audit, /tablist\/tab `aria-selected` state/)
  assert.doesNotMatch(architecture, /`aria-current`/)
  assert.doesNotMatch(audit, /`aria-current`/)
})

test('V1 UX docs include Home trust source product copy', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const ux = await readText('../docs/v1.12-mlp-ux-after-architecture-switch.md')

  assert.match(audit, /trusted-friend metadata now use Home instead of Home room/)
  assert.match(ux, /trusted-friend metadata now show Home instead of Home room/)
  assert.match(ux, /internal room terminology out of normal trust surfaces/)
})

test('V1 docs record product copy for local trust-source fallbacks', async () => {
  const completionPlan = await readText('../docs/v1.17-ready-im-completion-plan.md')

  assert.match(completionPlan, /`This device` \/ `From this\s+device`/)
  assert.match(completionPlan, /`Profile <short id>` or `Someone`/)
  assert.match(completionPlan, /do not persist short profile ids as aliases/)
  assert.match(completionPlan, /instead\s+of exposing the internal `anon` default/)
  assert.match(completionPlan, /Chat peer fallbacks now use `Profile <short id>`/)
  assert.match(completionPlan, /`Someone` when it is not/)
  assert.doesNotMatch(completionPlan, /From local trust/)
})

test('V1 UX docs use current product surface names', async () => {
  const ux = await readText('../docs/v1.12-mlp-ux-after-architecture-switch.md')

  assert.match(ux, /Current implementation status:/)
  assert.match(ux, /\| signed profile URI \| Profile QR\s+\| signed URI/)
  assert.match(ux, /Home chat, Chat, and Treehole panes/)
  assert.match(ux, /### Chat View/)
  assert.match(ux, /bottom tabs: Home, Chat, Contacts, Treehole/)
  assert.doesNotMatch(ux, /\| signed profile URI \| Profile trust/)
  assert.doesNotMatch(ux, /Current desktop status:/)
  assert.doesNotMatch(ux, /### DM View/)
  assert.doesNotMatch(ux, /bottom tabs: Home, DM, Treehole, People/)
})

test('V1 smoke guide uses Chat product language for user steps', async () => {
  const smokeGuide = await readText('../docs/v1.20-smoke-guide.md')
  const completionPlan = await readText('../docs/v1.17-ready-im-completion-plan.md')
  const dependencyOrder = await readText('../docs/v1.01-dependency-order.md')
  const crossDevice = await readText('../docs/v1.21-cross-device-smoke.md')
  const docs = `${smokeGuide}\n${completionPlan}\n${dependencyOrder}\n${crossDevice}`

  assert.match(smokeGuide, /## Friend Request And Chat/)
  assert.match(smokeGuide, /Android opens Chat\./)
  assert.match(smokeGuide, /Android sends one friend request\./)
  assert.match(smokeGuide, /profile-level delivery, not Home control/)
  assert.match(smokeGuide, /Chat recipient option/)
  assert.match(smokeGuide, /Android tries to send another Chat message\./)
  assert.match(smokeGuide, /Chat panes do not show room chat messages/)
  assert.doesNotMatch(smokeGuide, /message request travels over home control path/)
  assert.doesNotMatch(smokeGuide, /## Message Request And DM/)
  assert.doesNotMatch(smokeGuide, /Android opens DM tab/)
  assert.doesNotMatch(smokeGuide, /DM recipient option/)
  assert.doesNotMatch(smokeGuide, /Send another DM/)
  assert.match(completionPlan, /Chat thread list/)
  assert.match(completionPlan, /send and receive Chat across restart/)
  assert.match(completionPlan, /side effect of sending a Message/)
  assert.match(dependencyOrder, /trusted contacts as Chat recipient options/)
  assert.match(crossDevice, /Chat setup and body traffic stay separate from room chat/)
  assert.match(crossDevice, /durable Chat messages survive restart/)
  assert.match(crossDevice, /Desktop shows My QR from Start or Contacts without entering Home/)
  assert.doesNotMatch(crossDevice, /Desktop opens its Home and shows My QR/)
  assert.match(crossDevice, /Android shows the request as Request pending before acceptance/)
  assert.match(
    crossDevice,
    /Android still shows the outgoing request as Request pending after restart/
  )
  assert.match(crossDevice, /Desktop ignores the friend request/)
  assert.match(crossDevice, /chooses Allow requests/)
  assert.match(crossDevice, /Desktop accepts the second friend request/)
  assert.match(crossDevice, /Chat thread metadata remains after restart/)
  assert.match(crossDevice, /accepted Chat receive paths are closed for future traffic/)
  assert.match(crossDevice, /revoked contacts leave Chat recipient options/)
  assert.doesNotMatch(docs, /send and receive direct messages across restart/)
  assert.doesNotMatch(docs, /side effect of sending a DM/)
  assert.doesNotMatch(docs, /DM recipient option/)
  assert.doesNotMatch(crossDevice, /DM setup and body traffic/)
  assert.doesNotMatch(crossDevice, /durable DM survives restart/)
  assert.doesNotMatch(crossDevice, /DM thread metadata remains after restart/)
  assert.doesNotMatch(crossDevice, /accepted DM receive paths/)
})

test('V1 style board uses current product surface names', async () => {
  const styleBoard = await readText('../docs/v1.14-mlp-style-directions.html')
  const smokeGuide = await readText('../docs/v1.20-smoke-guide.md')
  const crossDevice = await readText('../docs/v1.21-cross-device-smoke.md')
  const ux = await readText('../docs/v1.12-mlp-ux-after-architecture-switch.md')
  const completionPlan = await readText('../docs/v1.17-ready-im-completion-plan.md')

  assert.match(styleBoard, /title="Chat"/)
  assert.match(styleBoard, /title="Treehole"/)
  assert.match(styleBoard, /title="Contacts"/)
  assert.match(styleBoard, />Chat</)
  assert.match(styleBoard, />Treehole</)
  assert.match(styleBoard, />Contacts</)
  assert.doesNotMatch(styleBoard, /title="DM"/)
  assert.doesNotMatch(styleBoard, /title="People"/)
  assert.doesNotMatch(styleBoard, />DM</)
  assert.doesNotMatch(styleBoard, />People</)
  assert.match(smokeGuide, /## Treehole/)
  assert.match(smokeGuide, /Desktop owner creates a Treehole post/)
  assert.match(smokeGuide, /owner Treehole post can be created/)
  assert.match(smokeGuide, /Home and Treehole tabs are visible/)
  assert.match(crossDevice, /Treehole posts are not treated as room messages/)
  assert.match(crossDevice, /trust grants Treehole access and Chat eligibility/)
  assert.doesNotMatch(smokeGuide, /## My Treehole/)
  assert.doesNotMatch(smokeGuide, /My treehole tab/)
  assert.match(completionPlan, /durable owner Treehole post restore/)
  assert.match(completionPlan, /Treehole navigation/)
  assert.match(ux, /\| treehole\s+\| Treehole\s+\| feed/)
  assert.match(completionPlan, /Contacts badges/)
  assert.doesNotMatch(completionPlan, /People\/Contacts badges/)
})

test('V1 final UX doc does not present protocol terms as product surfaces', async () => {
  const finalUx = await readText('../docs/v1.16-final-mlp-ui-ux-refactor.md')

  assert.match(finalUx, /person -> profile -> trust -> Home \/ Recent posts \/ Chat/)
  assert.match(finalUx, /### Chat/)
  assert.match(finalUx, /### Treehole \/ Recent posts/)
  assert.match(finalUx, /Contacts navigation badges/)
  assert.match(finalUx, /one row per active message thread/)
  assert.doesNotMatch(finalUx, /### Direct Chat/)
  assert.doesNotMatch(finalUx, /People\/Contacts navigation badges/)
  assert.doesNotMatch(finalUx, /one row per active direct thread/)
  assert.doesNotMatch(finalUx, /Home \/ recent posts \/ direct messages/)
  assert.doesNotMatch(finalUx, /final worker smoke still needs to prove the same inbox/)
  assert.match(finalUx, /Pear desktop smoke covers the same worker-backed/)
})

test('V1 docs record shared product surface vocabulary', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const completionPlan = await readText('../docs/v1.17-ready-im-completion-plan.md')

  assert.match(audit, /src\/product-surfaces\.ts/)
  assert.match(audit, /Home`, `Chat`, `Contacts`,\s+and `Treehole`/)
  assert.match(completionPlan, /typed product-surface\s+vocabulary/)
  assert.match(completionPlan, /Home`, `Chat`, `Contacts`,\s+and `Treehole`/)
})

test('V1 DM bootstrap docs no longer claim contact polish remains pending', async () => {
  const dmBootstrap = await readText('../docs/v1.08-dm-bootstrap-security.md')
  const dependencyOrder = await readText('../docs/v1.01-dependency-order.md')

  assert.doesNotMatch(dmBootstrap, /Remaining work is contacts polish revealed by later smoke/)
  assert.doesNotMatch(dependencyOrder, /refine full contacts view after V1 smoke if needed/)
  assert.match(dmBootstrap, /Later contact polish has also landed/)
  assert.match(dependencyOrder, /Contacts\/Chat contact polish has landed/)
  assert.match(dmBootstrap, /guide zero-contact Chat users\s+toward Contacts/)
})

test('V1 docs record revoke clearing pending message requests', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const gaps = await readText('../docs/v1.07-architecture-gaps.md')
  const dmBootstrap = await readText('../docs/v1.08-dm-bootstrap-security.md')
  const dependencyOrder = await readText('../docs/v1.01-dependency-order.md')

  assert.match(audit, /revoke updates trust, clears pending requests from the revoked profile/)
  assert.match(gaps, /ContactBook clears existing pending message requests from a revoked contact/)
  assert.match(dmBootstrap, /ContactBook clears an existing pending message request/)
  assert.match(dependencyOrder, /clear pending message requests from the revoked profile/)
})

test('V1 docs record ignored message requests as consuming the one request slot', async () => {
  const gaps = await readText('../docs/v1.07-architecture-gaps.md')
  const dmBootstrap = await readText('../docs/v1.08-dm-bootstrap-security.md')
  const dependencyOrder = await readText('../docs/v1.01-dependency-order.md')
  const docs = `${gaps}\n${dmBootstrap}\n${dependencyOrder}`

  assert.match(docs, /ignored message requests consume/)
  assert.match(docs, /trusted senders/)
  assert.match(docs, /blocks repeat untrusted requests/)
  assert.match(docs, /requires a pending request/)
  assert.match(docs, /fails closed without a pending request/)
})

test('V1 docs record Android request UI gating through ContactBook', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const gaps = await readText('../docs/v1.07-architecture-gaps.md')

  assert.match(
    audit,
    /Android incoming message requests are appended to Chat only after ContactBook/
  )
  assert.match(gaps, /Android appends incoming message requests to Chat only after ContactBook/)
  assert.match(`${audit}\n${gaps}`, /revoked senders do not leak into/)
})

test('V1 docs record Android backend request acceptance validation', async () => {
  const gaps = await readText('../docs/v1.07-architecture-gaps.md')

  assert.match(gaps, /Android Bare backend verifies signed message requests again/)
  assert.match(gaps, /rejects request acceptance from revoked senders/)
  assert.match(gaps, /Android syncs ContactBook-derived treehole policy/)
  assert.match(gaps, /trust, request accept, and revoke/)
  assert.match(gaps, /join-time policy snapshot/)
})

test('V1 docs record DM body Home fallback as debug-only', async () => {
  const dmBootstrap = await readText('../docs/v1.08-dm-bootstrap-security.md')
  const gaps = await readText('../docs/v1.07-architecture-gaps.md')
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const docs = `${dmBootstrap}\n${gaps}\n${audit}`

  assert.match(docs, /Home-carried `kepos\.dm\.body\.v1` frames are gated/)
  assert.match(docs, /disabled by default/)
  assert.match(docs, /signed DM body exchange over the accepted message thread/)
  assert.match(docs, /Android Chat restart persistence/)
  assert.match(docs, /post-restart Chat delivery/)
  assert.doesNotMatch(docs, /signed DM body fallback,\s+Android/)
  assert.doesNotMatch(docs, /Android DM restart persistence/)
  assert.doesNotMatch(docs, /post-restart DM delivery/)
})

test('V1 audit records DM security hardening evidence', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')

  assert.match(audit, /DM invite acceptance rejects revoked senders/)
  assert.match(audit, /request-bound\s+platform exceptions/)
  assert.match(audit, /DM runtime verifies channel-delivered messages/)
  assert.match(audit, /before persistence or UI\s+display/)
  assert.match(audit, /`test\/dm-invite-acceptance\.test\.js`/)
  assert.match(audit, /`test\/dm-thread-runtime\.test\.js`/)
  assert.match(audit, /current `npm run v1:gate` passed/)
  assert.match(audit, /902 Node\s+tests/)
  assert.match(audit, /`npm run android:assemble:release` also passed/)
  assert.match(audit, /Expo Android export/)
  assert.match(audit, /Android APK native-library checks/)
  assert.match(audit, /Device\s+smoke was\s+intentionally not rerun/)
})

test('V1 UX docs include composer payload trimming on desktop and mobile', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const ux = await readText('../docs/v1.12-mlp-ux-after-architecture-switch.md')

  assert.match(audit, /desktop Home, Chat, Treehole post, and Treehole comment payloads trim/)
  assert.match(audit, /Home, Chat, and Treehole runtime writes defensive/)
  assert.match(ux, /Desktop Home, Chat, Treehole post, and Treehole comment payloads trim/)
  assert.match(ux, /Desktop Home, Chat, and Treehole runtime calls also trim outgoing text/)
  assert.match(audit, /mobile Home, Chat, Treehole post, and Treehole comment payloads trim/)
  assert.match(ux, /Mobile Home, Chat, Treehole post, and Treehole comment payloads trim/)
  assert.match(audit, /Android Bare backend RPC handlers also trim Home, Chat, and Treehole/)
  assert.match(ux, /Android Bare backend RPC handlers also trim Home, Chat, and Treehole/)
})

test('V1 audit records warning-free low-cost lint gate', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')

  assert.match(audit, /npm run lint` warning-free/)
  assert.match(audit, /Prettier, lunte, TypeScript, and platform-boundary checks passing/)
})

test('V1 audit records current desktop bundle evidence in the V1 gate', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const completionPlan = await readText('../docs/v1.17-ready-im-completion-plan.md')

  assert.match(audit, /V1 gate now includes `npm run desktop:bundle`/)
  assert.match(audit, /Tailwind\/daisyUI CSS generation/)
  assert.match(audit, /Bare backend-worker bundling/)
  assert.match(completionPlan, /desktop bundle generation/)
  assert.match(completionPlan, /React app, browser controller, Node\s+controller/)
  assert.match(completionPlan, /Bare backend worker/)
})

test('V1 completion plan separates automated evidence from final smoke proof', async () => {
  const completionPlan = await readText('../docs/v1.17-ready-im-completion-plan.md')

  assert.match(completionPlan, /V1 completion and release-evidence checklist/)
  assert.match(completionPlan, /remaining bar before V1 should be called ready is final/)
  assert.match(completionPlan, /## Completion Evidence/)
  assert.doesNotMatch(completionPlan, /This document lists what still needs implementation/)
  assert.doesNotMatch(completionPlan, /## Remaining Work/)
  assert.match(completionPlan, /Current automated evidence:/)
  assert.match(completionPlan, /`npm run v1:gate` is green/)
  assert.match(completionPlan, /902 Node tests/)
  assert.match(completionPlan, /`npm run android:assemble:release` is green/)
  assert.match(completionPlan, /desktop bundle generation/)
  assert.match(completionPlan, /Expo Android export/)
  assert.match(completionPlan, /Desktop self-run smoke scripts now cover/)
  assert.match(completionPlan, /durable owner Treehole post restore/)
  assert.match(completionPlan, /Pear desktop smoke scripts cover the bundled worker bridge/)
  assert.doesNotMatch(completionPlan, /Final product proof still needs a real desktop worker run/)
  assert.match(completionPlan, /Android basic smoke script covers/)
  assert.match(completionPlan, /owner Treehole posting/)
  assert.match(completionPlan, /app stop\/relaunch, Home reopen/)
  assert.match(completionPlan, /Debug two-device smoke script covers/)
  assert.match(completionPlan, /trusted desktop profile's Recent posts section/)
  assert.match(completionPlan, /Still needed before V1 ready:/)
  assert.match(completionPlan, /Desktop self-run:/)
  assert.match(completionPlan, /covered by `smoke:desktop` and `smoke:desktop:pear`/)
  assert.match(completionPlan, /rerun before release only when desktop persistence/)
  assert.match(completionPlan, /Android self-run:/)
  assert.match(completionPlan, /scripted by `smoke:android` for create\/open\/post\/restart/)
  assert.match(completionPlan, /still needs a real device or emulator run/)
  assert.match(completionPlan, /Cross-device:/)
  assert.match(completionPlan, /Recent posts show for trusted profile/)
})

test('V1 TypeScript boundary records current source shape and smoke policy', async () => {
  const boundary = await readText('../docs/v1.05-typescript-boundary.md')

  assert.match(boundary, /no JSX source files remaining/)
  assert.match(boundary, /TSX without\s+`@ts-nocheck`/)
  assert.match(boundary, /tightening UI component types in small slices/)
  assert.match(boundary, /## Keep Platform Edges Gradual/)
  assert.doesNotMatch(boundary, /## Keep JavaScript For Now/)
  assert.match(boundary, /## Release Proof Policy/)
  assert.match(boundary, /not as the default response to every small V1\s+code or docs change/)
  assert.match(boundary, /Do not run high-cost smoke unless the user\s+asks for smoke/)
  assert.match(boundary, /## Import Specifier Rule/)
  assert.match(boundary, /current Kepos V1 shared TypeScript graph/)
  assert.match(boundary, /use explicit `\.ts` relative/)
  assert.match(boundary, /rewriteRelativeImportExtensions/)
  assert.match(boundary, /Source imports stay honest/)
  assert.match(boundary, /Do not use extensionless relative imports/)
  assert.match(boundary, /desktop React UI or other bundler-only code/)
  assert.match(boundary, /Mobile React TSX is the current exception/)
  assert.match(boundary, /mobile\/\*\.tsx` keeps explicit `\.js` local/)
  assert.match(boundary, /`metro\.config\.cjs` maps only\s+local `\.js` specifiers/)
  assert.match(boundary, /separate TypeScript package/)
  assert.match(boundary, /not the default V1 path/)
  assert.doesNotMatch(boundary, /Do not use `\.ts` import specifiers as the default style/)
  assert.doesNotMatch(boundary, /Do\s+not churn them solely for style/)
  assert.doesNotMatch(boundary, /## Temporarily Blocked Proof/)
  assert.doesNotMatch(boundary, /blocked on physical Android availability/)
})

test('V1 docs use Remove friend as the normal user-facing revoke action', async () => {
  const direction = await readText('../docs/00-project-direction.md')
  const ux = await readText('../docs/v1.12-mlp-ux-after-architecture-switch.md')
  const completionPlan = await readText('../docs/v1.17-ready-im-completion-plan.md')
  const finalUx = await readText('../docs/v1.16-final-mlp-ui-ux-refactor.md')
  const docs = `${direction}\n${ux}\n${completionPlan}\n${finalUx}`

  assert.match(ux, /\| revoke\s+\|\s+Remove friend\s+\|\s+raw revoke wording\s+\|/)
  assert.match(completionPlan, /remove a friend and stop future access/)
  assert.match(docs, /Remove friend/)
  assert.match(docs, /Friend removed\./)
  assert.doesNotMatch(docs, /Trust revoked/)
  assert.doesNotMatch(docs, /revoke trust and stop future access/)
  assert.doesNotMatch(docs, /Revoke trust, delete/)
})

test('V1 normal UX docs use Chat and Treehole product labels', async () => {
  const direction = await readText('../docs/00-project-direction.md')
  const ux = await readText('../docs/v1.12-mlp-ux-after-architecture-switch.md')
  const completionPlan = await readText('../docs/v1.17-ready-im-completion-plan.md')
  const normalDocs = `${direction}\n${ux}\n${completionPlan}`

  assert.match(direction, /one profile owns one Home/)
  assert.match(direction, /Treehole is durable profile text/)
  assert.match(direction, /Chat messages are durable, pairwise/)
  assert.match(ux, /send a Chat message/)
  assert.match(ux, /### Mobile Chat/)
  assert.match(ux, /### Mobile Treehole/)
  assert.match(ux, /Neil sent a friend request\./)
  assert.match(completionPlan, /Treehole exists as a durable posting surface/)
  assert.doesNotMatch(normalDocs, /send a DM/)
  assert.doesNotMatch(normalDocs, /start a DM/)
  assert.doesNotMatch(normalDocs, /send a Message/)
  assert.doesNotMatch(normalDocs, /### Mobile DM/)
  assert.doesNotMatch(normalDocs, /My Treehole/)
  assert.doesNotMatch(normalDocs, /My treehole/)
})
