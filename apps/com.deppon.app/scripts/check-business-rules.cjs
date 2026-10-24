const { spawnSync } = require('node:child_process')
const { readFileSync, readdirSync } = require('node:fs')
const path = require('node:path')

const appRoot = path.resolve(__dirname, '..')
const testRoot = path.join(__dirname, 'business-tests')
const structureOnly = process.argv.includes('--structure-only')
const domains = process.argv.slice(2).filter(value => value !== '--' && value !== '--structure-only')

function findTests(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      return findTests(file)
    }

    return entry.name.endsWith('.test.cjs') ? [file] : []
  })
}

const files = findTests(testRoot).sort()
const knownDomains = new Set(files.map(file => path.relative(testRoot, file).split(path.sep)[0]))
const unknownDomains = domains.filter(domain => !knownDomains.has(domain))
const oversized = files.filter(file => readFileSync(file, 'utf8').split('\n').length > 600)

if (oversized.length) {
  console.error('Business test files exceed the 600-line budget:')
  oversized.forEach(file => console.error(path.relative(appRoot, file)))
  process.exitCode = 1
} else if (unknownDomains.length) {
  console.error('Unknown test domains: ' + unknownDomains.join(', '))
  console.error('Available domains: ' + [...knownDomains].sort().join(', '))
  process.exitCode = 1
} else if (structureOnly) {
  console.log(`Business test structure OK: ${files.length} files in ${knownDomains.size} domains.`)
} else {
  const selected = files.filter(file => !domains.length || domains.includes(path.relative(testRoot, file).split(path.sep)[0]))
  const result = spawnSync(process.execPath, ['--test', '--test-concurrency=4', '--test-timeout=15000', '--test-reporter=spec', ...selected], {
    cwd: appRoot,
    stdio: 'inherit',
    env: { ...process.env, TZ: 'Asia/Shanghai' }
  })

  if (result.error) {
    console.error(result.error)
  }

  process.exitCode = result.status ?? 1
}
