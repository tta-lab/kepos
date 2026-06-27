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
