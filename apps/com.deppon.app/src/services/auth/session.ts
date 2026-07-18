import {
  createAppUserIdentity,
  shouldClearAccountScopedCache
} from './sessionIdentity'
import { clearAccountScopedCache } from '../../cache/accountScope'
import { CACHE_KEYS } from '../../cache/keys'
import {
  getJsonStorageValue,
  removeStorageValue,
  setJsonStorageValue
} from '../../cache/storage'
import {
  clearSessionCookie,
  getEcoToken,
  recoverSessionCookie
} from '../../request/cookieJar'
import { APP_RUNTIME_CONFIG } from '../../shared/config/runtime'
import { appWebMessageBridge } from '../../shared/webview/appWebMessage'

import type { AppUser } from './types'

export function getCurrentEcoToken() {
  return getEcoToken()
}

export async function recoverCurrentEcoToken() {
  if (getCurrentEcoToken()) {
    return getCurrentEcoToken()
  }

  await recoverSessionCookie(APP_RUNTIME_CONFIG.apiBaseURL)

  return getCurrentEcoToken()
}

export async function saveCurrentUser(user: AppUser) {
  const currentUser = getCurrentUser()
  const owner = getJsonStorageValue<AppUser>(CACHE_KEYS.accountCacheOwner)
  const needsCacheClear = shouldClearAccountScopedCache(
    currentUser,
    user,
    owner
  )

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

  const ownerSaved = await setJsonStorageValue(
    CACHE_KEYS.accountCacheOwner,
    createAppUserIdentity(user)
  )

  if (!ownerSaved) {
    return false
  }

  return setJsonStorageValue(CACHE_KEYS.userInfo, user)
}

export function getCurrentUser() {
  return getJsonStorageValue<AppUser>(CACHE_KEYS.userInfo)
}

export function clearCurrentUser() {
  return removeStorageValue(CACHE_KEYS.userInfo)
}

export async function clearAppSession() {
  appWebMessageBridge.clear()

  await Promise.all([
    clearSessionCookie(),
    clearCurrentUser(),
    removeStorageValue(CACHE_KEYS.userSession),
    removeStorageValue(CACHE_KEYS.accountCacheOwner),
    clearAccountScopedCache()
  ])
}
