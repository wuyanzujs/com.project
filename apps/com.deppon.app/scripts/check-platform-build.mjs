import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const appRoot = process.cwd()
const srcRoot = path.join(appRoot, 'src')
const packageJsonPath = path.join(appRoot, 'package.json')
const configPath = path.join(appRoot, 'config/index.ts')
const androidMainActivityPath = path.join(
  appRoot,
  'android/app/src/main/java/com/deppon/app/MainActivity.kt'
)
const androidFastfilePath = path.join(appRoot, 'android/fastlane/Fastfile')
const androidBuildGradlePath = path.join(appRoot, 'android/app/build.gradle')
const iosAppDelegatePath = path.join(appRoot, 'ios/taroDemo/AppDelegate.mm')
const iosFastfilePath = path.join(appRoot, 'ios/fastlane/Fastfile')
const violations = []

function readRequired(filePath, label) {
  if (!existsSync(filePath)) {
    violations.push(`${label} 缺失：${path.relative(appRoot, filePath)}`)
    return ''
  }

  return readFileSync(filePath, 'utf8')
}

function requireMatch(content, pattern, label, filePath) {
  const match = content.match(pattern)

  if (!match?.[1]) {
    violations.push(`${label} 未配置：${path.relative(appRoot, filePath)}`)
    return ''
  }

  return match[1]
}

function hasRnBundleCommand(command, platform) {
  return (
    /\btaro\s+build\b/.test(command) &&
    /--type(?:=|\s+)rn\b/.test(command) &&
    new RegExp(`--platform(?:=|\\s+)${platform}\\b`).test(command)
  )
}

function checkNativeIdentity(configContent) {
  const androidContent = readRequired(
    androidMainActivityPath,
    'Android MainActivity'
  )
  const iosContent = readRequired(iosAppDelegatePath, 'iOS AppDelegate')
  const identities = [
    {
      label: 'Taro RN appName',
      value: requireMatch(
        configContent,
        /\bappName\s*:\s*['"]([^'"]+)['"]/,
        'Taro RN appName',
        configPath
      )
    },
    {
      label: 'Android moduleName',
      value: requireMatch(
        androidContent,
        /getMainComponentName\(\)\s*:\s*String\s*=\s*"([^"]+)"/,
        'Android moduleName',
        androidMainActivityPath
      )
    },
    {
      label: 'iOS moduleName',
      value: requireMatch(
        iosContent,
        /self\.moduleName\s*=\s*@"([^"]+)"/,
        'iOS moduleName',
        iosAppDelegatePath
      )
    }
  ]
  const configuredIdentities = identities.filter(item => item.value)
  const expected = configuredIdentities[0]?.value

  for (const identity of configuredIdentities.slice(1)) {
    if (identity.value !== expected) {
      violations.push(
        `原生 moduleName 不一致：${identities[0].label}=${expected}，${identity.label}=${identity.value}`
      )
    }
  }
}

function checkBundleScripts(packageJson) {
  const scripts = packageJson.scripts ?? {}
  const requiredBundles = [
    ['bundle:android', 'android'],
    ['bundle:ios', 'ios']
  ]

  for (const [scriptName, platform] of requiredBundles) {
    const command = scripts[scriptName] ?? ''

    if (!hasRnBundleCommand(command, platform)) {
      violations.push(
        `${scriptName} 必须执行 taro build --type rn --platform ${platform}`
      )
    }
  }

  for (const platform of ['android', 'ios']) {
    const scriptName = `bundle:${platform}:production`

    if (!scripts[scriptName]?.includes('build-production-bundle.mjs')) {
      violations.push(`${scriptName} 必须强制生成并校验 production bundle。`)
    }
  }

  const resetCommand = scripts['dev:rn:reset-cache'] ?? ''

  if (
    !/\btaro\s+build\b/.test(resetCommand) ||
    !/--type(?:=|\s+)rn\b/.test(resetCommand) ||
    !/--watch\b/.test(resetCommand) ||
    !/--reset-cache\b/.test(resetCommand)
  ) {
    violations.push(
      'dev:rn:reset-cache 必须提供 taro build --type rn --watch --reset-cache'
    )
  }
}

function checkNativeReleaseLanes() {
  const androidFastfile = readRequired(androidFastfilePath, 'Android Fastfile')
  const androidBuildGradle = readRequired(
    androidBuildGradlePath,
    'Android app build.gradle'
  )
  const iosFastfile = readRequired(iosFastfilePath, 'iOS Fastfile')

  if (!androidFastfile.includes('pnpm --dir .. install --frozen-lockfile')) {
    violations.push('Android Fastlane 打包前必须按锁文件安装最新 JS/原生依赖。')
  }

  if (!androidFastfile.includes('pnpm --dir .. run bundle:android')) {
    violations.push('Android Fastlane 打包前必须生成最新 Android RN bundle。')
  }

  if (!androidFastfile.includes('bundle:android:production')) {
    violations.push('Android Fastlane release 必须使用 production bundle。')
  }

  const debugSigningReferences = [
    ...androidBuildGradle.matchAll(/signingConfig\s+signingConfigs\.debug/g)
  ]

  if (debugSigningReferences.length > 1) {
    violations.push('Android release 禁止回退到 debug 签名。')
  }

  if (
    !androidBuildGradle.includes('ANDROID_RELEASE_STORE_FILE') ||
    !androidBuildGradle.includes('signingConfig signingConfigs.release') ||
    !androidBuildGradle.includes('Release signing credentials are required') ||
    !androidBuildGradle.includes('verifyProductionRuntimeBundle') ||
    !androidBuildGradle.includes('Release applicationId must be')
  ) {
    violations.push(
      'Android release 必须校验签名、production bundle 和固定 applicationId。'
    )
  }

  if (!iosFastfile.includes('pnpm --dir .. install --frozen-lockfile')) {
    violations.push('iOS Fastlane 打包前必须按锁文件安装最新 JS/原生依赖。')
  }

  if (!iosFastfile.includes('pnpm --dir .. run podInstall')) {
    violations.push('iOS Fastlane 打包前必须重新安装 CocoaPods 原生依赖。')
  }

  if (!iosFastfile.includes('pnpm --dir .. run bundle:ios')) {
    violations.push('iOS Fastlane 打包前必须生成最新 iOS RN bundle。')
  }

  if (!/ENV\[['"]SKIP_BUNDLING['"]\]\s*=\s*['"]1['"]/.test(iosFastfile)) {
    violations.push(
      'iOS Fastlane 必须设置 SKIP_BUNDLING=1，避免原生脚本重复查找 Taro entry。'
    )
  }

  if (/\bproject\s*:\s*['"][^'"]+\.xcodeproj['"]/.test(iosFastfile)) {
    violations.push(
      'iOS Fastlane 禁止直接构建 .xcodeproj，请使用 .xcworkspace。'
    )
  }


  if (!iosFastfile.includes('iOS release is disabled until signing')) {
    violations.push(
      '在锁文件和签名流水线就绪前，iOS Fastlane release 必须显式禁用。'
    )
  }

  const workspaceMatches = [
    ...iosFastfile.matchAll(/\bworkspace\s*:\s*['"]([^'"]+\.xcworkspace)['"]/g)
  ]

  if (!workspaceMatches.length) {
    violations.push('iOS Fastlane 必须显式配置 .xcworkspace。')
  }

  for (const match of workspaceMatches) {
    const workspacePath = path.join(appRoot, 'ios', match[1])

    if (!existsSync(workspacePath)) {
      violations.push(`iOS workspace 不存在：ios/${match[1]}`)
    }
  }
}

function isNativeRuntimeDependency(name) {
  const nativeTooling = new Set([
    '@react-native/babel-preset',
    '@react-native/gradle-plugin',
    '@react-native/metro-config',
    '@react-native/typescript-config',
    '@react-native-community/cli-platform-android'
  ])

  return (
    !nativeTooling.has(name) &&
    (name === 'expo' ||
      name === 'react-native' ||
      name.startsWith('react-native-') ||
      name.startsWith('@react-native/'))
  )
}

function readDependencyTree() {
  const packageManagerCli = process.env.npm_execpath

  if (!packageManagerCli || !existsSync(packageManagerCli)) {
    violations.push('无法定位 pnpm CLI，不能检查 RN 原生依赖重复版本。')
    return []
  }

  try {
    const output = execFileSync(
      process.execPath,
      [packageManagerCli, 'list', '--depth', 'Infinity', '--prod', '--json'],
      {
        cwd: appRoot,
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'pipe']
      }
    )

    return JSON.parse(output)
  } catch (error) {
    violations.push(
      `无法读取 pnpm 依赖树：${String(error.stderr ?? error.message).trim()}`
    )
    return []
  }
}

function checkDuplicateNativeDependencies(packageJson) {
  const nativeDependencies = new Set(
    Object.keys(packageJson.dependencies ?? {}).filter(
      isNativeRuntimeDependency
    )
  )
  const versionsByName = new Map(
    [...nativeDependencies].map(name => [name, new Set()])
  )
  const stack = [...readDependencyTree()]

  while (stack.length) {
    const current = stack.pop()

    for (const group of ['dependencies', 'optionalDependencies']) {
      for (const [name, dependency] of Object.entries(current?.[group] ?? {})) {
        if (versionsByName.has(name) && dependency.version) {
          versionsByName.get(name).add(dependency.version)
        }

        stack.push(dependency)
      }
    }
  }

  for (const [name, versions] of versionsByName) {
    if (versions.size > 1) {
      violations.push(
        `RN 原生依赖 ${name} 存在多个版本：${[...versions].join(', ')}`
      )
    }
  }
}

function getConfigBlock(content, propertyName) {
  const propertyMatch = new RegExp(`\\b${propertyName}\\s*:\\s*\\{`).exec(
    content
  )

  if (!propertyMatch) {
    return ''
  }

  const openIndex = content.indexOf('{', propertyMatch.index)
  let depth = 0

  for (let index = openIndex; index < content.length; index += 1) {
    if (content[index] === '{') depth += 1
    if (content[index] === '}') depth -= 1
    if (depth === 0) return content.slice(openIndex + 1, index)
  }

  return ''
}

function parseVersion(value) {
  const match = String(value).match(/(\d+)\.(\d+)\.(\d+)/)
  return match ? match.slice(1).map(Number) : null
}

function isVersionAtLeast(value, minimum) {
  const actual = parseVersion(value)
  const expected = parseVersion(minimum)

  if (!actual || !expected) return false

  for (let index = 0; index < expected.length; index += 1) {
    if (actual[index] !== expected[index])
      return actual[index] > expected[index]
  }

  return true
}

function walkSourceFiles(root, extensions) {
  if (!existsSync(root)) return []

  return readdirSync(root).flatMap(entry => {
    const filePath = path.join(root, entry)

    if (statSync(filePath).isDirectory()) {
      return walkSourceFiles(filePath, extensions)
    }

    return extensions.has(path.extname(filePath)) ? [filePath] : []
  })
}

function checkHarmonyConfig(packageJson, configContent) {
  const allDependencies = {
    ...(packageJson.dependencies ?? {}),
    ...(packageJson.devDependencies ?? {})
  }
  const harmonyPackage = allDependencies['@tarojs/plugin-platform-harmony-cpp']
  const harmonyBlock = getConfigBlock(configContent, 'harmony')
  const harmonyEnabled = Boolean(harmonyPackage || harmonyBlock)

  if (!harmonyEnabled) {
    console.log('[SKIP] Harmony 门禁：当前项目未启用 Harmony。')
    return
  }

  if (!harmonyPackage || !harmonyBlock) {
    violations.push('Harmony 插件依赖和 config.harmony 必须同时配置。')
  }

  const taroVersion =
    allDependencies['@tarojs/cli'] ?? allDependencies['@tarojs/taro'] ?? ''

  if (!isVersionAtLeast(taroVersion, '4.1.0')) {
    violations.push(
      `Harmony-CPP 要求 Taro >= 4.1.0，当前为 ${taroVersion || '未配置'}。`
    )
  }

  const requiredConfig = [
    [/\bcompiler\s*:\s*['"]vite['"]/, "compiler: 'vite'"],
    [/\bprojectPath\s*:\s*['"][^'"]+['"]/, 'projectPath'],
    [/\bhapName\s*:\s*['"][^'"]+['"]/, 'hapName']
  ]

  for (const [pattern, label] of requiredConfig) {
    if (!pattern.test(harmonyBlock)) {
      violations.push(`config.harmony 缺少有效的 ${label} 配置。`)
    }
  }

  const sourceFiles = walkSourceFiles(
    srcRoot,
    new Set(['.ts', '.tsx', '.scss'])
  )
  const sourceContents = sourceFiles.map(filePath => ({
    filePath,
    content: readFileSync(filePath, 'utf8')
  }))

  if (
    !sourceContents.some(({ content }) =>
      /<reference\s+path=['"][^'"]*plugin-platform-harmony-cpp\/types\/define\.d\.ts['"]/.test(
        content
      )
    )
  ) {
    violations.push('Harmony-CPP 缺少 define.d.ts 的三斜线类型引用。')
  }

  if (
    !sourceContents.some(({ content }) => content.includes('__taroNotSupport'))
  ) {
    violations.push(
      '启用 Harmony 后必须监听 __taroNotSupport，暴露未实现 Taro API。'
    )
  }

  for (const { filePath, content } of sourceContents) {
    const relativePath = path.relative(appRoot, filePath)

    if (/\bdisplay\s*:\s*inline-block\b/.test(content)) {
      violations.push(
        `${relativePath} 使用了 Harmony 不支持的 display: inline-block。`
      )
    }

    if (/\bz-index\s*:/.test(content)) {
      violations.push(
        `${relativePath} 直接使用了 z-index；Harmony 浮层必须重构为同层级布局后再启用。`
      )
    }

    if (
      /\bbackground\s*:\s*['"](?!#|rgb\(|rgba\(|hsl\(|hsla\()[A-Za-z]+['"]/.test(
        content
      )
    ) {
      violations.push(`${relativePath} 的内联 background 必须使用明确色值。`)
    }

    if (path.extname(filePath) === '.tsx') {
      for (const match of content.matchAll(/<Text\b[^>]*>/g)) {
        if (!/\b(?:className|style)\s*=/.test(match[0])) {
          violations.push(
            `${relativePath} 的 Text 必须显式声明 className/style，不能依赖 Harmony 文本样式继承。`
          )
        }
      }
    }
  }
}

const packageJsonContent = readRequired(packageJsonPath, 'App package.json')
const packageJson = packageJsonContent ? JSON.parse(packageJsonContent) : {}
const configContent = readRequired(configPath, 'Taro config')

if (
  configContent.includes('android/app/src/main/assets/index.android.map') ||
  !configContent.includes('dist/sourcemaps/index.android.map')
) {
  violations.push('Android source map 必须输出到 dist，禁止进入 APK assets。')
}

checkNativeIdentity(configContent)
checkBundleScripts(packageJson)
checkNativeReleaseLanes()
checkDuplicateNativeDependencies(packageJson)
checkHarmonyConfig(packageJson, configContent)

if (violations.length) {
  console.error('\nPlatform build check failed:\n')
  for (const violation of violations) console.error(`- ${violation}`)
  process.exit(1)
}

console.log('Platform build check passed.')
