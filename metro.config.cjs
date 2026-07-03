const { getDefaultConfig } = require('expo/metro-config')
const { existsSync } = require('node:fs')
const { dirname, resolve } = require('node:path')

const config = getDefaultConfig(__dirname)

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'sodium-native': require.resolve('sodium-javascript')
}

const defaultResolveRequest = config.resolver.resolveRequest

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const mappedModuleName = mapLocalJavaScriptSpecifierToTypeScriptSource(context, moduleName)

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, mappedModuleName, platform)
  }

  return context.resolveRequest(context, mappedModuleName, platform)
}

function mapLocalJavaScriptSpecifierToTypeScriptSource(context, moduleName) {
  if (!isLocalJavaScriptSpecifier(moduleName) || !context.originModulePath) return moduleName

  const sourceBase = moduleName.slice(0, -'.js'.length)
  const originDir = dirname(context.originModulePath)

  for (const extension of ['.ts', '.tsx']) {
    if (existsSync(resolve(originDir, `${sourceBase}${extension}`))) {
      return `${sourceBase}${extension}`
    }
  }

  return moduleName
}

function isLocalJavaScriptSpecifier(moduleName) {
  return (
    typeof moduleName === 'string' &&
    moduleName.endsWith('.js') &&
    (moduleName.startsWith('./') || moduleName.startsWith('../'))
  )
}

module.exports = config
