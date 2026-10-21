interface RuntimeConfigGlobal {
  __APP_RUNTIME_CONFIG__?: Record<string, unknown>
}

// runtime.ts 在模块顶层展开这个全局，必须在任何用例 import 之前注入。
;(globalThis as unknown as RuntimeConfigGlobal).__APP_RUNTIME_CONFIG__ = {
  apiBaseURL: 'https://owstest.deppon.com',
  webBaseURL: 'https://owstest.deppon.com',
  systemCode: 'TEST_SYSTEM_CODE',
  mobileLoginType: '2',
  requestTimeout: 15000
}
