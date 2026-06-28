import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

function readText(path) {
  return readFile(new URL(path, import.meta.url), 'utf8')
}

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

test('V1 smoke docs include the desktop Pear Bare smoke path', async () => {
  const guide = await readText('../docs/v1.20-smoke-guide.md')
  const recipe = await readText('../docs/v1.21-cross-device-smoke.md')

  assert.match(guide, /npm run smoke:desktop:pear/)
  assert.match(guide, /npm run smoke:desktop:contacts:pear/)
  assert.match(guide, /Pear\/Bare/)
  assert.match(guide, /Direct message request still appears after desktop restart/)
  assert.match(guide, /revoked trusted contact stays hidden after restart/)
  assert.match(recipe, /npm run smoke:desktop:pear/)
  assert.match(recipe, /npm run smoke:desktop:contacts:pear/)
  assert.match(recipe, /npm run smoke:two-device:debug:pear/)
  assert.match(recipe, /Direct request restart display/)
  assert.match(recipe, /Direct message request rows remain after app restart/)
  assert.match(recipe, /revoked trusted contact stays hidden\s+after restart/)
})

test('V1 UX docs include pending work badges in desktop and mobile navigation', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const ux = await readText('../docs/v1.12-mlp-ux-after-architecture-switch.md')

  assert.match(audit, /desktop and mobile navigation surfaces pending Direct and People work/)
  assert.match(ux, /Desktop rail badges now show pending Direct and People work/)
  assert.match(ux, /Mobile tab\s+badges now show pending Direct and People work/)
  assert.match(ux, /navigation accessibility labels include pending counts/)
})

test('V1 UX docs include desktop People product empty states', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const ux = await readText('../docs/v1.12-mlp-ux-after-architecture-switch.md')

  assert.match(audit, /desktop People empty panels now use icon-led product empty states/)
  assert.match(ux, /Desktop People empty panels now use icon-led product empty states/)
  assert.match(ux, /trust management does not collapse into plain\s+placeholder text/)
})

test('V1 UX docs include desktop People target-specific trust actions', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const ux = await readText('../docs/v1.12-mlp-ux-after-architecture-switch.md')

  assert.match(audit, /desktop People request and revoke action labels include the target person/)
  assert.match(ux, /Desktop People request and revoke action labels now include the target person/)
  assert.match(ux, /trust decisions remain clear to assistive technology/)
})

test('V1 UX docs include accessible desktop primary empty states', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const ux = await readText('../docs/v1.12-mlp-ux-after-architecture-switch.md')

  assert.match(audit, /desktop Home, Direct, and Treehole empty states now render/)
  assert.match(ux, /Desktop Home, Direct, and Treehole empty states now render/)
  assert.match(ux, /assistive technology/)
})

test('V1 UX docs include mobile Direct zero-contact empty state polish', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const ux = await readText('../docs/v1.12-mlp-ux-after-architecture-switch.md')

  assert.match(audit, /mobile Direct's zero-contact state now reuses/)
  assert.match(ux, /Mobile Direct's zero-contact state now uses/)
  assert.match(ux, /before linking users to People/)
})

test('V1 UX docs include desktop Direct zero-contact empty state polish', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const ux = await readText('../docs/v1.12-mlp-ux-after-architecture-switch.md')

  assert.match(audit, /desktop Direct's zero-contact contact picker now uses/)
  assert.match(ux, /Desktop Direct's zero-contact contact picker now uses/)
  assert.match(ux, /links directly to People/)
})

test('V1 UX docs include desktop direct recipient selected state', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const ux = await readText('../docs/v1.12-mlp-ux-after-architecture-switch.md')

  assert.match(audit, /desktop Direct trusted-contact buttons expose selected state/)
  assert.match(ux, /Desktop Direct trusted-contact buttons now expose selected state/)
  assert.match(ux, /matching the mobile recipient\s+selection semantics/)
})

test('V1 docs do not overclaim current physical QR proof', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const gaps = await readText('../docs/v1.07-architecture-gaps.md')
  const smoke = await readText('../docs/v1.20-smoke-guide.md')
  const dependencyOrder = await readText('../docs/v1.01-dependency-order.md')
  const docs = `${audit}\n${gaps}\n${smoke}\n${dependencyOrder}`

  assert.doesNotMatch(docs, /manual physical QR smoke (has also )?proven/)
  assert.doesNotMatch(docs, /manual physical QR smoke proves/)
  assert.doesNotMatch(docs, /Physical QR smoke now covers/)
  assert.match(docs, /physical QR remains release proof/)
  assert.match(docs, /screen-to-camera QR proof remains open/)
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
  assert.match(docs, /Manual physical desktop-to-Android QR trust\/home join remains release proof/)
})

test('V1 UX docs include desktop icon-led trust and QR actions', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const ux = await readText('../docs/v1.12-mlp-ux-after-architecture-switch.md')

  assert.match(audit, /desktop Direct request, People request, revoke, and large QR close actions/)
  assert.match(ux, /Desktop Direct request, People request, revoke, and large QR close actions/)
  assert.match(ux, /lucide icons with text labels/)
  assert.match(audit, /desktop large QR close reuses the shared icon-led action button/)
  assert.match(ux, /Desktop large QR close now reuses the shared icon-led action button/)
})

test('V1 UX docs include mobile icon-led request actions', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const ux = await readText('../docs/v1.12-mlp-ux-after-architecture-switch.md')

  assert.match(audit, /mobile Direct request and People request actions use lucide icons/)
  assert.match(ux, /Mobile Direct request and People request actions now use lucide icons/)
  assert.match(ux, /Accept and Ignore/)
  assert.match(audit, /one Accept\/Ignore\s+action component/)
  assert.match(ux, /one Accept\/Ignore\s+action component/)
})

test('V1 UX docs include mobile shared setup action buttons', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const ux = await readText('../docs/v1.12-mlp-ux-after-architecture-switch.md')

  assert.match(
    audit,
    /mobile setup, Advanced join, QR, trust, and zero-contact Direct entry actions/
  )
  assert.match(ux, /Mobile setup, Advanced join, QR, trust, and zero-contact Direct entry actions/)
  assert.match(ux, /one\s+icon button component/)
})

test('V1 UX docs include mobile shared composer send buttons', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const ux = await readText('../docs/v1.12-mlp-ux-after-architecture-switch.md')

  assert.match(audit, /mobile Home, Direct, Treehole post, and Treehole comment composers/)
  assert.match(ux, /Mobile Home, Direct, Treehole post, and Treehole comment composers/)
  assert.match(ux, /one send button component/)
})

test('V1 UX docs include desktop shared composer send buttons', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const ux = await readText('../docs/v1.12-mlp-ux-after-architecture-switch.md')

  assert.match(audit, /desktop Home, Direct, and Treehole composers/)
  assert.match(ux, /Desktop Home, Direct, and Treehole composers/)
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

test('V1 UX docs include desktop shared People revoke actions', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const ux = await readText('../docs/v1.12-mlp-ux-after-architecture-switch.md')

  assert.match(audit, /desktop trusted-friend revoke actions/)
  assert.match(ux, /Desktop trusted-friend revoke actions/)
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

  assert.match(audit, /mobile trusted-friend revoke and Treehole like actions/)
  assert.match(ux, /Mobile trusted-friend revoke and Treehole like actions/)
  assert.match(ux, /one small\s+icon-led action component/)
})

test('V1 UX docs include mobile shared advanced toggles', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const ux = await readText('../docs/v1.12-mlp-ux-after-architecture-switch.md')

  assert.match(audit, /mobile room and Direct Advanced toggles/)
  assert.match(ux, /Mobile room and Direct Advanced toggles/)
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

test('V1 UX docs include mobile shared Direct contact chips', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const ux = await readText('../docs/v1.12-mlp-ux-after-architecture-switch.md')

  assert.match(audit, /mobile Direct trusted-contact recipient chips/)
  assert.match(ux, /Mobile Direct trusted-contact recipient chips/)
  assert.match(ux, /selected accessibility state/)
})

test('V1 UX docs include mobile direct contact and revoke state polish', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const ux = await readText('../docs/v1.12-mlp-ux-after-architecture-switch.md')

  assert.match(audit, /mobile Direct trusted-contact chips expose selected accessibility state/)
  assert.match(ux, /Mobile Direct trusted-contact chips now expose selected accessibility state/)
  assert.match(ux, /trusted-friend revoke actions use an icon/)
})

test('V1 UX docs include mobile collapsible expanded states', async () => {
  const audit = await readText('../docs/v1.15-mlp-implementation-audit.md')
  const ux = await readText('../docs/v1.12-mlp-ux-after-architecture-switch.md')

  assert.match(audit, /mobile collapsible controls expose expanded accessibility state/)
  assert.match(ux, /Mobile collapsible controls now expose expanded accessibility state/)
  assert.match(ux, /Advanced panels, People setup, QR reveals/)
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

test('V1 UX docs use Direct as the product surface name', async () => {
  const ux = await readText('../docs/v1.12-mlp-ux-after-architecture-switch.md')

  assert.match(ux, /Current implementation status:/)
  assert.match(ux, /Home chat, Direct, and Treehole panes/)
  assert.match(ux, /### Direct View/)
  assert.match(ux, /bottom tabs: Home, Direct, Treehole, People/)
  assert.doesNotMatch(ux, /Current desktop status:/)
  assert.doesNotMatch(ux, /### DM View/)
  assert.doesNotMatch(ux, /bottom tabs: Home, DM, Treehole, People/)
})

test('V1 DM bootstrap docs no longer claim contact polish remains pending', async () => {
  const dmBootstrap = await readText('../docs/v1.08-dm-bootstrap-security.md')

  assert.doesNotMatch(dmBootstrap, /Remaining work is contacts polish revealed by later smoke/)
  assert.match(dmBootstrap, /Later contact polish has also landed/)
  assert.match(dmBootstrap, /guide zero-contact Direct users toward People/)
})
