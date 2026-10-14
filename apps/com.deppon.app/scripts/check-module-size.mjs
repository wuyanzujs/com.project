import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const appRoot = process.cwd()
const srcRoot = path.join(appRoot, 'src')
const sourceExtensions = new Set(['.ts', '.tsx'])

// 行数分两档：预算 ×1.3 为拆分基准，基准再 ×1.3 为硬上限。
// 超过基准只提示，超过硬上限即失败，必须先拆分文件。
const budgetRate = 13

const scaleBudget = value => Math.floor((value * budgetRate) / 10)

const createBudget = (max, kind, reason) => {
  const base = scaleBudget(max)

  return {
    base,
    hard: scaleBudget(base),
    kind,
    reason
  }
}

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
      reason: '发票申请页复用同一套抬头、邮箱和提交流程承接运单开票与储值卡开票，当前冻结体量。'
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
    return createBudget(defaultBudgets.page, 'page')
  }

  if (relativePath.endsWith('.api.ts')) {
    return createBudget(defaultBudgets.api, 'api')
  }

  if (relativePath.endsWith('/types.ts') || relativePath.endsWith('.types.ts')) {
    return createBudget(defaultBudgets.types, 'types')
  }

  return createBudget(defaultBudgets.service, 'service')
}

const checkedRoots = [path.join(srcRoot, 'pages'), path.join(srcRoot, 'services')]
const violations = []
const approaching = []

for (const filePath of checkedRoots.flatMap(walkFiles)) {
  const relativePath = toPosixPath(path.relative(appRoot, filePath))
  const lineCount = countLines(readFileSync(filePath, 'utf8'))
  const legacyBudget = legacyBudgets.get(relativePath)
  const budget = legacyBudget ? createBudget(legacyBudget.max, 'documented', legacyBudget.reason) : getDefaultBudget(relativePath)
  const item = { relativePath, lineCount, ...budget }

  if (lineCount > budget.hard) {
    violations.push(item)
  } else if (lineCount > budget.base) {
    approaching.push(item)
  }
}

if (approaching.length) {
  console.warn('Module size check warning：以下文件已超过拆分基准，再增长 30% 即触发硬上限，请提前规划拆分。\n')

  for (const item of approaching.sort((a, b) => b.lineCount - a.lineCount)) {
    console.warn(`- ${item.relativePath}: ${item.lineCount} lines > 基准 ${item.base} (${item.kind})，硬上限 ${item.hard}`)
  }

  console.warn('')
}

if (violations.length) {
  console.error('Module size check failed.\n')

  for (const item of violations.sort((a, b) => b.lineCount - a.lineCount)) {
    console.error(
      `- ${item.relativePath}: ${item.lineCount} lines > 硬上限 ${item.hard}（基准 ${item.base}，${item.kind}）。` +
        '已超过基准 30%，请拆分文件：优先抽离有明确职责边界的 components、mapper、rules、useCases 或独立 service；' +
        '如果页面确属自然复杂，请先记录冻结预算和原因。'
    )

    if (item.reason) {
      console.error(`  当前冻结原因：${item.reason}`)
    }
  }

  process.exit(1)
}

console.log('Module size check passed.')
