import { readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const appRoot = process.cwd()
const runtimeConfigPath = path.join(
  appRoot,
  'src/shared/config/runtime.ts'
)
const appEnv = process.env.APP_ENV || 'test'
const productionRequiredVars = [
  'APP_API_BASE_URL',
  'APP_WEB_BASE_URL',
  'APP_SERVICE_WEB_URL',
  'APP_MEMBER_WEB_URL',
  'APP_WEB_ALLOWED_HOSTS',
  'APP_SYSTEM_CODE',
  'APP_CLIENT_CHANNEL',
  'APP_OMS_CHANNEL',
  'APP_ECARD_PMC_SYSTEM_CODE'
]
const productionUrlVars = [
  'APP_API_BASE_URL',
  'APP_WEB_BASE_URL',
  'APP_SERVICE_WEB_URL',
  'APP_MEMBER_WEB_URL'
]

const violations = []

function addViolation(message) {
  violations.push(message)
}

function parseUrl(name, value) {
  try {
    return new URL(value)
  } catch {
    addViolation(`${name} 必须是合法 URL，当前为：${value}`)
    return null
  }
}

function checkNoHardcodedToken() {
  const content = readFileSync(runtimeConfigPath, 'utf8')

  if (/token=/i.test(content)) {
    addViolation('runtime.ts 不应硬编码 token 参数，请通过登录态或后端下发。')
  }
}

function checkProductionEnv() {
  const missingVars = productionRequiredVars.filter(
    (name) => !process.env[name]?.trim()
  )

  if (missingVars.length) {
    addViolation(
      `APP_ENV=production 时必须显式配置：${missingVars.join(', ')}`
    )
  }

  const allowedHosts = new Set(
    (process.env.APP_WEB_ALLOWED_HOSTS || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  )

  for (const name of productionUrlVars) {
    const value = process.env[name]

    if (!value) {
      continue
    }

    const parsed = parseUrl(name, value)

    if (!parsed) {
      continue
    }

    if (parsed.protocol !== 'https:') {
      addViolation(`${name} 生产环境必须使用 https。`)
    }

    if (name !== 'APP_API_BASE_URL' && !allowedHosts.has(parsed.hostname)) {
      addViolation(`${name} 的 host 必须加入 APP_WEB_ALLOWED_HOSTS。`)
    }

    if (name === 'APP_SERVICE_WEB_URL' && parsed.searchParams.has('token')) {
      addViolation('APP_SERVICE_WEB_URL 不应配置固定 token 参数。')
    }
  }
}

checkNoHardcodedToken()

if (appEnv === 'production') {
  checkProductionEnv()
}

if (violations.length) {
  console.error('Runtime config check failed.\n')

  for (const violation of violations) {
    console.error(`- ${violation}`)
  }

  process.exit(1)
}

console.log('Runtime config check passed.')
