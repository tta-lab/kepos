import { pathToFileURL } from 'node:url'

const bundlePath = process.argv[2]

if (!bundlePath) {
  console.error('Usage: node scripts/check-bare-bundle-no-typescript.mjs <bundle>')
  process.exit(1)
}

const bundleUrl = pathToFileURL(bundlePath)
bundleUrl.search = `t=${Date.now()}`

const { default: bundle } = await import(bundleUrl.href)
const rawTypeScriptModules = [
  ...new Set(bundle.match(/\/(?:backend|scripts|src)\/[^"]+\.ts/g) || [])
]

if (rawTypeScriptModules.length > 0) {
  console.error('Bare bundle contains raw TypeScript modules:')
  for (const modulePath of rawTypeScriptModules) console.error(`- ${modulePath}`)
  console.error('Run the Bare bundle through tsconfig.bare-bundle.json before bare-pack.')
  process.exit(1)
}

console.log('Bare bundle TypeScript boundary OK')
