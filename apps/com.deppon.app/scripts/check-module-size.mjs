import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const appRoot = process.cwd()
const srcRoot = path.join(appRoot, 'src')
const sourceExtensions = new Set(['.ts', '.tsx'])

const defaultBudgets = {
  page: 420,
  service: 450,
  api: 360,
  types: 700
}

const legacyBudgets = new Map([
  ['src/pages/express/index.tsx', 750],
  ['src/pages/order/detail/index.tsx', 1190],
  ['src/pages/invoice/index/index.tsx', 950],
  ['src/pages/order/list/index.tsx', 685],
  ['src/pages/order/stub/index.tsx', 565],
  ['src/pages/query/price/index.tsx', 465],
  ['src/services/order/order.service.ts', 1675],
  ['src/services/express/express.service.ts', 930],
  ['src/services/invoice/invoice.service.ts', 810],
  ['src/services/query/query.service.ts', 585]
])

function toPosixPath(filePath) {
  return filePath.split(path.sep).join('/')
}

function walkFiles(directory) {
  if (!existsSync(directory)) {
    return []
  }

  return readdirSync(directory).flatMap((entry) => {
    const fullPath = path.join(directory, entry)
    const stats = statSync(fullPath)

    if (stats.isDirectory()) {
      return walkFiles(fullPath)
    }

    if (sourceExtensions.has(path.extname(fullPath))) {
      return [fullPath]
    }

    return []
  })
}

function countLines(content) {
  if (!content) {
    return 0
  }

  return content.replace(/\r\n/g, '\n').split('\n').length
}

function getDefaultBudget(relativePath) {
  if (relativePath.startsWith('src/pages/')) {
    return {
      max: defaultBudgets.page,
      kind: 'page'
    }
  }

  if (relativePath.endsWith('.api.ts')) {
    return {
      max: defaultBudgets.api,
      kind: 'api'
    }
  }

  if (relativePath.endsWith('/types.ts') || relativePath.endsWith('.types.ts')) {
    return {
      max: defaultBudgets.types,
      kind: 'types'
    }
  }

  return {
    max: defaultBudgets.service,
    kind: 'service'
  }
}

const checkedRoots = [
  path.join(srcRoot, 'pages'),
  path.join(srcRoot, 'services')
]
const violations = []

for (const filePath of checkedRoots.flatMap(walkFiles)) {
  const relativePath = toPosixPath(path.relative(appRoot, filePath))
  const lineCount = countLines(readFileSync(filePath, 'utf8'))
  const legacyMax = legacyBudgets.get(relativePath)
  const budget = legacyMax
    ? {
        max: legacyMax,
        kind: 'legacy'
      }
    : getDefaultBudget(relativePath)

  if (lineCount > budget.max) {
    violations.push({
      relativePath,
      lineCount,
      max: budget.max,
      kind: budget.kind
    })
  }
}

if (violations.length) {
  console.error('Module size check failed.\n')

  for (const item of violations.sort((a, b) => b.lineCount - a.lineCount)) {
    console.error(
      `- ${item.relativePath}: ${item.lineCount} lines > ${item.max} (${item.kind}). ` +
        '请拆到 components、mapper、rules、useCases 或独立 service 后再继续。'
    )
  }

  process.exit(1)
}

console.log('Module size check passed.')
