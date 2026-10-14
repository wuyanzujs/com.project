import { createEcoSessionCookie, extractEcoToken, getSetCookieFromHeaders, normalizeCookieList } from './cookie.rules'
import { CACHE_KEYS } from '../cache/keys'
import { getStorageValue, removeStorageValue, setStorageValue } from '../cache/storage'

import type { HttpResponse } from './types'

export interface SessionCookieRuntime {
  clear: () => Promise<boolean>
  read: (url: string) => Promise<string>
  write: (cookie: string) => Promise<boolean>
}

let sessionCookieRuntime: SessionCookieRuntime | null = null
let sessionInvalidated = false
let sessionRevision = 0
let pendingSessionCookie: string | null = null
let sessionMutationQueue: Promise<void> = Promise.resolve()

function enqueueSessionMutation(operation: () => Promise<boolean>) {
  const current = sessionMutationQueue.then(operation, operation)
  sessionMutationQueue = current.then(
    () => undefined,
    () => undefined
  )

  return current
}

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

export { extractEcoToken, getSetCookieFromHeaders, normalizeCookieList } from './cookie.rules'

export function getSessionCookie() {
  if (isSessionInvalidated()) {
    return ''
  }

  return getStorageValue(CACHE_KEYS.cookie)
}

function isSessionInvalidated() {
  return sessionInvalidated || getStorageValue(CACHE_KEYS.sessionInvalidated) === '1'
}

export function getEcoToken() {
  return extractEcoToken(getSessionCookie())
}

export function configureSessionCookieRuntime(runtime: SessionCookieRuntime | null) {
  sessionCookieRuntime = runtime
}

export function setSessionCookie(cookie: string) {
  const sessionCookie = createEcoSessionCookie(cookie)

  if (!sessionCookie) {
    return Promise.resolve(false)
  }

  const previousCookie = pendingSessionCookie ?? getSessionCookie()

  if (sessionCookie !== previousCookie || (pendingSessionCookie === null && isSessionInvalidated())) {
    sessionRevision += 1
  }

  pendingSessionCookie = sessionCookie
  const revision = sessionRevision

  const mutation = enqueueSessionMutation(async () => {
    if (revision !== sessionRevision) {
      return false
    }

    const saved = await setStorageValue(CACHE_KEYS.cookie, sessionCookie)

    if (!saved || revision !== sessionRevision) {
      return false
    }

    if (!(await removeStorageValue(CACHE_KEYS.sessionInvalidated))) {
      sessionInvalidated = true
      return false
    }

    if (revision !== sessionRevision) {
      return false
    }

    sessionInvalidated = false

    if (sessionCookieRuntime) {
      await sessionCookieRuntime.write(sessionCookie).catch(() => false)
    }

    return revision === sessionRevision
  })

  return mutation.finally(() => {
    if (revision === sessionRevision) {
      pendingSessionCookie = null
    }
  })
}

export function clearSessionCookie() {
  // 立即阻断恢复；持久化标记即使删除失败也会留存。
  sessionInvalidated = true
  pendingSessionCookie = null
  const revision = ++sessionRevision

  return enqueueSessionMutation(async () => {
    await setStorageValue(CACHE_KEYS.sessionInvalidated, '1')

    const [nativeCleared, storageCleared] = await Promise.all([
      sessionCookieRuntime?.clear().catch(() => false) ?? Promise.resolve(true),
      removeStorageValue(CACHE_KEYS.cookie)
    ])

    if (!nativeCleared || !storageCleared) {
      return false
    }

    const markerCleared = await removeStorageValue(CACHE_KEYS.sessionInvalidated)

    if (markerCleared && revision === sessionRevision) {
      sessionInvalidated = false
    }

    return markerCleared
  })
}

async function hydrateSessionCookieWithAttempts(url: string, attempts: number) {
  if (isSessionInvalidated()) {
    return ''
  }

  const revision = sessionRevision
  const cachedCookie = getSessionCookie()

  if (cachedCookie) {
    if (sessionCookieRuntime) {
      await sessionCookieRuntime.write(cachedCookie).catch(() => false)
    }

    return revision === sessionRevision ? getSessionCookie() : ''
  }

  const nativeCookie = await readSessionCookieFromRuntime(url, attempts)

  if (revision !== sessionRevision || isSessionInvalidated() || !nativeCookie || !(await setSessionCookie(nativeCookie))) {
    return ''
  }

  return getSessionCookie()
}

export function hydrateSessionCookie(url: string) {
  return hydrateSessionCookieWithAttempts(url, 1)
}

export function recoverSessionCookie(url: string) {
  return hydrateSessionCookieWithAttempts(url, SESSION_COOKIE_RECOVERY_ATTEMPTS)
}

export function getResponseSetCookie(response: Pick<HttpResponse, 'headers' | 'fallbackHeaders' | 'cookies'>) {
  return getSetCookieFromHeaders(response.headers) || getSetCookieFromHeaders(response.fallbackHeaders) || normalizeCookieList(response.cookies)
}

export async function saveSessionCookieFromResponse(response: HttpResponse, options: { allowInvalidatedSession?: boolean } = {}) {
  const revision = sessionRevision

  if (isSessionInvalidated() && !options.allowInvalidatedSession) {
    return ''
  }

  const cookie = getResponseSetCookie(response) || (sessionCookieRuntime ? await sessionCookieRuntime.read(response.url).catch(() => '') : '')

  if (!cookie || revision !== sessionRevision || (isSessionInvalidated() && !options.allowInvalidatedSession)) {
    return ''
  }

  const sessionCookie = createEcoSessionCookie(cookie)

  if (!sessionCookie || !(await setSessionCookie(sessionCookie))) {
    return ''
  }

  return sessionCookie
}
