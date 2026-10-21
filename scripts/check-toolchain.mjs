import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

// 版本门禁只做一件事：让 Node/pnpm 版本不符合声明时立刻失败，而不是让后续检查在
// 一个未经验证的环境里运行。声明来源是 `.node-version` 和根 package.json 的 engines。

const repoRoot = process.cwd()
const violations = []

function readText(relativePath) {
  const filePath = path.join(repoRoot, relativePath)

  if (!existsSync(filePath)) {
    violations.push(`Missing required toolchain declaration: ${relativePath}`)
    return ''
  }

  return readFileSync(filePath, 'utf8')
}

function readPnpmVersion() {
  const userAgent = process.env.npm_config_user_agent ?? ''
  const fromUserAgent = /(?:^|\s)pnpm\/(\S+)/.exec(userAgent)

  if (fromUserAgent) return fromUserAgent[1]

  try {
    // shell:true resolves pnpm.cmd on Windows; the command string is static and has no arguments,
    // which avoids the DEP0190 shell-with-args warning.
    return execFileSync('pnpm --version', {
      cwd: repoRoot,
      encoding: 'utf8',
      shell: true
    }).trim()
  } catch {
    return ''
  }
}

const expectedNodeVersion = readText('.node-version').trim()
let rootPackage = {}

try {
  rootPackage = JSON.parse(readText('package.json') || '{}')
} catch (error) {
  violations.push(`Invalid JSON in package.json: ${error.message}`)
}

const expectedPnpmVersion = rootPackage.engines?.pnpm ?? ''
const actualNodeVersion = process.versions.node
const actualPnpmVersion = readPnpmVersion()

if (expectedNodeVersion && actualNodeVersion !== expectedNodeVersion) {
  violations.push(`Node.js must be ${expectedNodeVersion} (.node-version), found ${actualNodeVersion}. Switch versions with fnm/nvm and rerun pnpm install.`)
}

if (expectedPnpmVersion && actualPnpmVersion !== expectedPnpmVersion) {
  violations.push(
    `pnpm must be ${expectedPnpmVersion} (package.json engines.pnpm), found ${actualPnpmVersion || 'unknown'}. Run corepack enable then corepack prepare pnpm@${expectedPnpmVersion} --activate.`
  )
}

if (violations.length) {
  console.error('\nToolchain check failed:\n')
  for (const violation of violations) console.error(`- ${violation}`)
  console.error('\nInstall the pinned versions from .node-version and package.json engines before running any other check.\n')
  process.exit(1)
}

console.log(`Toolchain check passed: Node.js ${actualNodeVersion}, pnpm ${actualPnpmVersion}.`)
