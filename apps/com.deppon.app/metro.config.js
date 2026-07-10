const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')
const { getMetroConfig } = require('@tarojs/rn-supporter')
const path = require('path')

const appRoot = __dirname
const workspaceRoot = path.resolve(appRoot, '../..')
const configuredMaxWorkers = Number(process.env.METRO_MAX_WORKERS)
const maxWorkers =
  Number.isInteger(configuredMaxWorkers) && configuredMaxWorkers > 0
    ? configuredMaxWorkers
    : 2

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  maxWorkers,
  projectRoot: appRoot,
  watchFolders: [workspaceRoot],
  resolver: {
    nodeModulesPaths: [
      path.resolve(appRoot, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules')
    ],
    unstable_enableSymlinks: true
  }
}

module.exports = (async function (){
  return mergeConfig(getDefaultConfig(appRoot), await getMetroConfig(), config)
})()
