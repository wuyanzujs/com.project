import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

function collectRuleFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (entry.name === 'node_modules' || entry.name === '.git') return []
    const file = path.join(directory, entry.name)

    return entry.isDirectory() ? collectRuleFiles(file) : [file]
  })
}

// ESLint / Stylelint 只追踪配置与被检查文件；本地插件源码变化时也必须让旧缓存失效。
export function prepareLintCache(cacheFile, rulesDirectory) {
  const hash = createHash('sha256')

  for (const file of collectRuleFiles(rulesDirectory).sort()) {
    hash.update(path.relative(rulesDirectory, file).replaceAll('\\', '/')).update('\0').update(readFileSync(file)).update('\0')
  }

  const fingerprint = hash.digest('hex')
  const fingerprintFile = `${cacheFile}.rules`

  if (!existsSync(fingerprintFile) || readFileSync(fingerprintFile, 'utf8') !== fingerprint) {
    rmSync(cacheFile, { force: true })
    writeFileSync(fingerprintFile, fingerprint)
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const appRoot = fileURLToPath(new URL('..', import.meta.url))
  const tools = {
    eslint: { cache: '.eslintcache', rules: path.resolve(appRoot, '../../packages/eslint-plugin-app') },
    stylelint: { cache: '.stylelintcache', rules: path.join(appRoot, 'scripts/stylelint-rules') }
  }
  const tool = tools[process.argv[2]]

  if (!tool) throw new Error('Expected lint tool: eslint or stylelint')
  prepareLintCache(path.join(appRoot, tool.cache), tool.rules)
}
