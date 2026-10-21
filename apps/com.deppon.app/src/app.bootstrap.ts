import { hydrateStorage } from './cache'
import { configureRequest, configureSessionCookieRuntime, hydrateSessionCookie, onRequestEvent } from './request'
import { authApi, clearAppSession, getCurrentEcoToken } from './services/auth'
import { APP_RUNTIME_CONFIG } from './shared/config/runtime'
import { createAppSessionCookieRuntime } from './shared/native/AppSessionCookie'
import { navigateToLogin } from './shared/navigation/authGuard'

let bootstrapPromise: Promise<void> | null = null

async function runBootstrap() {
  configureSessionCookieRuntime(createAppSessionCookieRuntime([APP_RUNTIME_CONFIG.apiBaseURL, APP_RUNTIME_CONFIG.webBaseURL]))
  await hydrateStorage()
  await hydrateSessionCookie(APP_RUNTIME_CONFIG.apiBaseURL)

  configureRequest({
    baseURL: APP_RUNTIME_CONFIG.apiBaseURL,
    timeout: APP_RUNTIME_CONFIG.requestTimeout
  })

  if (getCurrentEcoToken()) {
    try {
      const response = await authApi.checkEcoToken(true, false)

      if (response.authExpired) {
        await clearAppSession()
      }
    } catch {
      // 传输失败可恢复时保留缓存会话，避免误清登录态。
    }
  }

  onRequestEvent('authExpired', () => {
    clearAppSession()
    navigateToLogin({
      replace: true,
      message: '登录状态已过期，请重新登录'
    })
  })
}

export function bootstrapAppRuntime() {
  if (bootstrapPromise) {
    return bootstrapPromise
  }

  // 失败后释放缓存，启动重试才能真的重新执行一次。
  bootstrapPromise = runBootstrap().catch(error => {
    bootstrapPromise = null
    throw error
  })

  return bootstrapPromise
}
