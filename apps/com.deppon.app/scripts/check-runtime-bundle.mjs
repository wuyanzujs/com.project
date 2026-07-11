import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import runtimeBuild from '../config/runtime-build.cjs'

const bundlePaths = {
  android: 'android/app/src/main/assets/index.android.bundle',
  ios: 'ios/main.jsbundle'
}

const platform = process.argv[2]
const relativeBundlePath = bundlePaths[platform]
const requireProduction = process.argv.includes('--require-production')

if (!relativeBundlePath) {
  console.error('Usage: node scripts/check-runtime-bundle.mjs <android|ios>')
  process.exit(1)
}

let runtimeConfig = null

if (!requireProduction || process.env.APP_ENV === 'production') {
  try {
    runtimeConfig = runtimeBuild.createRuntimeBuildConfig(process.env)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

const bundlePath = path.join(process.cwd(), relativeBundlePath)

if (!existsSync(bundlePath)) {
  console.error(`Runtime bundle check failed: ${relativeBundlePath} 不存在。`)
  process.exit(1)
}

const content = readFileSync(bundlePath, 'utf8')
const violations = []

function findSourceMaps(directory) {
  if (!existsSync(directory)) {
    return []
  }

  return readdirSync(directory).flatMap((entry) => {
    const filePath = path.join(directory, entry)

    if (statSync(filePath).isDirectory()) {
      return findSourceMaps(filePath)
    }

    return filePath.endsWith('.map') ? [filePath] : []
  })
}

if (/process\.env\.APP_[A-Z0-9_]+/.test(content)) {
  violations.push('产物仍包含未替换的 process.env.APP_* 表达式。')
}

if (content.includes('__APP_RUNTIME_CONFIG__')) {
  violations.push('产物仍包含未替换的 __APP_RUNTIME_CONFIG__ 标识符。')
}

const expectedValues = runtimeConfig
  ? [
      runtimeConfig.apiBaseURL,
      runtimeConfig.webBaseURL,
      runtimeConfig.serviceWebURL,
      runtimeConfig.memberWebURL
    ]
  : []

for (const value of new Set(expectedValues)) {
  if (!content.includes(value)) {
    violations.push(`产物未包含预期的编译期配置值：${value}`)
  }
}

if (requireProduction && !/\benv\s*:\s*['"]production['"]/.test(content)) {
  violations.push('Release 产物未包含 env: production 编译期配置。')
}

if (requireProduction && platform === 'android') {
  const sourceMaps = findSourceMaps(
    path.join(process.cwd(), 'android/app/src/main/assets')
  )

  for (const sourceMap of sourceMaps) {
    violations.push(
      `Android release assets 不得包含 source map：${path.relative(
        process.cwd(),
        sourceMap
      )}`
    )
  }
}

if (requireProduction || runtimeConfig?.env === 'production') {
  for (const marker of runtimeBuild.PRODUCTION_FORBIDDEN_HOST_MARKERS) {
    if (content.toLowerCase().includes(marker)) {
      violations.push(`生产产物包含测试环境标记：${marker}`)
    }
  }
}

if (violations.length) {
  console.error('Runtime bundle check failed.\n')
  for (const violation of violations) console.error(`- ${violation}`)
  process.exit(1)
}

console.log(`Runtime bundle check passed: ${relativeBundlePath}`)
