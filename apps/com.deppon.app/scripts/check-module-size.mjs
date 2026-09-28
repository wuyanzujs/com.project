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
  [
    'src/pages/invoice/apply/index.tsx',
    {
      max: 470,
      reason:
        '发票申请页复用同一套抬头、邮箱和提交流程承接运单开票与储值卡开票，当前冻结体量。'
    }
  ]
])

function toPosixPath(filePath) {
  return filePath.split(path.sep).join('/')
}

function walkFiles(directory) {
  if (!existsSync(directory)) {
    return []
  }

  return readdirSync(directory).flatMap(entry => {
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

  if (
    relativePath.endsWith('/types.ts') ||
    relativePath.endsWith('.types.ts')
  ) {
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
  const legacyBudget = legacyBudgets.get(relativePath)
  const budget = legacyBudget
    ? {
        max: legacyBudget.max,
        kind: 'documented',
        reason: legacyBudget.reason
      }
    : getDefaultBudget(relativePath)

  if (lineCount > budget.max) {
    violations.push({
      relativePath,
      lineCount,
      max: budget.max,
      kind: budget.kind,
      reason: budget.reason
    })
  }
}

if (violations.length) {
  console.error('Module size check failed.\n')

  for (const item of violations.sort((a, b) => b.lineCount - a.lineCount)) {
    console.error(
      `- ${item.relativePath}: ${item.lineCount} lines > ${item.max} (${item.kind}). ` +
        '请优先抽离有明确职责边界的 components、mapper、rules、useCases 或独立 service；' +
        '如果页面确属自然复杂，请先记录冻结预算和原因。'
    )

    if (item.reason) {
      console.error(`  当前冻结原因：${item.reason}`)
    }
  }

  process.exit(1)
}

console.log('Module size check passed.')
