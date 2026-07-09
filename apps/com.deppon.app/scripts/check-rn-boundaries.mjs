import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const appRoot = process.cwd()
const srcRoot = path.join(appRoot, 'src')
const packageJsonPath = path.join(appRoot, 'package.json')
const sourceExtensions = new Set(['.ts', '.tsx'])
const forbiddenMiniProgramConfigFiles = [
  'project.config.json',
  'project.tt.json',
  'project.swan.json',
  'project.qq.json',
  'project.jd.json'
]
const forbiddenPlatformPackages = new Set([
  '@tarojs/plugin-platform-alipay',
  '@tarojs/plugin-platform-h5',
  '@tarojs/plugin-platform-jd',
  '@tarojs/plugin-platform-qq',
  '@tarojs/plugin-platform-swan',
  '@tarojs/plugin-platform-tt',
  '@tarojs/plugin-platform-weapp'
])
const nativeIdentityChecks = [
  {
    filePath: path.join(appRoot, 'config/index.ts'),
    expected: "appName: 'DepponApp'",
    message: 'Taro RN appName 必须与原生 moduleName 保持一致。'
  },
  {
    filePath: packageJsonPath,
    expected: '"expo":',
    message: 'Taro RN 原生 autolinking 需要显式声明 expo 依赖。'
  },
  {
    filePath: path.join(appRoot, 'android/gradle.properties'),
    expected: 'app_id=com.deppon.app',
    message: 'Android applicationId 应使用 App 包名 com.deppon.app。'
  },
  {
    filePath: path.join(appRoot, 'android/settings.gradle'),
    expected: "@tarojs/taro-rn/package.json",
    message: 'Android Expo autolinking 应兼容 pnpm workspace 依赖解析。'
  },
  {
    filePath: path.join(appRoot, 'android/app/build.gradle'),
    expected: 'namespace "com.deppon.app"',
    message: 'Android namespace 应使用 App 包名 com.deppon.app。'
  },
  {
    filePath: path.join(appRoot, 'android/gradle/wrapper/gradle-wrapper.properties'),
    expected: 'networkTimeout=60000',
    message: 'Gradle wrapper 首次下载超时不应保持模板默认 10 秒。'
  },
  {
    filePath: path.join(appRoot, 'android/fastlane/Appfile'),
    expected: 'package_name("com.deppon.app")',
    message: 'Android fastlane 包名应使用 com.deppon.app。'
  },
  {
    filePath: path.join(appRoot, 'android/app/src/main/res/values/strings.xml'),
    expected: '<string name="app_name">德邦快递</string>',
    message: 'Android 展示名应使用德邦快递。'
  },
  {
    filePath: path.join(
      appRoot,
      'android/app/src/main/java/com/deppon/app/MainActivity.kt'
    ),
    expected: 'package com.deppon.app',
    message: 'Android MainActivity 包名必须与 App 包名保持一致。'
  },
  {
    filePath: path.join(
      appRoot,
      'android/app/src/main/java/com/deppon/app/MainActivity.kt'
    ),
    expected: 'getMainComponentName(): String = "DepponApp"',
    message: 'Android RN moduleName 必须与 Taro RN appName 保持一致。'
  },
  {
    filePath: path.join(
      appRoot,
      'android/app/src/main/java/com/deppon/app/MainApplication.kt'
    ),
    expected: 'package com.deppon.app',
    message: 'Android MainApplication 包名必须与 App 包名保持一致。'
  },
  {
    filePath: path.join(appRoot, 'ios/taroDemo/AppDelegate.mm'),
    expected: 'self.moduleName = @"DepponApp";',
    message: 'iOS RN moduleName 必须与 Taro RN appName 保持一致。'
  },
  {
    filePath: path.join(appRoot, 'ios/Podfile'),
    expected: "@tarojs/taro-rn/package.json",
    message: 'iOS Expo autolinking 应兼容 pnpm workspace 依赖解析。'
  },
  {
    filePath: path.join(appRoot, 'ios/taroDemo/Info.plist'),
    expected: '<string>德邦快递</string>',
    message: 'iOS 展示名应使用德邦快递。'
  },
  {
    filePath: path.join(appRoot, 'ios/taroDemo/LaunchScreen.storyboard'),
    expected: 'text="德邦快递"',
    message: 'iOS 启动屏不应保留 taroDemo 模板文案。'
  },
  {
    filePath: path.join(appRoot, 'ios/taroDemo.xcodeproj/project.pbxproj'),
    expected: 'PRODUCT_BUNDLE_IDENTIFIER = com.deppon.app;',
    message: 'iOS Bundle ID 应使用 com.deppon.app。'
  }
]
const nativeFacadeRelativePathPrefixes = [
  'src/shared/platform/',
  'src/shared/native/'
]

const forbiddenPatterns = [
  {
    pattern: /\bwx\./g,
    message: '不要直接使用微信小程序 wx.*，请通过 shared/platform facade 或 service 层重构。'
  },
  {
    pattern: /\bmy\./g,
    message: '不要直接使用支付宝小程序 my.*，请通过 shared/platform facade 或 service 层重构。'
  },
  {
    pattern: /\bprocess\.env\.TARO_ENV\b/g,
    message: 'RN-only App 不应保留小程序多端运行时分支，请使用 runtime 配置或 capability 矩阵。'
  },
  {
    pattern: /\bTaro\.getEnv\b/g,
    message: 'RN-only App 不应做 Taro 多端运行时探测，请使用 runtime 配置或 capability 矩阵。'
  },
  {
    pattern: /\bNativeModules\b/g,
    message: 'RN NativeModules 只能在 shared/platform 或 shared/native 中封装。',
    allowRelativePathPrefixes: nativeFacadeRelativePathPrefixes
  },
  {
    pattern: /\bPermissionsAndroid\b/g,
    message: 'RN 权限请求只能在 shared/platform 或 shared/native 中封装。',
    allowRelativePathPrefixes: nativeFacadeRelativePathPrefixes
  },
  {
    pattern: /\bLinking\b/g,
    message: 'RN Linking 只能在 shared/platform 或 shared/native 中封装。',
    allowRelativePathPrefixes: nativeFacadeRelativePathPrefixes
  },
  {
    pattern: /\bShare\.share\b/g,
    message: 'RN 系统分享只能在 shared/platform 或 shared/native 中封装。',
    allowRelativePathPrefixes: nativeFacadeRelativePathPrefixes
  },
  {
    pattern: /\bAlert\.alert\b/g,
    message: 'RN 原生弹窗只能在 shared/platform 或 shared/native 中封装。',
    allowRelativePathPrefixes: nativeFacadeRelativePathPrefixes
  },
  {
    pattern: /\bTaro\.scanCode\b/g,
    message: '扫码请使用 shared/platform/scan。'
  },
  {
    pattern: /\bTaro\.getLocation\b/g,
    message: '定位请使用 shared/platform/location。'
  },
  {
    pattern: /\bTaro\.chooseLocation\b/g,
    message: '地图选点请使用 shared/platform/map。'
  },
  {
    pattern: /\bTaro\.openLocation\b/g,
    message: '打开地图请使用 shared/platform/map。'
  },
  {
    pattern: /\bTaro\.makePhoneCall\b/g,
    message: '拨打电话请使用 shared/platform/phone。'
  },
  {
    pattern: /\bTaro\.uploadFile\b/g,
    message: '上传文件请使用 shared/platform/files。'
  },
  {
    pattern: /\bTaro\.downloadFile\b/g,
    message: '下载文件请使用 shared/platform/files。'
  },
  {
    pattern: /\bTaro\.requestSubscribeMessage\b/g,
    message: '订阅消息请使用 shared/platform/notifications。'
  },
  {
    pattern: /\buseShareAppMessage\b/g,
    message: '小程序分享钩子不能进入 RN App，分享能力请使用 shared/platform/share。'
  },
  {
    pattern: /\buseShareTimeline\b/g,
    message: '小程序朋友圈分享钩子不能进入 RN App，分享能力请使用 shared/platform/share。'
  },
  {
    pattern: /\bonShareAppMessage\b/g,
    message: '小程序分享生命周期不能进入 RN App，分享能力请使用 shared/platform/share。'
  },
  {
    pattern: /\bopenType\s*=/g,
    message: '小程序开放能力按钮不能进入 RN App，请改为对应 shared/platform facade。'
  },
  {
    pattern: /\bTaro\.navigateToMiniProgram\b/g,
    message: '外跳小程序请使用 shared/platform/externalApp。'
  },
  {
    pattern: /\bTaro\.(chooseImage|chooseMedia|chooseVideo)\b/g,
    message: '媒体选择请通过 shared/platform/files 或后续媒体 facade。'
  },
  {
    pattern: /\bTaro\.(getUserProfile|authorize|getSetting|openSetting)\b/g,
    message: '授权能力请通过 App 登录/权限 facade 重新建模。'
  },
  {
    pattern: /\bTaro\.saveImageToPhotosAlbum\b/g,
    message: '保存相册请通过 App 文件/媒体 facade 重新建模。'
  },
  {
    pattern: /\bTaro\.(setClipboardData|getClipboardData)\b/g,
    message: '剪贴板能力请使用 shared/platform/clipboard。',
    allowRelativePathPrefixes: nativeFacadeRelativePathPrefixes
  },
  {
    pattern: /\bTaro\.previewImage\b/g,
    message: '图片预览请通过 App 文件/媒体 facade 重新建模。',
    allowRelativePathPrefixes: nativeFacadeRelativePathPrefixes
  },
  {
    pattern: /\bTaro\.openDocument\b/g,
    message: '文档打开请使用 shared/platform/files。',
    allowRelativePathPrefixes: nativeFacadeRelativePathPrefixes
  },
  {
    pattern: /\bAPP_ROUTES\.web\b/g,
    message: 'WebView 入口请使用 shared/webview/createAppWebUrl 统一承接。',
    allowRelativePaths: ['src/shared/webview/appWeb.ts']
  },
  {
    pattern: /\$\{\s*APP_ROUTES\.[A-Za-z0-9_]+\s*\}\?/g,
    message:
      '动态 App 路由 query 请使用 shared/navigation/routeUrl.ts 统一生成。'
  },
  {
    pattern: /\bAPP_ROUTES\.[A-Za-z0-9_]+\s*\+\s*['"`]\?/g,
    message:
      '动态 App 路由 query 请使用 shared/navigation/routeUrl.ts 统一生成。'
  },
  {
    pattern: /\bEVENT_TRACK\b/g,
    message: '旧小程序埋点入口不能直接迁入 RN App，请使用 shared/platform/analytics。'
  },
  {
    pattern: /from\s+['"`][^'"`]*sensors[^'"`]*['"`]/g,
    message: '小程序神策 SDK 不能直接迁入 RN App，请使用 shared/platform/analytics。'
  }
]

function walkFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
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

function getLineNumber(content, index) {
  return content.slice(0, index).split(/\r?\n/).length
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join('/')
}

function isAllowedByRule(rule, relativePath) {
  if (rule.allowRelativePaths?.includes(relativePath)) {
    return true
  }

  return (
    rule.allowRelativePathPrefixes?.some((prefix) =>
      relativePath.startsWith(prefix)
    ) ?? false
  )
}

const violations = []

function checkPackageDependencies() {
  if (!existsSync(packageJsonPath)) {
    return
  }

  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
  const dependencyGroups = ['dependencies', 'devDependencies', 'peerDependencies']

  for (const group of dependencyGroups) {
    const dependencies = packageJson[group] ?? {}

    for (const dependencyName of Object.keys(dependencies)) {
      if (forbiddenPlatformPackages.has(dependencyName)) {
        violations.push({
          filePath: packageJsonPath,
          line: 1,
          token: dependencyName,
          message: 'RN-only App 不应依赖小程序/H5 平台插件。'
        })
      }
    }
  }
}

checkPackageDependencies()

function checkMiniProgramConfigFiles() {
  for (const fileName of forbiddenMiniProgramConfigFiles) {
    const filePath = path.join(appRoot, fileName)

    if (existsSync(filePath)) {
      violations.push({
        filePath,
        line: 1,
        token: fileName,
        message: 'RN-only App 不应保留小程序 IDE 项目配置。'
      })
    }
  }
}

checkMiniProgramConfigFiles()

function checkNativeIdentity() {
  for (const item of nativeIdentityChecks) {
    if (!existsSync(item.filePath)) {
      violations.push({
        filePath: item.filePath,
        line: 1,
        token: path.relative(appRoot, item.filePath),
        message: `缺少原生身份配置文件。${item.message}`
      })
      continue
    }

    const content = readFileSync(item.filePath, 'utf8')

    if (!content.includes(item.expected)) {
      violations.push({
        filePath: item.filePath,
        line: 1,
        token: item.expected,
        message: item.message
      })
    }
  }
}

checkNativeIdentity()

for (const filePath of walkFiles(srcRoot)) {
  const content = readFileSync(filePath, 'utf8')
  const relativePath = toPosixPath(path.relative(appRoot, filePath))

  for (const rule of forbiddenPatterns) {
    if (isAllowedByRule(rule, relativePath)) {
      continue
    }

    rule.pattern.lastIndex = 0

    for (const match of content.matchAll(rule.pattern)) {
      violations.push({
        filePath,
        line: getLineNumber(content, match.index ?? 0),
        token: match[0],
        message: rule.message
      })
    }
  }
}

if (violations.length) {
  console.error('RN boundary check failed. Found boundary violations:\n')

  for (const violation of violations) {
    const relativePath = path.relative(appRoot, violation.filePath)

    console.error(
      `${relativePath}:${violation.line} ${violation.token} - ${violation.message}`
    )
  }

  process.exit(1)
}

console.log('RN boundary check passed.')
