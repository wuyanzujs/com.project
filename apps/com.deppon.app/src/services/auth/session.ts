import { clearAccountScopedCache } from '@/cache/accountScope'
import { CACHE_KEYS } from '@/cache/keys'
import { getJsonStorageValue, removeStorageValue, setJsonStorageValue } from '@/cache/storage'
import { clearSessionCookie, getEcoToken, recoverSessionCookie } from '@/request/cookieJar'
import { APP_RUNTIME_CONFIG } from '@/shared/config/runtime'
import { appWebMessageBridge } from '@/shared/webview/appWebMessage'

import { createAppUserIdentity, shouldClearAccountScopedCache } from './sessionIdentity'

import type { AppUser } from './types'

/**
 *
 * @description 取当前 eco token
 */
export function getCurrentEcoToken() {
  return getEcoToken()
}

/**
 *
 * @description 恢复登录态 cookie 并返回 eco token
 */
export async function recoverCurrentEcoToken() {
  if (getCurrentEcoToken()) {
    return getCurrentEcoToken()
  }

  await recoverSessionCookie(APP_RUNTIME_CONFIG.apiBaseURL)

  return getCurrentEcoToken()
}

/**
 *
 * @param user 用户信息
 * @description 保存用户信息，账号变更时清理缓存
 */
export async function saveCurrentUser(user: AppUser) {
  const currentUser = getCurrentUser()
  const owner = getJsonStorageValue<AppUser>(CACHE_KEYS.accountCacheOwner)
  const needsCacheClear = shouldClearAccountScopedCache(currentUser, user, owner)

  if (needsCacheClear) {
    appWebMessageBridge.clear()
  }

  const cacheReady =
    !needsCacheClear ||
    (await clearAccountScopedCache({
      preserveLoginReturnDrafts: !currentUser && !owner
    }))

  if (!cacheReady) {
    return false
  }

  const ownerSaved = await setJsonStorageValue(CACHE_KEYS.accountCacheOwner, createAppUserIdentity(user))

  if (!ownerSaved) {
    return false
  }

  return setJsonStorageValue(CACHE_KEYS.userInfo, user)
}

/**
 *
 * @description 取本地缓存的用户信息
 */
export function getCurrentUser() {
  return getJsonStorageValue<AppUser>(CACHE_KEYS.userInfo)
}

/**
 *
 * @description 清除本地缓存的用户信息
 */
export function clearCurrentUser() {
  return removeStorageValue(CACHE_KEYS.userInfo)
}

/**
 *
 * @description 清理登录态与账号维度缓存
 */
export async function clearAppSession() {
  appWebMessageBridge.clear()

  const results = await Promise.all([
    clearSessionCookie(),
    clearCurrentUser(),
    removeStorageValue(CACHE_KEYS.userSession),
    removeStorageValue(CACHE_KEYS.accountCacheOwner),
    clearAccountScopedCache()
  ])

  return results.every(Boolean)
}
