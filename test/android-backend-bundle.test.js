import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('android backend bundle transpiles TypeScript before bare-pack', () => {
  const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  const script = packageJson.scripts['backend:bundle:android']

  assert.match(script, /tsc -p tsconfig\.bare-bundle\.json/)
  assert.match(script, /tmp\/bare-bundle-js\/backend\/backend\.mjs/)
  assert.match(script, /check-bare-bundle-no-typescript\.mjs mobile\/app\.bundle\.mjs/)
})

test('bare bundle TypeScript emit rewrites relative ts imports', () => {
  const tsconfig = JSON.parse(
    readFileSync(new URL('../tsconfig.bare-bundle.json', import.meta.url), 'utf8')
  )

  assert.equal(tsconfig.compilerOptions.noEmit, false)
  assert.equal(tsconfig.compilerOptions.allowImportingTsExtensions, false)
  assert.equal(tsconfig.compilerOptions.rewriteRelativeImportExtensions, true)
})
