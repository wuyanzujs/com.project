import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const repoRoot = process.cwd()
const violations = []

function readRequired(relativePath) {
  const filePath = path.join(repoRoot, relativePath)

  if (!existsSync(filePath)) {
    violations.push(`Missing required configuration: ${relativePath}`)
    return ''
  }

  return readFileSync(filePath, 'utf8')
}

function readJson(relativePath) {
  const content = readRequired(relativePath)

  if (!content) return {}

  try {
    return JSON.parse(content)
  } catch (error) {
    violations.push(`Invalid JSON in ${relativePath}: ${error.message}`)
    return {}
  }
}

function requireIncludes(content, expected, label) {
  if (!content.includes(expected)) {
    violations.push(`${label} is missing: ${expected}`)
  }
}

function hasExactLine(content, expected) {
  return content.split(/\r?\n/).some(line => line.trim() === expected)
}

function readWorkflowJob(content, jobName) {
  const lines = content.split(/\r?\n/)
  const start = lines.findIndex(line => new RegExp(`^  ${jobName}:\\s*$`).test(line))

  if (start < 0) return ''

  const end = lines.findIndex((line, index) => index > start && /^ {2}[A-Za-z0-9_-]+:\s*$/.test(line))

  return lines.slice(start, end < 0 ? lines.length : end).join('\n')
}

function listWorktreeCrlfFiles() {
  let output = ''

  try {
    output = execFileSync('git', ['ls-files', '--eol'], { cwd: repoRoot, encoding: 'utf8' })
  } catch {
    console.warn('[WARN] Skip the worktree EOL check: git is unavailable.')
    return []
  }

  return output
    .split('\n')
    .filter(line => /^i\/(?:lf|none)\s+w\/(?:crlf|mixed)\s/.test(line))
    .map(line => line.slice(line.indexOf('\t') + 1).trim())
    .filter(file => file && !file.endsWith('.bat'))
}

const rootPackage = readJson('package.json')
const appPackage = readJson('apps/com.deppon.app/package.json')
const nodeVersion = readRequired('.node-version').trim()
const nvmrcVersion = readRequired('.nvmrc').trim()
const workspaceConfig = readRequired('pnpm-workspace.yaml')
const prettierIgnore = readRequired('.prettierignore')
const preCommit = readRequired('.husky/pre-commit')
const androidReleaseWorkflow = readRequired('.github/workflows/android-release.yml')
const androidBuildGradle = readRequired('apps/com.deppon.app/android/build.gradle')
const androidAppBuildGradle = readRequired('apps/com.deppon.app/android/app/build.gradle')
const androidGemfile = readRequired('apps/com.deppon.app/android/Gemfile')
const iosXcodeEnv = readRequired('apps/com.deppon.app/ios/.xcode.env')
const lockfile = readRequired('pnpm-lock.yaml')
const gitAttributes = readRequired('.gitattributes')

if (rootPackage.engines?.node !== nodeVersion) {
  violations.push(`package.json engines.node must match .node-version (${nodeVersion || 'missing'}).`)
}

if (rootPackage.packageManager !== `pnpm@${rootPackage.engines?.pnpm}`) {
  violations.push('packageManager must match engines.pnpm exactly.')
}

if (nvmrcVersion !== nodeVersion) {
  violations.push('.nvmrc must match .node-version so nvm and fnm users get the same Node.js version.')
}

for (const entry of ['apps/*', 'packages/*']) {
  requireIncludes(workspaceConfig, entry, 'pnpm workspace package pattern')
}

for (const ignoredPath of [
  'apps/*/android/',
  'apps/*/ios/',
  'apps/*/config/',
  'apps/*/.github/',
  'apps/*/babel.config.js',
  'apps/*/metro.config.js',
  'apps/*/tsconfig.json',
  '.github/',
  '.husky/'
]) {
  if (hasExactLine(prettierIgnore, ignoredPath)) {
    violations.push(`.prettierignore must not exclude maintained configuration: ${ignoredPath}`)
  }
}

for (const ignoredPath of ['apps/*/android/app/build/', 'apps/*/ios/Pods/', 'pnpm-lock.yaml', 'apps/*/types/']) {
  if (!hasExactLine(prettierIgnore, ignoredPath)) {
    violations.push(`.prettierignore must exclude generated state: ${ignoredPath}`)
  }
}

// 工作区行尾必须锁定为 LF：与 core.autocrlf 的 CRLF 检出冲突时会产生内容相同的假改动
if (!/^\*\s+text=auto\s+eol=lf\s*$/m.test(gitAttributes)) {
  violations.push('.gitattributes must normalize every tracked file to LF with: * text=auto eol=lf')
}

const worktreeCrlfFiles = listWorktreeCrlfFiles()
const shownCrlfFiles = worktreeCrlfFiles.slice(0, 5).join(', ')
const crlfRemainder = worktreeCrlfFiles.length > 5 ? ` (+${worktreeCrlfFiles.length - 5})` : ''

if (worktreeCrlfFiles.length) {
  violations.push(
    `Tracked text files must stay LF in the worktree, CRLF copies show up as empty diffs: ${shownCrlfFiles}${crlfRemainder}. Run: git add --renormalize .`
  )
}

if (preCommit.includes('apps/com.deppon.app/node_modules/.bin')) {
  violations.push('The pre-commit hook must not depend on a single App node_modules path.')
}

if (!preCommit.includes('pnpm exec lint-staged')) {
  violations.push('The pre-commit hook must invoke root lint-staged through pnpm.')
}

const stagedConfig = rootPackage['lint-staged'] ?? {}
const stagedPatterns = Object.keys(stagedConfig)

if (!stagedPatterns.some(pattern => pattern.includes('apps/com.deppon.app/src/'))) {
  violations.push('lint-staged must cover App source files.')
}

for (const directory of ['config', 'scripts']) {
  if (!stagedPatterns.some(pattern => pattern.includes(`apps/com.deppon.app/${directory}/`))) {
    violations.push(`lint-staged must cover App ${directory} files.`)
  }

  const stagedTasks = Object.entries(stagedConfig)
    .filter(([pattern]) => pattern.includes(`apps/com.deppon.app/${directory}/`))
    .flatMap(([, tasks]) => (Array.isArray(tasks) ? tasks : [tasks]))

  if (!stagedTasks.some(task => task.includes('eslint'))) {
    violations.push(`lint-staged must run ESLint on App ${directory} files.`)
  }
}

if (!stagedPatterns.some(pattern => pattern.includes('yml'))) {
  violations.push('lint-staged must cover workflow YAML files.')
}

for (const scriptName of ['check:toolchain', 'format:config:check', 'check:repo-config', 'verify:config']) {
  if (!rootPackage.scripts?.[scriptName]) {
    violations.push(`Root package script is missing: ${scriptName}`)
  }
}

if (!rootPackage.scripts?.['verify:config']?.includes('check:toolchain')) {
  violations.push('verify:config must fail fast through check:toolchain before other checks run.')
}

if (!rootPackage.scripts?.['verify:app']?.includes('verify:config')) {
  violations.push('verify:app must include repository configuration verification.')
}

// CI 必须用与本地相同的 Node/pnpm 版本，否则“我这里能跑”会重新出现。
const workflowDirectory = path.join(repoRoot, '.github/workflows')
const workflowFiles = existsSync(workflowDirectory) ? readdirSync(workflowDirectory).filter(file => /\.ya?ml$/.test(file)) : []

if (!workflowFiles.length) {
  violations.push('.github/workflows must keep the CI workflows that run pnpm verify:app.')
}

for (const file of workflowFiles) {
  const workflowPath = `.github/workflows/${file}`
  const workflowContent = readRequired(workflowPath)

  for (const match of workflowContent.matchAll(/node-version:\s*['"]?(\d[^\s'"]*)/g)) {
    if (match[1] !== nodeVersion) {
      violations.push(`${workflowPath} pins Node ${match[1]}, but .node-version pins ${nodeVersion}.`)
    }
  }

  for (const match of workflowContent.matchAll(/pnpm\/action-setup@v4[\s\S]{0,160}?version:\s*['"]?([\w.-]+)/g)) {
    if (match[1] !== rootPackage.engines?.pnpm) {
      violations.push(`${workflowPath} pins pnpm ${match[1]}, but engines.pnpm pins ${rootPackage.engines?.pnpm}.`)
    }
  }
}

const appQualityWorkflow = readRequired('.github/workflows/app-quality.yml')

requireIncludes(appQualityWorkflow, 'pnpm install --frozen-lockfile', 'App quality workflow install step')
requireIncludes(appQualityWorkflow, 'pnpm verify:app', 'App quality workflow verification entry')

// 静态门禁与原生 SDK 环境必须是两个 job：PR 的静态反馈不能等 NDK/cmake 安装。
const staticJob = readWorkflowJob(appQualityWorkflow, 'static')
const nativeEnvJob = readWorkflowJob(appQualityWorkflow, 'native-env')

for (const [jobName, job] of [
  ['static', staticJob],
  ['native-env', nativeEnvJob]
]) {
  if (!job) {
    violations.push(`App quality workflow must define a ${jobName} job.`)
    continue
  }

  if (!job.includes('pnpm install --frozen-lockfile')) {
    violations.push(`App quality ${jobName} job must install dependencies with pnpm install --frozen-lockfile.`)
  }
}

if (staticJob && !staticJob.includes('pnpm verify:app')) {
  violations.push('App quality static job must run pnpm verify:app.')
}

if (staticJob && /sdkmanager/.test(staticJob)) {
  violations.push('App quality static job must not install Android SDK packages; keep them in native-env.')
}

if (nativeEnvJob && !nativeEnvJob.includes('sdkmanager --install')) {
  violations.push('App quality native-env job must install the Android SDK packages it verifies.')
}

if (nativeEnvJob && !nativeEnvJob.includes('pnpm check:app-native-env:android')) {
  violations.push('App quality native-env job must run pnpm check:app-native-env:android.')
}

if (!appPackage.scripts?.['check:bundle-size']?.includes('check-bundle-size.mjs')) {
  violations.push('App package must expose check:bundle-size for the bundle size budget gate.')
}

if (!appPackage.scripts?.['update:bundle-size-baseline']?.includes('--update')) {
  violations.push('App package must expose update:bundle-size-baseline with the --update flag.')
}

for (const relativePath of ['apps/com.deppon.app/scripts/check-bundle-size.mjs', 'apps/com.deppon.app/scripts/bundle-size-baseline.json']) {
  if (!existsSync(path.join(repoRoot, relativePath))) {
    violations.push(`Bundle size gate file is missing: ${relativePath}`)
  }
}

if (!appPackage.scripts?.['lint:config']) {
  violations.push('App package must expose lint:config for configuration-only checks.')
}

if (!appPackage.scripts?.['lint:config']?.includes('prettier --check')) {
  violations.push('App lint:config must run the configuration and script formatting check.')
}

for (const scriptName of ['lint', 'lint:config', 'lint:fix']) {
  const lintScript = appPackage.scripts?.[scriptName] ?? ''

  if (!lintScript.includes('eslint') || ['config/', 'scripts/'].some(directory => !lintScript.includes(directory))) {
    violations.push(`App ${scriptName} must run ESLint on configuration and script files.`)
  }
}

if (appPackage.dependencies?.['expo-camera'] !== '14.1.3') {
  violations.push('expo-camera must be a direct, exact App dependency because Android Gradle resolves its local Maven repository.')
}

if (!/expo-camera:\r?\n\s+specifier: 14\.1\.3/m.test(lockfile)) {
  violations.push('pnpm-lock.yaml must record expo-camera as the App direct dependency.')
}

requireIncludes(androidBuildGradle, 'expo-camera Android Maven repository is missing', 'Android Gradle Expo Camera dependency guard')

if (/org\.webkit:android-jsc:\+/.test(androidAppBuildGradle)) {
  violations.push('Android JSC must use a fixed Maven version, not +.')
}

requireIncludes(androidAppBuildGradle, 'org.webkit:android-jsc:r174650', 'Android fixed JSC dependency')

if (!/gem ['\"]fastlane['\"], ['\"]= 2\.238\.0['\"]/.test(androidGemfile)) {
  violations.push('Android Fastlane must use the reviewed exact fastlane version.')
}

const bundleCommand = 'pnpm --filter com.deppon.app run bundle:android:production'
const bundleIndex = androidReleaseWorkflow.indexOf(bundleCommand)
const assembleIndex = androidReleaseWorkflow.indexOf('./gradlew assembleRelease')

if (bundleIndex < 0 || assembleIndex < 0 || bundleIndex > assembleIndex) {
  violations.push('Android release workflow must generate the production RN bundle before Gradle assembles the APK.')
}

const bundleSizeIndex = androidReleaseWorkflow.indexOf('check:bundle-size')
const keystoreIndex = androidReleaseWorkflow.indexOf('Decode release keystore')

if (bundleSizeIndex < 0 || keystoreIndex < 0 || bundleSizeIndex < bundleIndex || bundleSizeIndex > keystoreIndex) {
  violations.push(
    'Android release workflow must check the bundle size budget after building the production RN bundle and before decoding the release keystore.'
  )
}

requireIncludes(androidReleaseWorkflow, 'pnpm check:app-native-env', 'Android release native environment gate')
requireIncludes(iosXcodeEnv, '.node-version', 'iOS Node version guard')
requireIncludes(iosXcodeEnv, 'NODE_BINARY', 'iOS Node version guard')

const missingNativeLocks = ['apps/com.deppon.app/android/Gemfile.lock', 'apps/com.deppon.app/ios/Podfile.lock'].filter(
  relativePath => !existsSync(path.join(repoRoot, relativePath))
)

if (missingNativeLocks.length) {
  console.warn(`[WARN] Generate and commit native release locks on macOS before enabling iOS archive release: ${missingNativeLocks.join(', ')}`)
}

if (violations.length) {
  console.error('\nRepository configuration check failed:\n')
  for (const violation of violations) console.error(`- ${violation}`)
  process.exit(1)
}

console.log('Repository configuration check passed.')
