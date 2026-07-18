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

export interface SessionCookieRuntime {
  clear: () => Promise<boolean>
  read: (url: string) => Promise<string>
  write: (cookie: string) => Promise<boolean>
}

let sessionCookieRuntime: SessionCookieRuntime | null = null

const SESSION_COOKIE_RECOVERY_ATTEMPTS = 5
const SESSION_COOKIE_RECOVERY_INTERVAL_MS = 40

function waitForSessionCookieRecovery() {
  return new Promise<void>(resolve => {
    setTimeout(resolve, SESSION_COOKIE_RECOVERY_INTERVAL_MS)
  })
}

async function readSessionCookieFromRuntime(url: string, attempts: number) {
  if (!sessionCookieRuntime) {
    return ''
  }

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const cookie = await sessionCookieRuntime.read(url).catch(() => '')

    if (createEcoSessionCookie(cookie)) {
      return cookie
    }

    if (attempt < attempts - 1) {
      await waitForSessionCookieRecovery()
    }
  }

  return ''
}

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

export function configureSessionCookieRuntime(
  runtime: SessionCookieRuntime | null
) {
  sessionCookieRuntime = runtime
}

export async function setSessionCookie(cookie: string) {
  const sessionCookie = createEcoSessionCookie(cookie)

  if (!sessionCookie) {
    return false
  }

  const saved = await setStorageValue(CACHE_KEYS.cookie, sessionCookie)

  if (!saved) {
    return false
  }

  if (sessionCookieRuntime) {
    await sessionCookieRuntime.write(sessionCookie).catch(() => false)
  }

  return true
}

export async function clearSessionCookie() {
  const [, storageCleared] = await Promise.all([
    sessionCookieRuntime?.clear().catch(() => false),
    removeStorageValue(CACHE_KEYS.cookie)
  ])

  return storageCleared
}

async function hydrateSessionCookieWithAttempts(url: string, attempts: number) {
  const cachedCookie = getSessionCookie()

  if (cachedCookie) {
    if (sessionCookieRuntime) {
      await sessionCookieRuntime.write(cachedCookie).catch(() => false)
    }

    return cachedCookie
  }

  const nativeCookie = await readSessionCookieFromRuntime(url, attempts)

  if (!nativeCookie || !(await setSessionCookie(nativeCookie))) {
    return ''
  }

  return getSessionCookie()
}

export function hydrateSessionCookie(url: string) {
  return hydrateSessionCookieWithAttempts(url, 1)
}

export function recoverSessionCookie(url: string) {
  return hydrateSessionCookieWithAttempts(
    url,
    SESSION_COOKIE_RECOVERY_ATTEMPTS
  )
}

export function getResponseSetCookie(
  response: Pick<HttpResponse, 'headers' | 'fallbackHeaders' | 'cookies'>
) {
  return (
    getSetCookieFromHeaders(response.headers) ||
    getSetCookieFromHeaders(response.fallbackHeaders) ||
    normalizeCookieList(response.cookies)
  )
}

export async function saveSessionCookieFromResponse(response: HttpResponse) {
  const cookie =
    getResponseSetCookie(response) ||
    (sessionCookieRuntime
      ? await sessionCookieRuntime.read(response.url).catch(() => '')
      : '')

  if (!cookie) {
    return ''
  }

  const sessionCookie = createEcoSessionCookie(cookie)

  if (!sessionCookie || !(await setSessionCookie(sessionCookie))) {
    return ''
  }

  return sessionCookie
}
