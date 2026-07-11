import { readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import runtimeBuild from '../config/runtime-build.cjs'

const appRoot = process.cwd()
const runtimeConfigPath = path.join(
  appRoot,
  'src/shared/config/runtime.ts'
)
const violations = runtimeBuild.validateRuntimeEnvironment(process.env)

function addViolation(message) {
  violations.push(message)
}

function checkNoHardcodedToken() {
  const content = readFileSync(runtimeConfigPath, 'utf8')

  if (/token=/i.test(content)) {
    addViolation('runtime.ts 不应硬编码 token 参数，请通过登录态或后端下发。')
  }

  if (/process\.env\.APP_[A-Z0-9_]+/.test(content)) {
    addViolation('runtime.ts 必须只消费编译期常量，不能在 RN 运行时读取 APP_*。')
  }
}

checkNoHardcodedToken()

if (violations.length) {
  console.error('Runtime config check failed.\n')

  for (const violation of violations) {
    console.error(`- ${violation}`)
  }

  process.exit(1)
}

console.log('Runtime config check passed.')
