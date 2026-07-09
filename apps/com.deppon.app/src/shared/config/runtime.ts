const DEFAULT_REQUEST_TIMEOUT = 15000
const DEFAULT_APP_ENV = 'test'
const DEFAULT_API_BASE_URL = 'https://owstest.deppon.com'
const DEFAULT_SERVICE_WEB_URL =
  'https://osstest.deppon.com.cn/dzfront/web/home?showChat=true&layout=true'
const DEFAULT_MEMBER_WEB_URL =
  'https://mastest.deppon.com.cn/cms-h5/h5.html#/welfare-center'
const DEFAULT_WEB_ALLOWED_HOSTS = [
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
]

function resolveAllowedHosts() {
  const hosts = process.env.APP_WEB_ALLOWED_HOSTS?.split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  return hosts?.length ? hosts : DEFAULT_WEB_ALLOWED_HOSTS
}

export const APP_RUNTIME_CONFIG = {
  appName: '德邦快递',
  env: process.env.APP_ENV || DEFAULT_APP_ENV,
  target: 'rn',
  apiBaseURL: process.env.APP_API_BASE_URL || DEFAULT_API_BASE_URL,
  webBaseURL:
    process.env.APP_WEB_BASE_URL ||
    process.env.APP_API_BASE_URL ||
    DEFAULT_API_BASE_URL,
  serviceWebURL: process.env.APP_SERVICE_WEB_URL || DEFAULT_SERVICE_WEB_URL,
  memberWebURL: process.env.APP_MEMBER_WEB_URL || DEFAULT_MEMBER_WEB_URL,
  webAllowedHosts: resolveAllowedHosts(),
  requestTimeout: DEFAULT_REQUEST_TIMEOUT,
  systemCode: process.env.APP_SYSTEM_CODE || 'APP',
  appClientChannel: process.env.APP_CLIENT_CHANNEL || 'APP',
  omsChannel: process.env.APP_OMS_CHANNEL || 'APP',
  ecardPmcSystemCode: process.env.APP_ECARD_PMC_SYSTEM_CODE || 'APP',
  mobileLoginType: process.env.APP_MOBILE_LOGIN_TYPE || 'MOBILE_VERIFICATION_CODE',
  supportSurveyConfigKey: process.env.APP_SURVEY_CONFIG_KEY || 'app_survey_config'
} as const

export function isAppRuntime() {
  return APP_RUNTIME_CONFIG.target === 'rn'
}
