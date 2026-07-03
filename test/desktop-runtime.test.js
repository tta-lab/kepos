import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'))
}

test('desktop runtime uses embedded pear-runtime instead of pear run', async () => {
  const rootPackage = await readJson('../package.json')
  const desktopPackage = await readJson('../desktop/package.json')

  assert.doesNotMatch(rootPackage.scripts.desktop, /\bpear\s+run\b/)
  assert.match(rootPackage.scripts.desktop, /npm\s+run\s+start\s+--prefix\s+desktop/)
  assert.equal(desktopPackage.dependencies['pear-runtime'], '^1.2.0')
  assert.ok(desktopPackage.devDependencies.electron)
  assert.equal(desktopPackage.dependencies['pear-electron'], undefined)
  assert.equal(desktopPackage.dependencies['pear-bridge'], undefined)
})
