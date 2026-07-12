import path from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(scriptDirectory, '..')
const repoRoot = path.resolve(appRoot, '..', '..')
const reference = process.env.STYLE_GOVERNANCE_BASE_REF?.trim()
if (!reference || /^0+$/.test(reference)) {
  console.error('[style-governance] 发布门禁必须提供 STYLE_GOVERNANCE_BASE_REF')
  process.exit(1)
}

const verifyReference = spawnSync(
  'git',
  ['rev-parse', '--verify', '--quiet', `${reference}^{commit}`],
  { cwd: repoRoot, encoding: 'utf8' }
)
if (verifyReference.status !== 0) {
  console.error(`[style-governance] 发布基线 ref 无效：${reference}`)
  process.exit(1)
}

console.log(`[style-governance] 发布门禁参考基线：${reference}`)
const check = spawnSync(
  process.execPath,
  [path.join(scriptDirectory, 'check-style-governance.mjs')],
  {
    cwd: appRoot,
    env: {
      ...process.env,
      STYLE_GOVERNANCE_BASE_REF: reference
    },
    stdio: 'inherit'
  }
)

if (check.error) {
  console.error(
    `[style-governance] 发布基线门禁执行失败：${check.error.message}`
  )
  process.exit(1)
}

process.exit(check.status ?? 1)
