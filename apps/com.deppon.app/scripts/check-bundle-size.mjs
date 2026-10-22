import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { gzipSync } from 'node:zlib'

// Android 安装包里的 JS bundle 会被 APK 的 zip 再压缩一次，所以 gzip 体积比 raw 更接近
// 真实安装增量。两个指标都记录、都设预算：raw 防止明显回退，gzip 防止压缩后才暴露的膨胀。

const appRoot = process.cwd()
const relativeBundlePath = 'android/app/src/main/assets/index.android.bundle'
const bundlePath = path.join(appRoot, relativeBundlePath)
const baselinePath = path.join(appRoot, 'scripts', 'bundle-size-baseline.json')
const platform = 'android'
const TOLERANCE_RATIO = 0.03
const TOLERANCE_MIN_BYTES = 150 * 1024

const wantsUpdate = process.argv.includes('--update')
const reasonFlagIndex = process.argv.indexOf('--reason')
const inlineReason = process.argv.find(argument => argument.startsWith('--reason='))
const reason = (inlineReason ? inlineReason.slice('--reason='.length) : reasonFlagIndex >= 0 ? (process.argv[reasonFlagIndex + 1] ?? '') : '').trim()

function formatBytes(bytes) {
  const sign = bytes < 0 ? '-' : ''
  const absolute = Math.abs(bytes)
  const kib = absolute / 1024

  if (kib < 1024) return `${sign}${absolute.toLocaleString('en-US')} B (${kib.toFixed(1)} KiB)`

  return `${sign}${absolute.toLocaleString('en-US')} B (${(kib / 1024).toFixed(2)} MiB)`
}

function toleranceFor(baselineBytes) {
  return Math.max(Math.ceil(baselineBytes * TOLERANCE_RATIO), TOLERANCE_MIN_BYTES)
}

if (!existsSync(bundlePath)) {
  console.log(`[bundle-size] 跳过：${relativeBundlePath} 不存在（未出包的环境不参与体积门禁）。`)
  process.exit(0)
}

const rawBytes = statSync(bundlePath).size
const gzipBytes = gzipSync(readFileSync(bundlePath), { level: 9 }).length

if (wantsUpdate) {
  if (process.env.CI) {
    console.error('[bundle-size] CI 环境禁止更新体积基线。')
    process.exit(1)
  }

  if (!reason) {
    console.error('[bundle-size] 更新基线必须说明原因：node scripts/check-bundle-size.mjs --update --reason="..."')
    process.exit(1)
  }

  const nextBaseline = {
    [platform]: {
      rawBytes,
      gzipBytes,
      updatedAt: new Date().toISOString().slice(0, 10),
      reason
    }
  }

  writeFileSync(baselinePath, `${JSON.stringify(nextBaseline, null, 2)}\n`)
  console.log(`[bundle-size] 基线已更新：raw ${formatBytes(rawBytes)} / gzip ${formatBytes(gzipBytes)}`)
  console.log(`[bundle-size] 原因：${reason}`)
  process.exit(0)
}

if (!existsSync(baselinePath)) {
  console.error('[bundle-size] 缺少基线文件 scripts/bundle-size-baseline.json，先运行 pnpm --filter com.deppon.app run update:bundle-size-baseline')
  process.exit(1)
}

let baseline = null

try {
  baseline = JSON.parse(readFileSync(baselinePath, 'utf8'))[platform]
} catch (error) {
  console.error(`[bundle-size] 基线文件无法解析：${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}

if (!baseline || !Number.isFinite(baseline.rawBytes) || !Number.isFinite(baseline.gzipBytes) || baseline.rawBytes <= 0 || baseline.gzipBytes <= 0) {
  console.error('[bundle-size] 基线缺少有效的 rawBytes / gzipBytes，先运行 update:bundle-size-baseline 重新生成。')
  process.exit(1)
}

const rawTolerance = toleranceFor(baseline.rawBytes)
const gzipTolerance = toleranceFor(baseline.gzipBytes)
const rawLimit = baseline.rawBytes + rawTolerance
const gzipLimit = baseline.gzipBytes + gzipTolerance

console.log(`[bundle-size] ${relativeBundlePath}`)
console.log(`  raw : ${formatBytes(rawBytes)}（基线 ${formatBytes(baseline.rawBytes)}，容差 +${formatBytes(rawTolerance)}）`)
console.log(`  gzip: ${formatBytes(gzipBytes)}（基线 ${formatBytes(baseline.gzipBytes)}，容差 +${formatBytes(gzipTolerance)}）`)
console.log(`  基线: ${baseline.updatedAt}，${baseline.reason}`)

const violations = []

if (rawBytes > rawLimit) {
  violations.push(`raw 体积 ${formatBytes(rawBytes)} 超出预算 ${formatBytes(rawLimit)}（+${formatBytes(rawBytes - baseline.rawBytes)}）`)
}

if (gzipBytes > gzipLimit) {
  violations.push(`gzip 体积 ${formatBytes(gzipBytes)} 超出预算 ${formatBytes(gzipLimit)}（+${formatBytes(gzipBytes - baseline.gzipBytes)}）`)
}

if (violations.length) {
  console.error('\nBundle 体积超出预算。\n')

  for (const violation of violations) {
    console.error(`- ${violation}`)
  }

  console.error('\n若确认增长合理，请执行：')
  console.error('  node scripts/check-bundle-size.mjs --update --reason="<增长原因>"')
  console.error('并在 PR 描述里说明增长原因；不能只更新基线而不解释。')
  process.exit(1)
}

console.log(
  `[bundle-size] 通过：raw +${formatBytes(rawBytes - baseline.rawBytes)}，gzip +${formatBytes(gzipBytes - baseline.gzipBytes)}（容差按 3% 或 150 KiB 取较大者）`
)
