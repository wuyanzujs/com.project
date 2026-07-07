import { CACHE_KEYS } from '../cache/keys'
import {
  getStorageValue,
  removeStorageValue,
  setStorageValue
} from '../cache/storage'

import type { HttpResponse } from './types'

const ECO_TOKEN_NAME = 'ECO_TOKEN'

function normalizeHeaderValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.join(';')
  }

  return typeof value === 'string' ? value : ''
}

function getSetCookieFromHeaders(headers: Record<string, unknown>) {
  const headerKey = Object.keys(headers).find(
    (key) => key.toLowerCase() === 'set-cookie'
  )

  if (!headerKey) {
    return ''
  }

  return normalizeHeaderValue(headers[headerKey])
}

function normalizeCookieList(cookies?: string[]) {
  if (!cookies?.length) {
    return ''
  }

  return cookies.join(';')
}

export function extractEcoToken(cookie: string) {
  const match = cookie.match(/(?:^|;\s*)ECO_TOKEN=([^;]+)/)

  return match?.[1] ?? ''
}

export function getSessionCookie() {
  return getStorageValue(CACHE_KEYS.cookie)
}

export function getEcoToken() {
  return extractEcoToken(getSessionCookie())
}

export function setSessionCookie(cookie: string) {
  const ecoToken = extractEcoToken(cookie)

  if (!ecoToken) {
    return false
  }

  return setStorageValue(CACHE_KEYS.cookie, `${ECO_TOKEN_NAME}=${ecoToken};`)
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

  setSessionCookie(cookie)
  return getSessionCookie()
}
