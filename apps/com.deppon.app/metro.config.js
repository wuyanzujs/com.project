const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')
const { getMetroConfig } = require('@tarojs/rn-supporter')
const path = require('path')

const appRoot = __dirname
const workspaceRoot = path.resolve(appRoot, '../..')
const configuredMaxWorkers = Number(process.env.METRO_MAX_WORKERS)
const maxWorkers = Number.isInteger(configuredMaxWorkers) && configuredMaxWorkers > 0 ? configuredMaxWorkers : 2

/**
 * Metro 配置
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  maxWorkers,
  projectRoot: appRoot,
  watchFolders: [workspaceRoot],
  resolver: {
    nodeModulesPaths: [path.resolve(appRoot, 'node_modules'), path.resolve(workspaceRoot, 'node_modules')],
    unstable_enableSymlinks: true
  }
}

module.exports = (async function () {
  const merged = mergeConfig(getDefaultConfig(appRoot), await getMetroConfig(), config)
  // Taro 构建期会往 src/ 写 `.app.config.ts.<pid>.<uuid>.tmpdir` 临时文件并随即删除；
  // Metro 的 NodeWatcher 对这种「出现即消失」的文件存在 watch 竞态（ENOENT 直接把
  // Metro 进程打崩）。把它们排除出文件图（blockList 会透传为 metro-file-map 的
  // ignorePattern，watcher 同样忽略），临时文件本来也不该进模块图。
  merged.resolver.blockList = [merged.resolver.blockList, /(^|[/\\])\..+\.tmpdir$/].filter(Boolean)
  return merged
})()
