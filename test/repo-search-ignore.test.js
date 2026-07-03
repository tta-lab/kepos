import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

function assertIgnoreContains(ignore, entry) {
  assert.ok(ignore.split(/\r?\n/).includes(entry), `${entry} is not ignored`)
}

function assertIgnoresGeneratedArtifacts(ignore) {
  for (const entry of [
    'desktop/app.bundle.cjs',
    'desktop/app.bundle.js',
    'desktop/backend-worker-host.bundle.cjs',
    'desktop/backend-worker.bundle.cjs',
    'desktop/controller.browser.bundle.js',
    'desktop/controller.bundle.cjs',
    'desktop/local-backend.bundle.cjs',
    'desktop/local-profile.bundle.cjs',
    'desktop/tailwind.css',
    'mobile/app.bundle.mjs',
    'tmp/'
  ]) {
    assertIgnoreContains(ignore, entry)
  }
}

function assertIgnoresPlatformBuildOutput(ignore) {
  for (const entry of ['node_modules/', '.expo/', 'android/', 'ios/']) {
    assertIgnoreContains(ignore, entry)
  }
}

test('repo search ignores generated artifacts and platform build output', async () => {
  const ignore = await readFile(new URL('../.ignore', import.meta.url), 'utf8')

  assertIgnoresGeneratedArtifacts(ignore)
  assertIgnoresPlatformBuildOutput(ignore)
})

test('git ignores generated artifacts and platform build output', async () => {
  const ignore = await readFile(new URL('../.gitignore', import.meta.url), 'utf8')

  assertIgnoresGeneratedArtifacts(ignore)
  assertIgnoresPlatformBuildOutput(ignore)
})

test('checked source does not use any or TypeScript escape comments', () => {
  const result = spawnSync(
    'rg',
    [
      String.raw`\bany\b|@ts-ignore|@ts-nocheck`,
      'desktop',
      'mobile',
      'src',
      '--glob',
      '!mobile/app.bundle.mjs',
      '--glob',
      '!desktop/*.bundle.*',
      '--glob',
      '!tmp/**',
      '-n'
    ],
    {
      cwd: new URL('..', import.meta.url),
      encoding: 'utf8'
    }
  )

  assert.equal(result.status, 1, result.stdout || result.stderr)
})

test('checked UI source stays on TSX instead of JSX', async () => {
  const sourceFileSearch = spawnSync(
    'rg',
    [
      '--files',
      'desktop',
      'mobile',
      'src',
      '--glob',
      '*.jsx',
      '--glob',
      '!desktop/*.bundle.*',
      '--glob',
      '!mobile/app.bundle.mjs',
      '--glob',
      '!tmp/**'
    ],
    {
      cwd: new URL('..', import.meta.url),
      encoding: 'utf8'
    }
  )
  const jsxImportSearch = spawnSync(
    'rg',
    [
      String.raw`from ['"][^'"]+\.jsx|import\(['"][^'"]+\.jsx`,
      'desktop',
      'mobile',
      'src',
      'test',
      '--glob',
      '!desktop/*.bundle.*',
      '--glob',
      '!mobile/app.bundle.mjs',
      '--glob',
      '!tmp/**',
      '-n'
    ],
    {
      cwd: new URL('..', import.meta.url),
      encoding: 'utf8'
    }
  )
  const packageJson = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8')
  )

  assert.equal(sourceFileSearch.status, 1, sourceFileSearch.stdout || sourceFileSearch.stderr)
  assert.equal(jsxImportSearch.status, 1, jsxImportSearch.stdout || jsxImportSearch.stderr)
  assert.match(packageJson.scripts['desktop:bundle'], /esbuild desktop\/app\.tsx --bundle/)
  assert.match(packageJson.scripts['desktop:bundle'], /esbuild desktop\/local-backend\.ts --bundle/)
  assert.match(packageJson.scripts['desktop:bundle'], /esbuild desktop\/local-profile\.ts --bundle/)
})

test('mobile TSX keeps local component imports Metro-compatible', () => {
  const result = spawnSync(
    'rg',
    [
      String.raw`from ['"]\./[^'"]+\.(js|jsx)|import\(['"]\./[^'"]+\.(js|jsx)`,
      'mobile',
      '--glob',
      '*.tsx',
      '--glob',
      '!mobile/app.bundle.mjs',
      '-n'
    ],
    {
      cwd: new URL('..', import.meta.url),
      encoding: 'utf8'
    }
  )

  assert.equal(result.status, 1, result.stdout || result.stderr)
})
