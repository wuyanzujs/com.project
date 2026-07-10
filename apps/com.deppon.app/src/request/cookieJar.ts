import {
  createEcoSessionCookie,
  extractEcoToken,
  getSetCookieFromHeaders,
  normalizeCookieList
} from './cookie.rules'
import { CACHE_KEYS } from '../cache/keys'
import {
  getStorageValue,
  removeStorageValue,
  setStorageValue
} from '../cache/storage'

import type { HttpResponse } from './types'

export {
  extractEcoToken,
  getSetCookieFromHeaders,
  normalizeCookieList
} from './cookie.rules'

export function getSessionCookie() {
  return getStorageValue(CACHE_KEYS.cookie)
}

export function getEcoToken() {
  return extractEcoToken(getSessionCookie())
}

export async function setSessionCookie(cookie: string) {
  const sessionCookie = createEcoSessionCookie(cookie)

  if (!sessionCookie) {
    return false
  }

  return setStorageValue(CACHE_KEYS.cookie, sessionCookie)
}

export function clearSessionCookie() {
  return removeStorageValue(CACHE_KEYS.cookie)
}

export function saveSessionCookieFromResponse(response: HttpResponse) {
  const cookie =
    getSetCookieFromHeaders(response.headers) ||
    normalizeCookieList(response.cookies)

  if (!cookie) {
    return ''
  }

  void setSessionCookie(cookie)
  return createEcoSessionCookie(cookie)
}
