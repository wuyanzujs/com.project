import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const appRoot = process.cwd()
const srcRoot = path.join(appRoot, 'src')
const packageJsonPath = path.join(appRoot, 'package.json')
const sourceExtensions = new Set(['.ts', '.tsx'])
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
    filePath: path.join(appRoot, 'android/gradle.properties'),
    expected: 'app_id=com.deppon.app',
    message: 'Android applicationId 应使用 App 包名 com.deppon.app。'
  },
  {
    filePath: path.join(appRoot, 'android/app/src/main/res/values/strings.xml'),
    expected: '<string name="app_name">德邦快递</string>',
    message: 'Android 展示名应使用德邦快递。'
  },
  {
    filePath: path.join(
      appRoot,
      'android/app/src/main/java/com/tarodemo/MainActivity.kt'
    ),
    expected: 'getMainComponentName(): String = "DepponApp"',
    message: 'Android RN moduleName 必须与 Taro RN appName 保持一致。'
  },
  {
    filePath: path.join(appRoot, 'ios/taroDemo/AppDelegate.mm'),
    expected: 'self.moduleName = @"DepponApp";',
    message: 'iOS RN moduleName 必须与 Taro RN appName 保持一致。'
  },
  {
    filePath: path.join(appRoot, 'ios/taroDemo/Info.plist'),
    expected: '<string>德邦快递</string>',
    message: 'iOS 展示名应使用德邦快递。'
  },
  {
    filePath: path.join(appRoot, 'ios/taroDemo.xcodeproj/project.pbxproj'),
    expected: 'PRODUCT_BUNDLE_IDENTIFIER = com.deppon.app;',
    message: 'iOS Bundle ID 应使用 com.deppon.app。'
  }
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

  for (const rule of forbiddenPatterns) {
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
  console.error('RN boundary check failed. Found mini-program-only APIs:\n')

  for (const violation of violations) {
    const relativePath = path.relative(appRoot, violation.filePath)

    console.error(
      `${relativePath}:${violation.line} ${violation.token} - ${violation.message}`
    )
  }

  process.exit(1)
}

console.log('RN boundary check passed.')
