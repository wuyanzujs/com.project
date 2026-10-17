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

// 行数之外增加低成本的职责复杂度信号。它们先作为预警，只有明显超出时才阻断，
// 避免把自然复杂的业务文件机械拆分成更难理解的小文件。
const complexityBudgets = {
  page: {
    functions: { base: 18, hard: 32 },
    decisions: { base: 45, hard: 90 }
  },
  service: {
    functions: { base: 20, hard: 36 },
    decisions: { base: 55, hard: 120 }
  },
  api: {
    functions: { base: 16, hard: 28 },
    decisions: { base: 45, hard: 90 }
  },
  types: {
    exports: { base: 100, hard: 160 }
  }
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

// 生成型纯数据文件不参与行数治理，豁免登记用于说明来源，避免后人误拆或误删。
const exemptFiles = new Map([
  ['src/services/gis/weatherRegionMap.ts', '由旧小程序城市数据集一次性转换生成的区县名到天气 adcode 离线映射，纯数据表不参与行数预算。']
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

function countMatches(content, pattern) {
  return content.match(pattern)?.length ?? 0
}

function measureComplexity(content, kind) {
  return {
    functions: countMatches(
      content,
      /\b(?:function|class)\s+[A-Za-z_$][\w$]*|\b(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/g
    ),
    decisions: countMatches(content, /\b(?:if|for|while|catch|case)\b|&&|\|\|/g),
    exports: kind === 'types' ? countMatches(content, /\bexport\s+(?:default\s+)?(?:const|function|class|interface|type)\b/g) : 0
  }
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
const complexityViolations = []
const complexityApproaching = []

for (const filePath of checkedRoots.flatMap(walkFiles)) {
  const relativePath = toPosixPath(path.relative(appRoot, filePath))

  if (exemptFiles.has(relativePath)) {
    continue
  }

  const lineCount = countLines(readFileSync(filePath, 'utf8'))
  const legacyBudget = legacyBudgets.get(relativePath)
  const budget = legacyBudget ? createBudget(legacyBudget.max, 'documented', legacyBudget.reason) : getDefaultBudget(relativePath)
  const content = readFileSync(filePath, 'utf8')
  const complexity = measureComplexity(content, budget.kind)
  const item = { relativePath, lineCount, complexity, ...budget }

  if (lineCount > budget.hard) {
    violations.push(item)
  } else if (lineCount > budget.base) {
    approaching.push(item)
  }

  for (const [metric, limits] of Object.entries(complexityBudgets[budget.kind] ?? {})) {
    const value = complexity[metric]

    if (value > limits.hard) {
      complexityViolations.push({ ...item, metric, value, limits })
    } else if (value > limits.base) {
      complexityApproaching.push({ ...item, metric, value, limits })
    }
  }
}

if (approaching.length) {
  console.warn('Module size check warning：以下文件已超过拆分基准，再增长 30% 即触发硬上限，请提前规划拆分。\n')

  for (const item of approaching.sort((a, b) => b.lineCount - a.lineCount)) {
    console.warn(`- ${item.relativePath}: ${item.lineCount} lines > 基准 ${item.base} (${item.kind})，硬上限 ${item.hard}`)
  }

  console.warn('')
}

if (complexityApproaching.length) {
  console.warn('Module complexity warning：以下文件的职责复杂度已接近治理上限，请优先拆分 rules、mapper、hooks 或 useCases。\n')

  for (const item of complexityApproaching.sort((a, b) => b.value - a.value)) {
    console.warn(`- ${item.relativePath}: ${item.metric}=${item.value} > 预警 ${item.limits.base}，硬上限 ${item.limits.hard}`)
  }

  console.warn('')
}

if (violations.length || complexityViolations.length) {
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

  for (const item of complexityViolations.sort((a, b) => b.value - a.value)) {
    console.error(
      `- ${item.relativePath}: ${item.metric}=${item.value} > 硬上限 ${item.limits.hard}（预警 ${item.limits.base}）。` +
        '请按职责拆分文件，避免继续增加状态、分支或导出。'
    )
  }

  process.exit(1)
}

console.log('Module size check passed.')
