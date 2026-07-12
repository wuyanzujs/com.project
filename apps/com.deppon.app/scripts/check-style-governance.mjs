import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import {
  collectProjectSnapshot,
  compareBaselineEvolution,
  compareSnapshot,
  createNextBaseline,
  getSnapshotSummary
} from './style-governance-lib.mjs'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(scriptDirectory, '..')
const baselinePath = path.join(
  scriptDirectory,
  'style-governance-baseline.json'
)
const repoRoot = path.resolve(appRoot, '..', '..')
const baselineRepoPath =
  'apps/com.deppon.app/scripts/style-governance-baseline.json'
const supportedModes = new Map([
  ['', 'daily'],
  ['--strict', 'strict'],
  ['--report', 'report'],
  ['--update-baseline', 'update']
])
const argumentKey = process.argv.slice(2).join(' ')
const mode = supportedModes.get(argumentKey)

const isTruthyEnvironmentValue = value =>
  new Set(['1', 'true', 'yes', 'on']).has(
    String(value ?? '')
      .trim()
      .toLowerCase()
  )

if (!mode) {
  console.error(
    '[style-governance] 参数无效。支持：--strict、--report、--update-baseline'
  )
  process.exit(1)
}

const readBaseline = () => {
  try {
    return JSON.parse(fs.readFileSync(baselinePath, 'utf8'))
  } catch (error) {
    console.error(
      `[style-governance] 无法读取基线：${error instanceof Error ? error.message : String(error)}`
    )
    process.exit(1)
  }
}

const readReferenceBaseline = reference => {
  if (!reference || /^0+$/.test(reference)) return null

  try {
    const content = execFileSync(
      'git',
      ['show', `${reference}:${baselineRepoPath}`],
      { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    )
    return JSON.parse(content)
  } catch (error) {
    console.error(
      `[style-governance] 无法读取参考基线 ${reference}：${error instanceof Error ? error.message : String(error)}`
    )
    process.exit(1)
  }
}

const printSummary = snapshot => {
  const summary = getSnapshotSummary(snapshot)
  const adoption = summary.scssFiles
    ? ((summary.tokenFiles / summary.scssFiles) * 100).toFixed(1)
    : '100.0'

  console.log(
    `[style-governance] 业务 SCSS ${summary.scssFiles} 个，共 ${summary.lines} 行，token 接入 ${summary.tokenFiles} 个（${adoption}%）`
  )
  console.log(
    `[style-governance] 存量：颜色 ${summary.rawColors}，字号 ${summary.rawFontSizes}，行高 ${summary.rawLineHeights}，圆角 ${summary.rawRadii}，字重 ${summary.rawFontWeights}`
  )
  console.log(
    `[style-governance] Native 颜色 ${summary.nativeColors}，父样式导入 ${summary.parentStyleImports}，legacy 全局类文件 ${summary.legacyGlobalClassFiles}，原生点击控件 ${summary.nativeClickHandlers}`
  )
}

const printFailures = (failures, limit = 80) => {
  for (const failure of failures.slice(0, limit)) {
    console.error(`- ${failure}`)
  }
  if (failures.length > limit) {
    console.error(
      `- 其余 ${failures.length - limit} 项已省略，请使用 --report 查看治理概况`
    )
  }
}

const writeBaseline = baseline => {
  const temporaryPath = `${baselinePath}.tmp-${process.pid}`
  fs.writeFileSync(temporaryPath, `${JSON.stringify(baseline, null, 2)}\n`)
  fs.renameSync(temporaryPath, baselinePath)
}

const baseline = readBaseline()
const snapshot = collectProjectSnapshot(appRoot)
printSummary(snapshot)

const referenceBaseline = readReferenceBaseline(
  process.env.STYLE_GOVERNANCE_BASE_REF
)
if (referenceBaseline && mode !== 'report') {
  const evolution = compareBaselineEvolution(baseline, referenceBaseline)
  if (!evolution.ok) {
    console.error('[style-governance] 基线不得放宽：')
    printFailures(evolution.failures)
    process.exit(1)
  }
  if (evolution.migratedFromV1) {
    console.log('[style-governance] 已校验 v1 到 v2 的一次性基线迁移')
  }
}

if (mode === 'report') {
  const strictResult = compareSnapshot(snapshot, baseline, { strict: true })
  if (strictResult.ok) {
    console.log('[style-governance] 全量 CSS 治理目标已满足')
  } else {
    console.log(
      `[style-governance] 严格门禁尚有 ${strictResult.failures.length} 项待治理`
    )
    const debtFiles = Object.entries(snapshot.scss.files)
      .map(([file, metrics]) => ({
        file,
        debt:
          metrics.rawColors +
          metrics.rawFontSizes +
          metrics.rawLineHeights +
          metrics.rawRadii +
          metrics.rawFontWeights,
        lines: metrics.lines
      }))
      .sort((left, right) => right.debt - left.debt || right.lines - left.lines)
      .slice(0, 10)

    console.log('[style-governance] 优先治理文件：')
    for (const item of debtFiles) {
      console.log(`- ${item.file}：视觉字面量 ${item.debt}，${item.lines} 行`)
    }
  }
  process.exit(0)
}

if (mode === 'update') {
  if (isTruthyEnvironmentValue(process.env.CI)) {
    console.error('[style-governance] CI 环境禁止更新样式基线')
    process.exit(1)
  }

  const update = createNextBaseline(snapshot, baseline)
  if (!update.ok) {
    console.error('[style-governance] 基线更新被拒绝：')
    printFailures(update.failures)
    process.exit(1)
  }

  writeBaseline(update.baseline)
  console.log('[style-governance] 基线已收紧到当前逐文件状态')
  process.exit(0)
}

const result = compareSnapshot(snapshot, baseline, {
  strict: mode === 'strict'
})

if (!result.ok) {
  console.error(
    mode === 'strict'
      ? `[style-governance] 严格门禁失败，共 ${result.failures.length} 项：`
      : '[style-governance] 日常门禁失败：'
  )
  printFailures(result.failures)
  process.exit(1)
}

console.log(
  mode === 'strict'
    ? '[style-governance] 严格门禁通过（全量 CSS 治理完成）'
    : '[style-governance] 日常门禁通过（逐文件债务只降不增）'
)
