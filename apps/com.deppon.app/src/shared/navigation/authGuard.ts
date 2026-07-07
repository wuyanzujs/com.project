import Taro from '@tarojs/taro'

import { APP_ROUTES } from './routes'
import { getCurrentEcoToken } from '../../services/auth'

const LOGIN_REDIRECT_LOCK_MS = 800

type RouteParams = Record<string, unknown>

interface PageLike {
  route?: string
  __route__?: string
  options?: RouteParams
  $router?: {
    path?: string
    params?: RouteParams
  }
}

export interface LoginRedirectOptions {
  redirectUrl?: string
  replace?: boolean
  message?: string | false
}

let lastLoginRedirectAt = 0

function isRecord(value: unknown): value is RouteParams {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function stringifyRouteValue(value: unknown): string {
  if (Array.isArray(value)) {
    return stringifyRouteValue(value[0])
  }

  if (value === null || value === undefined) {
    return ''
  }

  return String(value)
}

function createQuery(params: RouteParams) {
  return Object.entries(params)
    .map(([key, value]) => [key, stringifyRouteValue(value)] as const)
    .filter(([, value]) => !!value)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&')
}

function normalizeRoutePath(route?: string) {
  if (!route) {
    return ''
  }

  return route.startsWith('/') ? route : `/${route}`
}

function getRoutePathname(url: string) {
  return url.split('?')[0]
}

function isLoginRoute(url: string) {
  return getRoutePathname(url) === APP_ROUTES.login
}

function sanitizeRedirectUrl(url: string) {
  if (!url || !url.startsWith('/pages/') || isLoginRoute(url)) {
    return APP_ROUTES.mine
  }

  return url
}

function getCurrentPage(): PageLike | null {
  try {
    const pages = Taro.getCurrentPages() as PageLike[]

    return pages[pages.length - 1] ?? null
  } catch {
    return null
  }
}

function getCurrentPageParams(page: PageLike): RouteParams {
  if (isRecord(page.options)) {
    return page.options
  }

  if (isRecord(page.$router?.params)) {
    return page.$router.params
  }

  return {}
}

export function hasValidSession() {
  return !!getCurrentEcoToken()
}

export function getCurrentRouteUrl(fallback: string = APP_ROUTES.mine) {
  const page = getCurrentPage()
  const path = normalizeRoutePath(
    page?.route || page?.__route__ || page?.$router?.path
  )

  if (!page || !path) {
    return fallback
  }

  const query = createQuery(getCurrentPageParams(page))

  return query ? `${path}?${query}` : path
}

export function createLoginRedirectUrl(redirectUrl?: string) {
  const target = sanitizeRedirectUrl(redirectUrl || getCurrentRouteUrl())

  return `${APP_ROUTES.login}?redirectUrl=${encodeURIComponent(target)}`
}

export function navigateToLogin(options: LoginRedirectOptions = {}) {
  if (isLoginRoute(getCurrentRouteUrl(''))) {
    return false
  }

  const now = Date.now()

  if (now - lastLoginRedirectAt < LOGIN_REDIRECT_LOCK_MS) {
    return false
  }

  lastLoginRedirectAt = now

  if (options.message !== false) {
    Taro.showToast({
      title: options.message || '请先登录',
      icon: 'none'
    })
  }

  const url = createLoginRedirectUrl(options.redirectUrl)

  if (options.replace) {
    Taro.redirectTo({ url })
    return true
  }

  Taro.navigateTo({ url })
  return true
}

export function ensureAuthenticated(options: LoginRedirectOptions = {}) {
  if (hasValidSession()) {
    return true
  }

  navigateToLogin(options)
  return false
}
