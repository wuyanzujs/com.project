const DEFAULT_REQUEST_TIMEOUT = 15000

export const APP_RUNTIME_CONFIG = {
  appName: '德邦快递',
  target: 'rn',
  requestTimeout: DEFAULT_REQUEST_TIMEOUT,
  ...__APP_RUNTIME_CONFIG__
} as const

export function isAppRuntime() {
  return APP_RUNTIME_CONFIG.target === 'rn'
}

/**
 *
 * @description OWS 站点源(生产 www.deppon.com / 测试 owstest.deppon.com,仅域名不同),供 H5 页链接拼接
 */
export function getOwsOrigin() {
  return APP_RUNTIME_CONFIG.apiBaseURL.replace(/\/+$/, '')
}
