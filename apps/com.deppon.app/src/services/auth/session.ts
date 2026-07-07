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

export function saveCurrentUser(user: AppUser) {
  return setJsonStorageValue(CACHE_KEYS.userInfo, user)
}

export function getCurrentUser() {
  return getJsonStorageValue<AppUser>(CACHE_KEYS.userInfo)
}

export function clearCurrentUser() {
  return removeStorageValue(CACHE_KEYS.userInfo)
}

export function clearAppSession() {
  clearSessionCookie()
  clearCurrentUser()
}
