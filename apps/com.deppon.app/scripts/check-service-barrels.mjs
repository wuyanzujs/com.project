import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

// service barrel 里的 `export *` 会把整个领域绑在一起，对外契约也不可见。
// 这里只管运行时模块（api/service/mapper/rules/bridge...），`./types` 之类的纯类型转发不计入：
// 类型在运行时被擦除，收敛它们没有收益。

const appRoot = process.cwd()
const servicesRoot = path.join(appRoot, 'src', 'services')
const baselinePath = path.join(appRoot, 'scripts', 'service-barrels-baseline.json')
const EXPORT_STAR_PATTERN = /^export \* from '([^']+)'/gm
const TYPE_TARGET_PATTERN = /(?:^|\/)(?:types|[^/]*\.types)$/

const isTypeTarget = target => TYPE_TARGET_PATTERN.test(target)

function collectBarrels() {
  const files = {}

  for (const entry of readdirSync(servicesRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue
    }

    const indexPath = path.join(servicesRoot, entry.name, 'index.ts')

    if (!existsSync(indexPath)) {
      continue
    }

    const runtimeTargets = [...readFileSync(indexPath, 'utf8').matchAll(EXPORT_STAR_PATTERN)].map(match => match[1]).filter(target => !isTypeTarget(target))

    if (runtimeTargets.length) {
      files[`src/services/${entry.name}/index.ts`] = runtimeTargets.length
    }
  }

  const total = Object.values(files).reduce((sum, count) => sum + count, 0)

  return { total, files }
}

const current = collectBarrels()
const wantsUpdate = process.argv.includes('--update-baseline')

if (wantsUpdate) {
  if (process.env.CI) {
    console.error('CI 环境禁止更新 barrel 基线')
    process.exit(1)
  }

  writeFileSync(baselinePath, `${JSON.stringify(current, null, 2)}\n`)
  console.log(`[barrels] 基线已更新：${current.total} 条运行时 export *，覆盖 ${Object.keys(current.files).length} 个领域`)
  process.exit(0)
}

if (!existsSync(baselinePath)) {
  console.error('[barrels] 缺少基线文件，先运行 pnpm --filter com.deppon.app run update:barrels-baseline')
  process.exit(1)
}

const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'))
const violations = []
const tightened = []

for (const [file, count] of Object.entries(current.files)) {
  const allowed = baseline.files[file] ?? 0

  if (count > allowed) {
    violations.push(`${file}: 运行时 export * 从 ${allowed} 增加到 ${count}。请在 barrel 里写显式导出，或在确认确有必要的 PR 里说明理由。`)
  } else if (count < allowed) {
    tightened.push(`${file}: 可从 ${allowed} 收紧到 ${count}`)
  }
}

if (current.total > baseline.total) {
  violations.push(`运行时 export * 总数从 ${baseline.total} 增加到 ${current.total}。`)
}

if (violations.length) {
  console.error('Service barrel check failed.\n')

  for (const violation of violations) {
    console.error(`- ${violation}`)
  }

  console.error('\nbarrel 收敛原则：index.ts 只做显式再导出；新增领域不要用 export *。')
  process.exit(1)
}

if (tightened.length) {
  console.warn('[barrels] 以下 barrel 已比基线更收敛，可以更新基线：')

  for (const item of tightened) {
    console.warn(`- ${item}`)
  }
}

console.log(`[barrels] 通过：${current.total} 条运行时 export *（基线 ${baseline.total}）`)
