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
import { clearSessionCookie, getEcoToken } from '../../request/cookieJar'

import type { AppUser } from './types'

export function getCurrentEcoToken() {
  return getEcoToken()
}

export async function saveCurrentUser(user: AppUser) {
  const owner = getJsonStorageValue<AppUser>(CACHE_KEYS.accountCacheOwner)
  const needsCacheClear = shouldClearAccountScopedCache(
    getCurrentUser(),
    user,
    owner
  )
  const cacheReady = !needsCacheClear || (await clearAccountScopedCache())

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
  await Promise.all([
    clearSessionCookie(),
    clearCurrentUser(),
    removeStorageValue(CACHE_KEYS.userSession),
    removeStorageValue(CACHE_KEYS.accountCacheOwner),
    clearAccountScopedCache()
  ])
}
