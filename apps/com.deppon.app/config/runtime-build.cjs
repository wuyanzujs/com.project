const DEFAULT_RUNTIME_CONFIG = {
  env: 'test',
  apiBaseURL: 'https://owstest.deppon.com',
  webBaseURL: 'https://owstest.deppon.com',
  serviceWebURL:
    'https://osstest.deppon.com.cn/dzfront/web/home?showChat=true&layout=true',
  memberWebURL:
    'https://mastest.deppon.com.cn/cms-h5/h5.html#/welfare-center',
  webAllowedHosts: [
    'owstest.deppon.com',
    'ows.deppon.com',
    'owstest.deppon.com.cn',
    'ows.deppon.com.cn',
    'osstest.deppon.com.cn',
    'im.deppon.com.cn',
    'mas.deppon.com',
    'mas.deppon.com.cn',
    'mascdn.deppon.com',
    'mastest.deppon.com.cn',
    'matest.deppon.com.cn',
    'ca.deppon.com.cn'
  ],
  systemCode: 'APP',
  appClientChannel: 'APP',
  omsChannel: 'APP',
  ecardPmcSystemCode: 'APP',
  mobileLoginType: 'MOBILE_VERIFICATION_CODE',
  supportSurveyConfigKey: 'app_survey_config'
}

const SUPPORTED_APP_ENVS = new Set([
  'local',
  'dev',
  'test',
  'staging',
  'production'
])

const PRODUCTION_REQUIRED_VARS = [
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

const URL_ENV_VARS = [
  'APP_API_BASE_URL',
  'APP_WEB_BASE_URL',
  'APP_SERVICE_WEB_URL',
  'APP_MEMBER_WEB_URL'
]

const PRODUCTION_FORBIDDEN_HOST_MARKERS = [
  'owstest',
  'osstest',
  'mastest',
  'matest'
]

function getEnvValue(env, name) {
  const value = env[name]

  return typeof value === 'string' ? value.trim() : ''
}

function getAppEnv(env) {
  return getEnvValue(env, 'APP_ENV') || DEFAULT_RUNTIME_CONFIG.env
}

function getAllowedHosts(env) {
  const configuredHosts = getEnvValue(env, 'APP_WEB_ALLOWED_HOSTS')

  if (!configuredHosts) {
    return [...DEFAULT_RUNTIME_CONFIG.webAllowedHosts]
  }

  return Array.from(
    new Set(
      configuredHosts
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
    )
  )
}

function isForbiddenProductionHost(hostname) {
  const normalized = hostname.toLowerCase()

  return PRODUCTION_FORBIDDEN_HOST_MARKERS.some((marker) =>
    normalized.includes(marker)
  )
}

function hasTokenLikeQueryParam(parsed) {
  const searchParams = [parsed.searchParams]
  const hashValue = parsed.hash.replace(/^#/, '')
  const hashQueryIndex = hashValue.indexOf('?')

  if (hashQueryIndex >= 0) {
    searchParams.push(new URLSearchParams(hashValue.slice(hashQueryIndex + 1)))
  }

  return searchParams.some((params) =>
    Array.from(params.keys()).some((key) => /token/i.test(key))
  )
}

function resolveUrlValue(env, name) {
  const configured = getEnvValue(env, name)

  if (configured) {
    return configured
  }

  if (name === 'APP_WEB_BASE_URL') {
    return (
      getEnvValue(env, 'APP_API_BASE_URL') || DEFAULT_RUNTIME_CONFIG.webBaseURL
    )
  }

  const defaults = {
    APP_API_BASE_URL: DEFAULT_RUNTIME_CONFIG.apiBaseURL,
    APP_SERVICE_WEB_URL: DEFAULT_RUNTIME_CONFIG.serviceWebURL,
    APP_MEMBER_WEB_URL: DEFAULT_RUNTIME_CONFIG.memberWebURL
  }

  return defaults[name] || ''
}

function validateRuntimeEnvironment(env = process.env) {
  const violations = []
  const appEnv = getAppEnv(env)
  const production = appEnv === 'production'

  if (!SUPPORTED_APP_ENVS.has(appEnv)) {
    violations.push(
      `APP_ENV 仅支持 ${Array.from(SUPPORTED_APP_ENVS).join(', ')}，当前为：${appEnv}`
    )
  }

  if (production) {
    const missingVars = PRODUCTION_REQUIRED_VARS.filter(
      (name) => !getEnvValue(env, name)
    )

    if (missingVars.length) {
      violations.push(
        `APP_ENV=production 时必须显式配置：${missingVars.join(', ')}`
      )
    }
  }

  const allowedHosts = getAllowedHosts(env)

  for (const host of allowedHosts) {
    if (!/^[a-z0-9.-]+$/i.test(host)) {
      violations.push(`APP_WEB_ALLOWED_HOSTS 包含非法 host：${host}`)
    }

    if (production && isForbiddenProductionHost(host)) {
      violations.push(`生产 WebView 白名单不得包含测试 host：${host}`)
    }
  }

  for (const name of URL_ENV_VARS) {
    const value = resolveUrlValue(env, name)
    let parsed

    try {
      parsed = new URL(value)
    } catch {
      violations.push(`${name} 必须是合法 URL，当前为：${value}`)
      continue
    }

    if (production && parsed.protocol !== 'https:') {
      violations.push(`${name} 生产环境必须使用 https。`)
    }

    if (production && isForbiddenProductionHost(parsed.hostname)) {
      violations.push(`${name} 生产环境不得指向测试 host：${parsed.hostname}`)
    }

    if (parsed.username || parsed.password) {
      violations.push(`${name} 不得在 URL 中配置固定用户名或密码。`)
    }

    if (name !== 'APP_API_BASE_URL' && !allowedHosts.includes(parsed.hostname)) {
      violations.push(`${name} 的 host 必须加入 APP_WEB_ALLOWED_HOSTS。`)
    }

    if (hasTokenLikeQueryParam(parsed)) {
      violations.push(`${name} 不应配置固定 token 参数。`)
    }
  }

  return violations
}

function assertRuntimeEnvironment(env = process.env) {
  const violations = validateRuntimeEnvironment(env)

  if (violations.length) {
    throw new Error(`Runtime config invalid:\n- ${violations.join('\n- ')}`)
  }
}

function createRuntimeBuildConfig(env = process.env) {
  assertRuntimeEnvironment(env)

  return {
    env: getAppEnv(env),
    apiBaseURL: resolveUrlValue(env, 'APP_API_BASE_URL'),
    webBaseURL: resolveUrlValue(env, 'APP_WEB_BASE_URL'),
    serviceWebURL: resolveUrlValue(env, 'APP_SERVICE_WEB_URL'),
    memberWebURL: resolveUrlValue(env, 'APP_MEMBER_WEB_URL'),
    webAllowedHosts: getAllowedHosts(env),
    systemCode:
      getEnvValue(env, 'APP_SYSTEM_CODE') || DEFAULT_RUNTIME_CONFIG.systemCode,
    appClientChannel:
      getEnvValue(env, 'APP_CLIENT_CHANNEL') ||
      DEFAULT_RUNTIME_CONFIG.appClientChannel,
    omsChannel:
      getEnvValue(env, 'APP_OMS_CHANNEL') || DEFAULT_RUNTIME_CONFIG.omsChannel,
    ecardPmcSystemCode:
      getEnvValue(env, 'APP_ECARD_PMC_SYSTEM_CODE') ||
      DEFAULT_RUNTIME_CONFIG.ecardPmcSystemCode,
    mobileLoginType:
      getEnvValue(env, 'APP_MOBILE_LOGIN_TYPE') ||
      DEFAULT_RUNTIME_CONFIG.mobileLoginType,
    supportSurveyConfigKey:
      getEnvValue(env, 'APP_SURVEY_CONFIG_KEY') ||
      DEFAULT_RUNTIME_CONFIG.supportSurveyConfigKey
  }
}

function createRuntimeDefineConstants(env = process.env) {
  return {
    __APP_RUNTIME_CONFIG__: JSON.stringify(createRuntimeBuildConfig(env))
  }
}

module.exports = {
  DEFAULT_RUNTIME_CONFIG,
  PRODUCTION_FORBIDDEN_HOST_MARKERS,
  SUPPORTED_APP_ENVS,
  createRuntimeBuildConfig,
  createRuntimeDefineConstants,
  validateRuntimeEnvironment
}
