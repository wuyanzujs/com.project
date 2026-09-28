import { existsSync, readFileSync } from 'node:fs'
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

const rootPackage = readJson('package.json')
const appPackage = readJson('apps/com.deppon.app/package.json')
const nodeVersion = readRequired('.node-version').trim()
const workspaceConfig = readRequired('pnpm-workspace.yaml')
const prettierIgnore = readRequired('.prettierignore')
const preCommit = readRequired('.husky/pre-commit')
const androidReleaseWorkflow = readRequired(
  '.github/workflows/android-release.yml'
)
const androidBuildGradle = readRequired(
  'apps/com.deppon.app/android/build.gradle'
)
const androidAppBuildGradle = readRequired(
  'apps/com.deppon.app/android/app/build.gradle'
)
const androidGemfile = readRequired('apps/com.deppon.app/android/Gemfile')
const iosXcodeEnv = readRequired('apps/com.deppon.app/ios/.xcode.env')
const lockfile = readRequired('pnpm-lock.yaml')

if (rootPackage.engines?.node !== nodeVersion) {
  violations.push(
    `package.json engines.node must match .node-version (${nodeVersion || 'missing'}).`
  )
}

if (rootPackage.packageManager !== `pnpm@${rootPackage.engines?.pnpm}`) {
  violations.push('packageManager must match engines.pnpm exactly.')
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
    violations.push(
      `.prettierignore must not exclude maintained configuration: ${ignoredPath}`
    )
  }
}

for (const ignoredPath of [
  'apps/*/android/app/build/',
  'apps/*/ios/Pods/',
  'pnpm-lock.yaml',
  'apps/*/types/'
]) {
  if (!hasExactLine(prettierIgnore, ignoredPath)) {
    violations.push(
      `.prettierignore must exclude generated state: ${ignoredPath}`
    )
  }
}

if (preCommit.includes('apps/com.deppon.app/node_modules/.bin')) {
  violations.push(
    'The pre-commit hook must not depend on a single App node_modules path.'
  )
}

if (!preCommit.includes('pnpm exec lint-staged')) {
  violations.push(
    'The pre-commit hook must invoke root lint-staged through pnpm.'
  )
}

const stagedConfig = rootPackage['lint-staged'] ?? {}
const stagedPatterns = Object.keys(stagedConfig)

if (
  !stagedPatterns.some(pattern => pattern.includes('apps/com.deppon.app/src/'))
) {
  violations.push('lint-staged must cover App source files.')
}

if (!stagedPatterns.some(pattern => pattern.includes('{config,scripts}'))) {
  violations.push('lint-staged must format App configuration and scripts.')
}

if (!stagedPatterns.some(pattern => pattern.includes('yml'))) {
  violations.push('lint-staged must cover workflow YAML files.')
}

for (const scriptName of [
  'format:config:check',
  'check:repo-config',
  'verify:config'
]) {
  if (!rootPackage.scripts?.[scriptName]) {
    violations.push(`Root package script is missing: ${scriptName}`)
  }
}

if (!rootPackage.scripts?.['verify:app']?.includes('verify:config')) {
  violations.push(
    'verify:app must include repository configuration verification.'
  )
}

if (!appPackage.scripts?.['lint:config']) {
  violations.push(
    'App package must expose lint:config for configuration-only checks.'
  )
}

if (!appPackage.scripts['lint:config'].includes('prettier --check')) {
  violations.push(
    'App lint:config must run the configuration and script formatting check.'
  )
}

if (appPackage.dependencies?.['expo-camera'] !== '14.1.3') {
  violations.push(
    'expo-camera must be a direct, exact App dependency because Android Gradle resolves its local Maven repository.'
  )
}

if (!/expo-camera:\r?\n\s+specifier: 14\.1\.3/m.test(lockfile)) {
  violations.push(
    'pnpm-lock.yaml must record expo-camera as the App direct dependency.'
  )
}

requireIncludes(
  androidBuildGradle,
  'expo-camera Android Maven repository is missing',
  'Android Gradle Expo Camera dependency guard'
)

if (/org\.webkit:android-jsc:\+/.test(androidAppBuildGradle)) {
  violations.push('Android JSC must use a fixed Maven version, not +.')
}

requireIncludes(
  androidAppBuildGradle,
  'org.webkit:android-jsc:r174650',
  'Android fixed JSC dependency'
)

if (!/gem ['\"]fastlane['\"], ['\"]= 2\.238\.0['\"]/.test(androidGemfile)) {
  violations.push(
    'Android Fastlane must use the reviewed exact fastlane version.'
  )
}

const bundleCommand =
  'pnpm --filter com.deppon.app run bundle:android:production'
const bundleIndex = androidReleaseWorkflow.indexOf(bundleCommand)
const assembleIndex = androidReleaseWorkflow.indexOf(
  './gradlew assembleRelease'
)

if (bundleIndex < 0 || assembleIndex < 0 || bundleIndex > assembleIndex) {
  violations.push(
    'Android release workflow must generate the production RN bundle before Gradle assembles the APK.'
  )
}

requireIncludes(
  androidReleaseWorkflow,
  'pnpm check:app-native-env',
  'Android release native environment gate'
)
requireIncludes(iosXcodeEnv, '.node-version', 'iOS Node version guard')
requireIncludes(iosXcodeEnv, 'NODE_BINARY', 'iOS Node version guard')

const missingNativeLocks = [
  'apps/com.deppon.app/android/Gemfile.lock',
  'apps/com.deppon.app/ios/Podfile.lock'
].filter(relativePath => !existsSync(path.join(repoRoot, relativePath)))

if (missingNativeLocks.length) {
  console.warn(
    `[WARN] Generate and commit native release locks on macOS before enabling iOS archive release: ${missingNativeLocks.join(', ')}`
  )
}

if (violations.length) {
  console.error('\nRepository configuration check failed:\n')
  for (const violation of violations) console.error(`- ${violation}`)
  process.exit(1)
}

console.log('Repository configuration check passed.')
