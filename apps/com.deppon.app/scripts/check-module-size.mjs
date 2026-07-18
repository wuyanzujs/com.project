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
    'src/pages/express/index.tsx',
    {
      max: 720,
      reason:
        '寄件页保留页面级请求、表单状态、扫码上下文与模板入口编排；展示区已拆为 components，草稿变更规则已下沉 express.mutations，当前冻结体量。'
    }
  ],
  [
    'src/pages/order/list/index.tsx',
    {
      max: 460,
      reason:
        '订单列表页承接筛选、分页、取消、删除、修改和再寄流程；展示组件与筛选组件已独立拆分，当前冻结页面编排体量，避免为了行数机械拆分。'
    }
  ],
  [
    'src/pages/invoice/index/index.tsx',
    {
      max: 780,
      reason:
        '发票中心页保留可开票、储值卡、历史、抬头四个 tab 的请求和交互编排；身份验证缓存、倒计时、校验和路由视图模型已拆出，当前冻结体量。'
    }
  ],
  [
    'src/pages/invoice/apply/index.tsx',
    {
      max: 500,
      reason:
        '发票申请页复用同一套抬头、邮箱和提交流程承接运单开票与储值卡开票，当前冻结体量。'
    }
  ],
  [
    'src/pages/invoice/detail/index.tsx',
    {
      max: 620,
      reason:
        '发票详情页承接历史记录展示、纸质发票收票地址修改、邮箱发送、包含运单加载以及撤销/作废动作，当前冻结体量，避免为了行数机械拆分。'
    }
  ],
  [
    'src/pages/order/stub/index.tsx',
    {
      max: 565,
      reason: '电子存根页以只读分区展示为主，当前冻结体量。'
    }
  ],
  [
    'src/pages/payment/list/index.tsx',
    {
      max: 480,
      reason:
        '支付列表页承接待支付/已支付状态、寄收角色、分页搜索、支付动作和评价入口，当前冻结体量，避免为了行数机械拆分。'
    }
  ],
  [
    'src/pages/query/price/index.tsx',
    {
      max: 465,
      reason: '价格时效页包含查询表单和结果承接，当前冻结体量。'
    }
  ],
  [
    'src/pages/query/stations/index.tsx',
    {
      max: 455,
      reason:
        '网点查询页承接查询表单、列表操作、空结果寄件兜底和反馈 H5 入口，当前冻结体量，避免为了行数机械拆分。'
    }
  ],
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
