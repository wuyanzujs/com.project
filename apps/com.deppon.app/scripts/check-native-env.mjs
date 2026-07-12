import { execFileSync } from 'node:child_process'
import {
  existsSync,
  readFileSync
} from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'

const appRoot = process.cwd()
const androidRoot = path.join(appRoot, 'android')
const localPropertiesPath = path.join(androidRoot, 'local.properties')

const checks = []

function normalizeWindowsPath(value) {
  return value.replace(/\\:/g, ':').replace(/\\\\/g, '\\')
}

function getLocalAndroidSdkPath() {
  if (!existsSync(localPropertiesPath)) {
    return ''
  }

  const content = readFileSync(localPropertiesPath, 'utf8')
  const sdkLine = content
    .split(/\r?\n/)
    .find((line) => line.trim().startsWith('sdk.dir='))

  if (!sdkLine) {
    return ''
  }

  return normalizeWindowsPath(sdkLine.slice('sdk.dir='.length).trim())
}

function commandExists(command) {
  const lookupCommand = process.platform === 'win32' ? 'where.exe' : 'command'
  const args = process.platform === 'win32' ? [command] : ['-v', command]

  try {
    execFileSync(lookupCommand, args, {
      stdio: 'ignore',
      shell: process.platform !== 'win32'
    })
    return true
  } catch {
    return false
  }
}

function readCommandVersion(command, args) {
  try {
    return execFileSync(command, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    }).trim()
  } catch (error) {
    const output = `${error.stdout ?? ''}${error.stderr ?? ''}`.trim()

    return output || ''
  }
}

function commandSucceeds(command, args) {
  try {
    execFileSync(command, args, {
      stdio: 'ignore'
    })
    return true
  } catch {
    return false
  }
}

function addCheck(name, passed, detail, required = true) {
  checks.push({
    name,
    passed,
    detail,
    required
  })
}

function getAndroidSdkToolPath(...segments) {
  if (!resolvedAndroidSdk) {
    return ''
  }

  return path.join(resolvedAndroidSdk, ...segments)
}

const javaHome = process.env.JAVA_HOME ?? ''
const androidHome = process.env.ANDROID_HOME ?? ''
const androidSdkRoot = process.env.ANDROID_SDK_ROOT ?? ''
const localAndroidSdk = getLocalAndroidSdkPath()
const resolvedAndroidSdk = androidHome || androidSdkRoot || localAndroidSdk
const javaFromPath = commandExists('java')
const javacFromPath = commandExists('javac')
const javaHomeBin = javaHome ? path.join(javaHome, 'bin') : ''
const javaHomeHasJava = javaHome
  ? existsSync(path.join(javaHomeBin, process.platform === 'win32' ? 'java.exe' : 'java'))
  : false
const javaHomeHasJavac = javaHome
  ? existsSync(path.join(javaHomeBin, process.platform === 'win32' ? 'javac.exe' : 'javac'))
  : false

addCheck(
  'JDK',
  (javaFromPath && javacFromPath) || (javaHomeHasJava && javaHomeHasJavac),
  javaHome
    ? `JAVA_HOME=${javaHome}`
    : '未设置 JAVA_HOME，PATH 中也需要可用的 java 和 javac。'
)

if (javaFromPath) {
  const version = readCommandVersion('java', ['-version']).split(/\r?\n/)[0]
  addCheck('java -version', true, version || '已找到 java 命令', false)
}

addCheck(
  'Android SDK',
  !!resolvedAndroidSdk && existsSync(resolvedAndroidSdk),
  resolvedAndroidSdk
    ? `SDK=${resolvedAndroidSdk}`
    : '未设置 ANDROID_HOME/ANDROID_SDK_ROOT，也未在 android/local.properties 中找到 sdk.dir。'
)

if (resolvedAndroidSdk) {
  const adbPath = getAndroidSdkToolPath(
    'platform-tools',
    process.platform === 'win32' ? 'adb.exe' : 'adb'
  )
  const sdkmanagerPath = getAndroidSdkToolPath(
    'cmdline-tools',
    'latest',
    'bin',
    process.platform === 'win32' ? 'sdkmanager.bat' : 'sdkmanager'
  )

  addCheck(
    'Android platform android-34',
    existsSync(getAndroidSdkToolPath('platforms', 'android-34')),
    getAndroidSdkToolPath('platforms', 'android-34')
  )
  addCheck(
    'Android build-tools 34.0.0',
    existsSync(getAndroidSdkToolPath('build-tools', '34.0.0')),
    getAndroidSdkToolPath('build-tools', '34.0.0')
  )
  addCheck(
    'Android NDK 25.1.8937393',
    existsSync(getAndroidSdkToolPath('ndk', '25.1.8937393')),
    getAndroidSdkToolPath('ndk', '25.1.8937393')
  )
  addCheck(
    'Android CMake 3.22.1',
    existsSync(getAndroidSdkToolPath('cmake', '3.22.1')),
    getAndroidSdkToolPath('cmake', '3.22.1')
  )
  addCheck(
    'Android platform-tools adb',
    existsSync(adbPath) || commandExists('adb'),
    existsSync(adbPath) ? adbPath : '需要 adb 支持设备调试。'
  )
  addCheck(
    'Android sdkmanager',
    existsSync(sdkmanagerPath) || commandExists('sdkmanager'),
    existsSync(sdkmanagerPath)
      ? sdkmanagerPath
      : '需要 cmdline-tools/latest/bin/sdkmanager。'
  )
}

addCheck(
  'Gradle wrapper',
  existsSync(
    path.join(androidRoot, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew')
  ),
  path.join(androidRoot, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew')
)

if (process.platform === 'darwin') {
  const xcodeVersion = commandExists('xcodebuild')
    ? readCommandVersion('xcodebuild', ['-version'])
    : ''
  const hasFullXcode =
    /^Xcode\s+\S+/m.test(xcodeVersion) &&
    commandExists('xcrun') &&
    commandSucceeds('xcrun', ['--find', 'simctl'])

  addCheck(
    'Xcode',
    hasFullXcode,
    hasFullXcode
      ? xcodeVersion.split(/\r?\n/).join(', ')
      : '需要完整 Xcode，并确保 xcodebuild 和 xcrun simctl 指向 Xcode Developer 目录。'
  )
  addCheck('CocoaPods', commandExists('pod'), '需要 pod install 支持 iOS 原生依赖。')
} else {
  addCheck(
    'iOS build host',
    false,
    `当前系统是 ${os.platform()}，iOS 构建需要 macOS/Xcode 环境。`,
    false
  )
}

const failedRequiredChecks = checks.filter((item) => item.required && !item.passed)

for (const item of checks) {
  const marker = item.passed ? 'OK' : item.required ? 'FAIL' : 'SKIP'

  console.log(`[${marker}] ${item.name}: ${item.detail}`)
}

if (failedRequiredChecks.length) {
  console.error('\nNative environment check failed.')
  process.exit(1)
}

console.log('\nNative environment check passed.')
