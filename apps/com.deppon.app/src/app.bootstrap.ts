import { hydrateStorage } from './cache'
import { configureRequest, onRequestEvent } from './request'
import { authApi, clearAppSession, getCurrentEcoToken } from './services/auth'
import { APP_RUNTIME_CONFIG } from './shared/config/runtime'
import { navigateToLogin } from './shared/navigation/authGuard'

let bootstrapPromise: Promise<void> | null = null

export function bootstrapAppRuntime() {
  if (bootstrapPromise) {
    return bootstrapPromise
  }

  bootstrapPromise = (async () => {
    await hydrateStorage()

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
        // Keep the cached session for recoverable transport failures.
      }
    }

    onRequestEvent('authExpired', () => {
      void clearAppSession()
      navigateToLogin({
        replace: true,
        message: '登录状态已过期，请重新登录'
      })
    })
  })()

  return bootstrapPromise
}
