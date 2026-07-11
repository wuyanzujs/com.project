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
